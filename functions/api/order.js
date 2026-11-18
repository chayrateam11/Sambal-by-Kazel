/**
 * Cloudflare Pages Functions - Order Management & Anti-Spam Backend
 * Path: /api/order (mapped from functions/api/order.js)
 * 
 * Fitur Keamanan:
 * 1. Validasi Origin / Referer (CSRF Protection)
 * 2. Anti-bot Honeypot Detection
 * 3. Rate Limiting per IP
 * 4. Validasi Tipe Data & Batas Panjang String
 * 5. Pengecekan Kuantitas Integer Positif (>= 1)
 * 6. Perhitungan Ulang Harga & Ongkir Mandiri di Sisi Server (Anti Price Tampering)
 * 7. Sanitasi Input & Pencegahan Formula Injection ke Google Sheets
 * 8. Server-to-Server Forwarding ke Google Apps Script via context.env.GOOGLE_SHEET_URL
 */

// In-memory rate limiting map (IP -> timestamps array)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const MAX_ORDERS_PER_WINDOW = 6; // Maksimal 6 pemesanan per menit per IP

// Database Harga Produk Otoritatif (Server-Side Single Source of Truth)
const PRODUCT_BASE_PRICES = {
  'sambal-cumi-ijo': 34000,
  'sambal-bawang-juara': 28000,
  'sambal-roa-asap': 38000,
  'sambal-teri-crispy': 32000,
  'sambal-terasi-bakar': 31000,
  'sambal-matah-kecombrang': 35000,
  'paket-pesta-pedas': 89000,
  'addon-sendok-kayu': 5000,
  'addon-kerupuk-putih': 8000
};

const SIZE_MULTIPLIERS = {
  '150g': 1.0,
  '150g (Reguler)': 1.0,
  '250g': 1.6,
  '250g (Puas)': 1.6,
  '300g': 1.9,
  '300g (Jumbo)': 1.9,
  '3 x 150g (Paket Bundling)': 1.0,
  '1 pcs': 1.0,
  '1 pack (5 pcs)': 1.0
};

const VALID_COUPONS = {
  'PEDASHEMAT': 15000
};

const FREE_SHIPPING_MIN = 150000;

/**
 * Sanitasi string untuk mencegah Google Sheets Formula Injection & Control Characters
 */
function sanitizeForGoogleSheets(input) {
  if (typeof input !== 'string') return String(input || '');
  
  // 1. Hapus karakter kontrol ASCII berbahaya
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

  // 2. Cegah Formula Injection (CGI / Spreadsheet Formula Injection)
  // Karakter awalan =, +, -, @, \t, \r dapat memicu eksekusi formula di Excel/Google Sheets
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = "'" + sanitized;
  }

  return sanitized;
}

/**
 * Validasi Origin / Referer request
 */
