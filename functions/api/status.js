/**
 * Cloudflare Pages Functions - Customer Order Tracking & Privacy Protection Backend
 * Path: /api/status (mapped from functions/api/status.js)
 * 
 * Fitur Keamanan:
 * 1. Pencegahan Kebocoran Data Privasi Pelanggan (Data Minimization)
 *    Hanya mengembalikan data pesanan milik invoice yang diminta (tidak membocorkan seluruh isi sheet).
 * 2. Rate Limiting per IP untuk mencegah scraping/brute-force invoice ID
 * 3. Sanitasi output
 */

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const MAX_STATUS_CHECKS_PER_WINDOW = 30; // Maksimal 30 check status per menit per IP

function checkStatusRateLimit(clientIp) {
  if (!clientIp) return true;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  let timestamps = rateLimitMap.get(clientIp) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= MAX_STATUS_CHECKS_PER_WINDOW) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(clientIp, timestamps);
  return true;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetInvoice = (url.searchParams.get('invoice') || url.searchParams.get('id') || '').trim().toUpperCase();

  const corsHeaders = {
    'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  if (!checkStatusRateLimit(clientIp)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Terlalu banyak permintaan pelacakan status. Mohon tunggu sejenak.'
    }), { status: 429, headers: corsHeaders });
  }

  if (!targetInvoice) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Parameter nomor invoice wajib disertakan (contoh: ?invoice=SBK-123456).'
    }), { status: 400, headers: corsHeaders });
  }

  const googleSheetUrl = env?.GOOGLE_SHEET_URL;
  if (!googleSheetUrl) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Server error: GOOGLE_SHEET_URL belum dikonfigurasi.'
    }), { status: 500, headers: corsHeaders });
  }

  try {
    const fetchUrl = googleSheetUrl + (googleSheetUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const gasRes = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });

    const gasData = await gasRes.json();
    if (!gasData || !Array.isArray(gasData.data)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Gagal mengambil data status dari database.'
      }), { status: 502, headers: corsHeaders });
    }

    const cleanTarget = targetInvoice.replace(/^#/, '');
    const matched = gasData.data.find(r => {
      const inv = (r.Invoice || r.invoice || r.orderId || r.invoiceNumber || '').toString().trim().toUpperCase().replace(/^#/, '');
      return inv === cleanTarget;
    });

    if (!matched) {
      return new Response(JSON.stringify({
        success: false,
        message: `Pesanan dengan invoice ${targetInvoice} tidak ditemukan.`
      }), { status: 404, headers: corsHeaders });
    }

    // Hanya kembalikan data yang relevan untuk pembeli (tanpa membocorkan nomor pelanggan lain)
    return new Response(JSON.stringify({
      success: true,
      order: {
        invoiceNumber: matched.Invoice || matched.invoice || targetInvoice,
        status: matched.Status || matched.status || 'Menunggu Pembayaran',
        trackingNumber: matched.NoResi || matched.noResi || matched.trackingNumber || '',
        updatedAt: matched.TerakhirDiperbarui || matched.updatedAt || '',
        paymentProofUrl: matched.BuktiBayar || matched.buktiBayar || ''
      }
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Kesalahan pelacakan status: ' + err.message
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost(context) {
  // Batch status check untuk halaman Riwayat Pesanan (history.js)
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const payload = await request.json();
    const invoiceList = Array.isArray(payload.invoices) ? payload.invoices : [];

    if (invoiceList.length === 0) {
      return new Response(JSON.stringify({ success: true, orders: [] }), { status: 200, headers: corsHeaders });
    }

    // Batasi maksimal 20 invoice dalam 1 request
    const cleanInvoices = invoiceList.slice(0, 20).map(i => String(i).trim().toUpperCase().replace(/^#/, ''));

    const googleSheetUrl = env?.GOOGLE_SHEET_URL;
    if (!googleSheetUrl) {
      return new Response(JSON.stringify({ success: false, message: 'GOOGLE_SHEET_URL belum disetel.' }), { status: 500, headers: corsHeaders });
    }

    const gasRes = await fetch(googleSheetUrl + (googleSheetUrl.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });

    const gasData = await gasRes.json();
    if (!gasData || !Array.isArray(gasData.data)) {
      return new Response(JSON.stringify({ success: true, orders: [] }), { status: 200, headers: corsHeaders });
    }

    const matchedOrders = [];
    for (const cleanInv of cleanInvoices) {
      const match = gasData.data.find(r => {
        const inv = (r.Invoice || r.invoice || r.orderId || '').toString().trim().toUpperCase().replace(/^#/, '');
        return inv === cleanInv;
      });
      if (match) {
        matchedOrders.push({
          invoiceNumber: match.Invoice || match.invoice || cleanInv,
          status: match.Status || match.status || 'Menunggu Pembayaran',
          trackingNumber: match.NoResi || match.noResi || '',
          updatedAt: match.TerakhirDiperbarui || match.updatedAt || ''
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      orders: matchedOrders
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Kesalahan server riwayat: ' + err.message
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions(context) {
  const { env } = context;
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
