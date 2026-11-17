/**
 * Cloudflare Pages Functions - Payment Gateway API Endpoint
 * Path: /api/payment (mapped from functions/api/payment.js)
 * 
 * Template disiapkan untuk integrasi payment gateway (Midtrans Snap / Xendit Invoice).
 * Parameter konfigurasi dapat disetel via Environment Variables di Cloudflare Pages Dashboard:
 * - MIDTRANS_SERVER_KEY / XENDIT_SECRET_KEY
 * - IS_PRODUCTION (true / false)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Header CORS untuk komunikasi client-side
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const payload = await request.json();
    const {
      invoiceNumber,
      customerName,
      customerPhone,
      customerEmail,
      grandTotal,
      items,
      courierName,
      shippingFee
    } = payload;

    // Validasi payload minimum
    if (!invoiceNumber || !grandTotal || !items || !Array.isArray(items)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Payload tidak lengkap. Diperlukan invoiceNumber, grandTotal, dan items.'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

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
          gross_amount: Math.round(grandTotal)
        },
        customer_details: {
          first_name: customerName,
          phone: customerPhone,
          email: customerEmail || 'pelanggan@sambalbykazel.com'
        },
        item_details: [
          ...items.map(item => ({
            id: item.id || item.cartItemId,
            price: Math.round(item.price),
            quantity: item.qty,
            name: (item.name || 'Sambal by Kazel').substring(0, 50)
          })),
          ...(shippingFee > 0 ? [{
            id: 'shipping-fee',
            price: Math.round(shippingFee),
            quantity: 1,
            name: `Ongkos Kirim (${courierName || 'Ekspedisi'})`
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
        amount: Math.round(grandTotal),
        description: `Pembelian Sambal by Kazel - ${invoiceNumber}`,
        customer: {
          given_names: customerName,
          mobile_number: customerPhone,
          email: customerEmail || 'pelanggan@sambalbykazel.com'
        },
        success_redirect_url: `https://sambalbykazel.pages.dev/status.html?id=${invoiceNumber}&status=success`,
        failure_redirect_url: `https://sambalbykazel.pages.dev/checkout.html?retry=${invoiceNumber}`
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
    // Berguna untuk pengujian alur front-end & demo payment gateway
    const mockRedirectUrl = `/status.html?id=${invoiceNumber}&payment=mock_success&amount=${grandTotal}`;
    
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

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
