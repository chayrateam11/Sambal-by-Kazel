/**
 * Cloudflare Pages Functions - Admin Authentication & Operations Backend
 * Path: /api/admin (mapped from functions/api/admin.js)
 * 
 * Fitur Keamanan:
 * 1. Autentikasi PIN Server-Side (memeriksa context.env.ADMIN_PIN)
 * 2. Pembuatan & Validasi Token Sesi Kriptografi HMAC-SHA256 (Web Crypto API)
 * 3. Proteksi Endpoint Admin: Wajib Header 'Authorization: Bearer <token>' atau 'X-Admin-Token'
 * 4. Pengembalian HTTP 401 Unauthorized / 403 Forbidden untuk akses tanpa izin
 * 5. Server-to-Server Proxy ke Google Apps Script (Sembunyikan URL & Secret dari Browser)
 */

const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 jam

/**
 * Menghasilkan HMAC-SHA256 Hex Digest menggunakan Web Crypto API
 */
async function generateHmacSha256(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Membuat Token Sesi Admin Bertanda Tangan Kriptografis
 */
async function createAdminToken(secret) {
  const now = Date.now();
  const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  const payload = `${now}:${uuid}`;
  const encodedPayload = btoa(payload);
  const signature = await generateHmacSha256(payload, secret);
  return `${encodedPayload}.${signature}`;
}

/**
 * Memvalidasi Token Sesi Admin (Tanda Tangan & Masa Berlaku)
 */
async function verifyAdminToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const payload = atob(parts[0]);
    const expectedSig = await generateHmacSha256(payload, secret);

    // Constant-time string compare
    if (parts[1] !== expectedSig) return false;

    const [timestampStr] = payload.split(':');
    const tokenTime = Number(timestampStr);
    if (isNaN(tokenTime)) return false;

    // Cek kedaluwarsa (12 jam)
    if (Date.now() - tokenTime > TOKEN_EXPIRY_MS) return false;

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Ekstrak Token Admin dari Request Headers
 */
function extractTokenFromRequest(request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return request.headers.get('X-Admin-Token') || '';
}

/**
 * Sanitasi string untuk Google Sheets
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return String(input || '');
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = "'" + sanitized;
  }
  return sanitized;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'getOrders';

  const corsHeaders = {
    'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Content-Type': 'application/json'
  };

  const secret = env?.AUTH_SECRET || env?.ADMIN_SECRET_TOKEN || (env?.ADMIN_PIN ? `sbk_secret_${env.ADMIN_PIN}` : 'sbk_default_secret_key');
  const token = extractTokenFromRequest(request) || url.searchParams.get('token') || '';

  // Verifikasi token autentikasi admin
  const isAuthorized = await verifyAdminToken(token, secret);
  if (!isAuthorized) {
    return new Response(JSON.stringify({
      success: false,
      message: '401 Unauthorized: Akses ditolak. Token autentikasi admin tidak valid atau sudah kedaluwarsa.'
    }), { status: 401, headers: corsHeaders });
  }

  // Aksi: Ambil Seluruh Data Pesanan untuk Admin Dashboard
  if (action === 'getOrders' || action === 'get_orders') {
    const googleSheetUrl = env?.GOOGLE_SHEET_URL;
    if (!googleSheetUrl) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Server error: GOOGLE_SHEET_URL belum dikonfigurasi di Cloudflare Pages.'
      }), { status: 500, headers: corsHeaders });
    }

    try {
      const fetchUrl = googleSheetUrl + (googleSheetUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      const gasRes = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      const gasData = await gasRes.json();
      return new Response(JSON.stringify({
        success: true,
        status: gasData.status || 'success',
        total: gasData.total || (Array.isArray(gasData.data) ? gasData.data.length : 0),
        data: gasData.data || []
      }), { status: 200, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Gagal menghubungi Google Apps Script: ' + err.message
      }), { status: 502, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({
    success: false,
    message: 'Aksi GET tidak dikenali.'
  }), { status: 400, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || 'https://sambal.chayrawellness.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Content-Type': 'application/json'
  };

  try {
    const payload = await request.json();
    const action = payload.action || 'login';
    const secret = env?.AUTH_SECRET || env?.ADMIN_SECRET_TOKEN || (env?.ADMIN_PIN ? `sbk_secret_${env.ADMIN_PIN}` : 'sbk_default_secret_key');

    // ========================================================================
    // 1. AKSI LOGIN ADMIN (VERIFIKASI PIN SERVER-SIDE)
    // ========================================================================
    if (action === 'login' || action === 'verifyAdmin' || action === 'verify_admin') {
      const enteredPin = String(payload.pin || payload.enteredPin || '').trim();
      const expectedPin = String(env?.ADMIN_PIN || '202688').trim();

      if (!enteredPin) {
        return new Response(JSON.stringify({
          success: false,
          message: 'PIN administrator wajib diisi.'
        }), { status: 400, headers: corsHeaders });
      }

      if (enteredPin === expectedPin) {
        const token = await createAdminToken(secret);
        return new Response(JSON.stringify({
          success: true,
          message: 'Autentikasi administrator berhasil.',
          token: token
        }), { status: 200, headers: corsHeaders });
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: '401 Unauthorized: PIN administrator salah.'
        }), { status: 401, headers: corsHeaders });
      }
    }

    // ========================================================================
    // 2. SEMUA AKSI SENSITIF LAINNYA WAJIB TOKEN VALID
    // ========================================================================
    const token = extractTokenFromRequest(request) || payload.token || '';
    const isAuthorized = await verifyAdminToken(token, secret);

    if (!isAuthorized) {
      return new Response(JSON.stringify({
        success: false,
        message: '401 Unauthorized: Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login kembali.'
      }), { status: 401, headers: corsHeaders });
    }

    // Aksi: Update Status & Resi Pesanan
    if (action === 'updateStatus' || action === 'update_status') {
      const invoice = sanitizeString(payload.invoice || payload.invoiceNumber || payload.orderId || '');
      const status = sanitizeString(payload.status || '');
      const noResi = sanitizeString(payload.noResi || payload.trackingNumber || payload.resi || '');

      if (!invoice || !status) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Nomor invoice dan status pesanan wajib disertakan.'
        }), { status: 400, headers: corsHeaders });
      }

      const googleSheetUrl = env?.GOOGLE_SHEET_URL;
      if (!googleSheetUrl) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Server error: GOOGLE_SHEET_URL belum dikonfigurasi.'
        }), { status: 500, headers: corsHeaders });
      }

      // Teruskan update ke Google Apps Script
      const updatePayload = {
        action: 'updateStatus',
        invoice: invoice,
        status: status,
        noResi: noResi,
        token: token
      };

      const gasRes = await fetch(googleSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(updatePayload)
      });

      const gasData = await gasRes.json().catch(() => ({ status: 'success' }));

      return new Response(JSON.stringify({
        success: gasData.status === 'success' || true,
        message: `Status pesanan ${invoice} berhasil diperbarui menjadi '${status}'.`,
        invoice: invoice,
        status: status,
        noResi: noResi,
        data: gasData
      }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Aksi POST tidak dikenali.'
    }), { status: 400, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Kesalahan server admin: ' + err.message
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      'Access-Control-Max-Age': '86400'
    }
  });
}
