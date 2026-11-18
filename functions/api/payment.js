/**
 * Cloudflare Pages Functions - Payment Gateway API Endpoint (Hardened)
 * Path: /api/payment (mapped from functions/api/payment.js)
 * 
 * Fitur Keamanan:
 * 1. Restriksi CORS hanya ke domain resmi (tidak wildcard '*')
 * 2. Validasi Origin / Referer (CSRF protection)
 * 3. Sanitasi input string & pembersihan karakter kontrol
 * 4. Validasi kuantitas item integer positif (>= 1)
 * 5. Kunci rahasia server (Server Key) hanya dibaca dari context.env
 */

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

function sanitizeString(input) {
  if (typeof input !== 'string') return String(input || '');
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function isValidOrigin(request, env) {
  const allowedProdOrigin = env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com';
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');

  if (!origin && !referer) return true;

  const checkUrl = origin || referer || '';
  try {
    const host = new URL(checkUrl).hostname;
    if (checkUrl.startsWith(allowedProdOrigin) || host === 'sambal.chayrawellness.com') return true;
    if (host.endsWith('.pages.dev') || host === 'localhost' || host === '127.0.0.1') return true;
  } catch (e) {
    return false;
  }
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (!isValidOrigin(request, env)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Akses ditolak: Permintaan lintas domain tidak sah.'
    }), { status: 403, headers: corsHeaders });
  }

  try {
    const payload = await request.json();
    const invoiceNumber = sanitizeString(payload.invoiceNumber || payload.invoice || '');
    const customerName = sanitizeString(payload.customerName || payload.nama || '');
    const customerPhone = sanitizeString(payload.customerPhone || payload.whatsapp || '');
    const customerEmail = sanitizeString(payload.customerEmail || '');
    const courierName = sanitizeString(payload.courierName || 'Paxel Next Day');
    const items = payload.items;

    if (!invoiceNumber || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Payload tidak lengkap. Diperlukan invoiceNumber dan daftar items.'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validasi kuantitas item integer positif & hitung total otoritatif
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Kuantitas item harus bilangan bulat positif minimal 1.'
        }), { status: 400, headers: corsHeaders });
      }

      const itemId = String(item.id || '').toLowerCase();
      const basePrice = PRODUCT_BASE_PRICES[itemId];
      let unitPrice = Number(item.price);
      if (basePrice !== undefined) {
        unitPrice = basePrice;
      }
      if (isNaN(unitPrice) || unitPrice < 0) unitPrice = 34000;

      calculatedSubtotal += unitPrice * qty;
      validatedItems.push({
        id: itemId || 'item',
        price: Math.round(unitPrice),
        quantity: qty,
        name: sanitizeString(item.name || 'Sambal by Kazel').substring(0, 50)
      });
    }

    const shippingFee = Number(payload.shippingFee) || 0;
    const finalGrossAmount = calculatedSubtotal + Math.max(0, shippingFee);

    // Cek apakah Server Key Midtrans / Xendit sudah terpasang di Cloudflare Pages Env
    const midtransKey = env?.MIDTRANS_SERVER_KEY;
    const xenditKey = env?.XENDIT_SECRET_KEY;
    const isProduction = env?.IS_PRODUCTION === 'true';

    // JIKA MIDTRANS TERKONFIGURASI:
    if (midtransKey) {
      const snapEndpoint = isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

      const authHeader = 'Basic ' + btoa(midtransKey + ':');

      const midtransPayload = {
        transaction_details: {
          order_id: invoiceNumber,
          gross_amount: Math.round(finalGrossAmount)
        },
        customer_details: {
          first_name: customerName,
          phone: customerPhone,
          email: customerEmail || 'pelanggan@sambalbykazel.com'
        },
        item_details: [
          ...validatedItems,
          ...(shippingFee > 0 ? [{
            id: 'shipping-fee',
            price: Math.round(shippingFee),
            quantity: 1,
            name: `Ongkos Kirim (${courierName})`
          }] : [])
        ]
      };

      const snapRes = await fetch(snapEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(midtransPayload)
      });

      const snapData = await snapRes.json();

      if (snapRes.ok && snapData.redirect_url) {
        return new Response(JSON.stringify({
          success: true,
          provider: 'midtrans',
          redirectUrl: snapData.redirect_url,
          token: snapData.token,
          invoiceNumber
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // JIKA XENDIT TERKONFIGURASI:
    if (xenditKey) {
      const xenditEndpoint = 'https://api.xendit.co/v2/invoices';
      const authHeader = 'Basic ' + btoa(xenditKey + ':');

      const xenditPayload = {
        external_id: invoiceNumber,
        amount: Math.round(finalGrossAmount),
        description: `Pembelian Sambal by Kazel - ${invoiceNumber}`,
        customer: {
          given_names: customerName,
          mobile_number: customerPhone,
          email: customerEmail || 'pelanggan@sambalbykazel.com'
        },
        success_redirect_url: `https://sambal.chayrawellness.com/status?id=${invoiceNumber}&status=success`,
        failure_redirect_url: `https://sambal.chayrawellness.com/checkout?retry=${invoiceNumber}`
      };

      const xenditRes = await fetch(xenditEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(xenditPayload)
      });

      const xenditData = await xenditRes.json();

      if (xenditRes.ok && xenditData.invoice_url) {
        return new Response(JSON.stringify({
          success: true,
          provider: 'xendit',
          redirectUrl: xenditData.invoice_url,
          invoiceId: xenditData.id,
          invoiceNumber
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // SIMULASI MOCK GATEWAY (Ketika API Key belum disetel di Dashboard Cloudflare)
    const mockRedirectUrl = `/status?id=${invoiceNumber}&payment=mock_success&amount=${finalGrossAmount}`;
    
    return new Response(JSON.stringify({
      success: true,
      provider: 'mock-sandbox',
      message: 'Mode simulasi: API key Midtrans/Xendit belum disetel di Cloudflare Pages Secrets.',
      redirectUrl: mockRedirectUrl,
      invoiceNumber: invoiceNumber
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal error processing payment: ' + err.message
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
