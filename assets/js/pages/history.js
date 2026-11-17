/**
 * Sambal by Kazel - Order History Page Interactive Logic
 * Cloudflare Pages Static E-Commerce Edition
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    renderOrderHistory();
  });

  function renderStatusBadge(status) {
    const s = String(status || 'Diproses').toLowerCase();
    if (s.includes('bayar')) {
      return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
        <span class="material-symbols-outlined text-xs">payments</span> Menunggu Bayar
      </span>`;
    }
    if (s.includes('verifikasi')) {
      return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-orange-50 text-orange-800 rounded-full border border-orange-200">
        <span class="material-symbols-outlined text-xs">search</span> Verifikasi
      </span>`;
    }
    if (s.includes('proses') || s.includes('dapur')) {
      return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-200">
        <span class="material-symbols-outlined text-xs">skillet</span> Diproses
      </span>`;
    }
    if (s.includes('kirim')) {
      return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
        <span class="material-symbols-outlined text-xs">local_shipping</span> Dikirim Kurir
      </span>`;
    }
    if (s.includes('selesai')) {
      return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-green-50 text-green-800 rounded-full border border-green-200">
        <span class="material-symbols-outlined text-xs">check_circle</span> Selesai
      </span>`;
    }
    return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-full">
      ${typeof escapeHtml === 'function' ? escapeHtml(status || 'Diproses') : (status || 'Diproses')}
    </span>`;
  }

  function renderOrderHistory() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    const history = typeof getOrderHistory === 'function' ? getOrderHistory() : [];

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-3xl p-8 sm:p-12 text-center border border-outline-variant/60 shadow-sm max-w-lg mx-auto">
          <div class="w-16 h-16 sm:w-20 sm:h-20 bg-primary-fixed/50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <span class="material-symbols-outlined text-3xl sm:text-4xl">receipt_long</span>
          </div>
          <h2 class="text-lg sm:text-xl font-bold text-on-surface mb-2">Belum Ada Riwayat Pesanan</h2>
          <p class="text-xs sm:text-sm text-on-surface-variant mb-6 leading-relaxed">
            Anda belum pernah melakukan pemesanan di perangkat ini. Yuk, cobain aneka sambal lezat khas Sambal by Kazel sekarang!
          </p>
          <a href="/katalog" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-primary hover:bg-primary-container shadow-md shadow-primary/20 transition-all tap-target">
            <span class="material-symbols-outlined text-lg">restaurant_menu</span>
            <span>Jelajahi Katalog Sambal</span>
          </a>
        </div>
      `;
      return;
    }

    const cardsHtml = history.map(order => {
      const safeInvoice = String(order.invoiceNumber || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Baru saja';

      const itemsList = Array.isArray(order.items) ? order.items : [];
      const itemsHtml = itemsList.map(item => {
        const safeName = typeof escapeHtml === 'function' ? escapeHtml(item.name || 'Produk') : (item.name || 'Produk');
        const safeSize = typeof escapeHtml === 'function' ? escapeHtml(item.size || '150g') : (item.size || '150g');
        const safeImage = (typeof item.image === 'string' && item.image.startsWith('http')) ? encodeURI(item.image) : (typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : '');
        const itemPrice = Number(item.price) || 0;
        const itemQty = Number(item.qty) || 1;
        const spice = item.spiceLevel || 3;

        return `
          <div class="flex items-center gap-3 py-2 border-b border-outline-variant/30 last:border-b-0">
            <div class="w-12 h-12 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/40">
              <img src="${safeImage}" alt="${safeName}" class="w-full h-full object-cover" onerror="this.src=FALLBACK_IMG; this.removeAttribute('onerror');">
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-xs sm:text-sm font-bold text-on-surface truncate">${safeName}</h4>
              <p class="text-[11px] text-on-surface-variant">${safeSize} • Level ${spice}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-xs font-bold text-on-surface">${formatRupiah(itemPrice * itemQty)}</span>
              <span class="text-[11px] text-on-surface-variant block">x${itemQty}</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
          
          <!-- Order Card Header -->
          <div class="p-4 sm:p-5 bg-surface-container-low/50 border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-primary-fixed/60 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-xl">inventory_2</span>
              </div>
              <div>
                <span class="text-xs font-extrabold text-on-surface tracking-wide block">${typeof escapeHtml === 'function' ? escapeHtml(order.invoiceNumber) : order.invoiceNumber}</span>
                <span class="text-[11px] text-on-surface-variant">${orderDate}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${renderStatusBadge(order.status)}
              <span class="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 bg-surface-container rounded-full text-on-surface-variant">
                ${typeof escapeHtml === 'function' ? escapeHtml(order.courierName || 'Paxel') : (order.courierName || 'Paxel')}
              </span>
            </div>
          </div>

          <!-- Order Items List -->
          <div class="p-4 sm:p-5">
            <div class="divide-y divide-outline-variant/20 mb-4">
              ${itemsHtml}
            </div>

            <!-- Price Breakdown & Actions -->
            <div class="pt-4 border-t border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span class="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">Total Pesanan</span>
                <span class="text-base sm:text-lg font-black text-primary">${formatRupiah(order.grandTotal)}</span>
              </div>

              <div class="flex items-center gap-2.5">
                <!-- Tombol Lacak Pesanan -->
                <a href="/status?id=${encodeURIComponent(safeInvoice)}" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 transition-all tap-target">
                  <span class="material-symbols-outlined text-base">visibility</span>
                  <span>Detail / Lacak</span>
                </a>

                <!-- Tombol Pesan Lagi / Reorder 1-Klik -->
                <button type="button" onclick="reorder('${safeInvoice}')" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-container shadow-sm transition-all tap-target">
                  <span class="material-symbols-outlined text-base">repeat</span>
                  <span>Pesan Lagi</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;

    // Sync status terbaru dari Google Sheets secara background
    syncHistoryFromCloud();
  }

  async function syncHistoryFromCloud() {
    const sheetUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SHEET_URL : '';
    if (!sheetUrl || !sheetUrl.startsWith('http') || sheetUrl.includes('PASTE_URL')) return;

    try {
      const res = await fetch(sheetUrl + (sheetUrl.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        redirect: 'follow'
      });
      const json = await res.json();
      if (json && json.status === 'success' && Array.isArray(json.data)) {
        let history = typeof getOrderHistory === 'function' ? getOrderHistory() : [];
        let hasChanges = false;

        history = history.map(order => {
          const cleanInv = (order.invoiceNumber || '').replace(/^#/, '').toUpperCase();
          const remote = json.data.find(d => {
            const rInv = (d.Invoice || d.invoice || d.orderId || '').replace(/^#/, '').toUpperCase();
            return rInv === cleanInv;
          });
          if (remote) {
            const remoteStatus = remote.Status || remote.status;
            const remoteResi = remote.NoResi || remote.noResi || remote.Resi || remote.resi;
            if (remoteStatus && remoteStatus !== order.status) {
              order.status = remoteStatus;
              hasChanges = true;
            }
            if (remoteResi && remoteResi !== order.trackingNumber) {
              order.trackingNumber = remoteResi;
              hasChanges = true;
            }
          }
          return order;
        });

        if (hasChanges) {
          localStorage.setItem('sw_order_history_v1', JSON.stringify(history));
          renderOrderHistory();
        }
      }
    } catch (e) {
      console.warn('Sync riwayat cloud background:', e);
    }
  }

  window.renderOrderHistory = renderOrderHistory;
})();