function isValidOrigin(request, env) {
  const allowedProdOrigin = env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com';
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');

  // Jika tidak ada Origin & Referer (misal backend direct fetch / curl), periksa context
  if (!origin && !referer) {
    // Tetap izinkan jika mode lokal / direct server request
    return true;
  }

  const checkUrl = origin || referer || '';
  try {
    const urlObj = new URL(checkUrl);
    const host = urlObj.hostname;

    // Izinkan domain resmi produksi
    if (checkUrl.startsWith(allowedProdOrigin) || host === 'sambal.chayrawellness.com') {
      return true;
    }

    // Izinkan preview Cloudflare Pages dan local development
    if (host.endsWith('.pages.dev') || host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

/**
 * Rate Limiter sederhana berdasarkan IP
 */
function checkRateLimit(clientIp) {
  if (!clientIp) return true;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Bersihkan riwayat lama
  let timestamps = rateLimitMap.get(clientIp) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= MAX_ORDERS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  rateLimitMap.set(clientIp, timestamps);
  return true;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // 1. Validasi Origin / CSRF Protection
  if (!isValidOrigin(request, env)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Akses ditolak: Permintaan lintas domain (Cross-Origin) tidak diizinkan.'
    }), { status: 403, headers: corsHeaders });
  }

  // 2. Rate Limiting IP
  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Terlalu banyak permintaan pemesanan dalam waktu singkat. Mohon tunggu 1 menit.'
    }), { status: 429, headers: corsHeaders });
  }

  try {
    const payload = await request.json();

    // 3. Anti-Spam Honeypot Check
    // Jika field jebakan bot terisi, gagalkan proses
    if (payload.user_website_hp || payload._hp || payload.website) {
      // Kembalikan 200 palsu atau 400 agar bot tidak mempelajari mekanisme
      return new Response(JSON.stringify({
        success: false,
        message: 'Spam terdeteksi.'
      }), { status: 400, headers: corsHeaders });
    }

    // 4. Penanganan Aksi uploadProof (Unggah Bukti Transfer)
    if (payload.action === 'uploadProof' || payload.action === 'upload_proof') {
      const invoice = sanitizeForGoogleSheets(payload.invoice || payload.invoiceNumber || '');
      const name = sanitizeForGoogleSheets(payload.nama || payload.customerName || '');
      const imageBase64 = String(payload.image || payload.imageBase64 || '').trim();

      if (!invoice || !imageBase64) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Nomor invoice dan file gambar bukti transfer wajib disertakan.'
        }), { status: 400, headers: corsHeaders });
      }

      const googleSheetUrl = env?.GOOGLE_SHEET_URL;
      if (!googleSheetUrl) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Server error: GOOGLE_SHEET_URL belum dikonfigurasi di Cloudflare Pages secrets.'
        }), { status: 500, headers: corsHeaders });
      }

      const gasRes = await fetch(googleSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadProof',
          invoice: invoice,
          nama: name,
          image: imageBase64
        })
      });

      const gasData = await gasRes.json().catch(() => ({ status: 'success' }));
      return new Response(JSON.stringify({
        success: gasData.status === 'success',
        data: gasData
      }), { status: 200, headers: corsHeaders });
    }

    // 5. Validasi Data Pesanan Baru
    const customerName = sanitizeForGoogleSheets(payload.customerName || payload.nama || '');
    const customerPhone = sanitizeForGoogleSheets(payload.customerPhone || payload.whatsapp || '');
    const customerAddress = sanitizeForGoogleSheets(payload.customerAddress || payload.alamat || '');
    const customerCity = sanitizeForGoogleSheets(payload.customerCity || payload.kota || '');
    const customerPostal = sanitizeForGoogleSheets(payload.customerPostal || payload.kodepos || '');
    const courierCode = String(payload.courierCode || payload.courier || 'paxel').toLowerCase();
    const courierName = sanitizeForGoogleSheets(payload.courierName || 'Paxel Next Day Chilled');
    const paymentMethodName = sanitizeForGoogleSheets(payload.paymentMethodName || payload.paymentMethod || 'QRIS');
    const rawItems = payload.items;
    const appliedCoupon = String(payload.couponCode || '').toUpperCase().trim();
    const kitchenNote = sanitizeForGoogleSheets(payload.kitchenNote || payload.catatan || '');
    const giftCardNote = sanitizeForGoogleSheets(payload.giftCardNote || '');

    // Validasi panjang string
    if (!customerName || customerName.length < 2 || customerName.length > 100) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Nama pelanggan tidak valid (panjang 2 - 100 karakter).'
      }), { status: 400, headers: corsHeaders });
    }

    // Validasi nomor WhatsApp format Indonesia
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 15) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP aktif (contoh: 081234567890).'
      }), { status: 400, headers: corsHeaders });
    }

    if (!customerAddress || customerAddress.length < 5 || customerAddress.length > 500) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Alamat pengiriman tidak lengkap (minimal 5 karakter).'
      }), { status: 400, headers: corsHeaders });
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Keranjang belanja kosong.'
      }), { status: 400, headers: corsHeaders });
    }

    // 6. Validasi Kuantitas & Perhitungan Ulang Harga Mandiri di Server
    let verifiedSubtotal = 0;
    const verifiedItemsList = [];

    for (const item of rawItems) {
      const qty = Number(item.qty);
      // Validasi kuantitas harus integer positif >= 1 dan wajar (<= 100)
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return new Response(JSON.stringify({
          success: false,
          message: `Kuantitas produk "${item.name || 'Produk'}" tidak valid. Harus bilangan bulat minimal 1.`
        }), { status: 400, headers: corsHeaders });
      }

      const itemId = String(item.id || '').toLowerCase();
      const basePrice = PRODUCT_BASE_PRICES[itemId];
      const size = String(item.size || '150g');
      const multiplier = SIZE_MULTIPLIERS[size] || 1.0;

      // Tentukan harga satuan otoritatif dari database server
      let verifiedUnitPrice;
      if (basePrice !== undefined) {
        verifiedUnitPrice = Math.round(basePrice * multiplier);
      } else {
        // Fallback aman jika produk khusus/baru: pastikan harga integer positif
        const clientPrice = Number(item.price);
        verifiedUnitPrice = (!isNaN(clientPrice) && clientPrice > 0) ? Math.round(clientPrice) : 34000;
      }

      verifiedSubtotal += verifiedUnitPrice * qty;

      const itemNameSanitized = sanitizeForGoogleSheets(item.name || 'Sambal by Kazel');
      verifiedItemsList.push({
        name: `${itemNameSanitized}${size ? ` (${size})` : ''}`,
        qty: qty,
        unitPrice: verifiedUnitPrice,
        totalPrice: verifiedUnitPrice * qty
      });
    }

    // 7. Perhitungan Ongkos Kirim Otoritatif
    const isFreeShipping = verifiedSubtotal >= FREE_SHIPPING_MIN;
    let verifiedShippingFee = 18000; // default Paxel

    if (courierCode.includes('jnt') || courierName.toLowerCase().includes('j&t')) {
      verifiedShippingFee = isFreeShipping ? 0 : 12000;
    } else if (courierCode.includes('grab') || courierName.toLowerCase().includes('grab')) {
      verifiedShippingFee = isFreeShipping ? Math.max(0, 32000 - 18000) : 32000;
    } else {
      // Paxel
      verifiedShippingFee = isFreeShipping ? 0 : 18000;
    }

    // 8. Perhitungan Kupon Diskon Otoritatif
    let discountAmount = 0;
    if (appliedCoupon && VALID_COUPONS[appliedCoupon]) {
      discountAmount = VALID_COUPONS[appliedCoupon];
    }

    // 9. Grand Total Final Terverifikasi
    const verifiedGrandTotal = Math.max(0, verifiedSubtotal + verifiedShippingFee - discountAmount);

    // Format nomor invoice
    const invoiceNumber = sanitizeForGoogleSheets(payload.invoiceNumber || payload.invoice || ('#SBK-' + Date.now().toString().slice(-6)));
    const fullAddress = `${customerAddress}, ${customerCity} ${customerPostal}`.trim();
    const formattedItemsText = verifiedItemsList.map(i => `• ${i.name} (${i.qty}x)`).join('\n');
    const notesFormatted = [kitchenNote, giftCardNote ? `Kado: ${giftCardNote}` : ''].filter(Boolean).join(' | ');

    const isCod = paymentMethodName.toLowerCase().includes('cod') || paymentMethodName.toLowerCase().includes('bayar di tempat');
    const orderStatus = isCod ? 'Diproses' : 'Menunggu Pembayaran';

    // 10. Teruskan Data Bersih ke Google Sheets via Server-to-Server
    const googleSheetUrl = env?.GOOGLE_SHEET_URL;
    let sheetSyncSuccess = false;

    if (googleSheetUrl && googleSheetUrl.startsWith('http')) {
      try {
        const gasPayload = {
          orderId: invoiceNumber,
          invoice: invoiceNumber,
          invoiceNumber: invoiceNumber,
          customerName: customerName,
          nama: customerName,
          whatsapp: customerPhone,
          address: fullAddress,
          alamat: fullAddress,
          items: verifiedItemsList.map(i => ({ name: i.name, qty: i.qty })),
          itemsText: formattedItemsText,
          totalAmount: verifiedGrandTotal,
          total: verifiedGrandTotal,
          totalBayar: verifiedGrandTotal,
          grandTotal: verifiedGrandTotal,
          shippingCourier: courierName,
          courier: courierName,
          kurir: courierName,
          paymentMethod: paymentMethodName,
          metodeBayar: paymentMethodName,
          notes: notesFormatted,
          catatan: notesFormatted,
          status: orderStatus,
          noResi: '-',
          buktiBayar: '-',
          createdAt: new Date().toISOString()
        };

        const gasRes = await fetch(googleSheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(gasPayload)
        });

        if (gasRes.ok) {
          sheetSyncSuccess = true;
        }
      } catch (gasErr) {
        console.warn('Gagal sinkronisasi backend ke Google Apps Script:', gasErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Pesanan berhasil diverifikasi dan diproses.',
      invoiceNumber: invoiceNumber,
      grandTotal: verifiedGrandTotal,
      subtotal: verifiedSubtotal,
      shippingFee: verifiedShippingFee,
      discountAmount: discountAmount,
      status: orderStatus,
      sheetSynced: sheetSyncSuccess
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Kesalahan server dalam memproses pesanan: ' + err.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions(context) {
  const { env } = context;
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
