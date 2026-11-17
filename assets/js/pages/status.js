/**
 * Sambal by Kazel - Order Status Page Interactive Logic
 * Cloudflare Pages Static E-Commerce Edition
 */

(function() {
  'use strict';

  let currentOrder = null;

  /**
   * Helper Format Rupiah
   */
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  }

  /**
   * Mendeteksi URL pelacakan kurir ekspedisi asli
   */
  function getCourierTrackingUrl(courierName, noResi) {
    if (!noResi) return '#';
    const c = String(courierName || '').toLowerCase();
    const cleanResi = encodeURIComponent(String(noResi).trim());

    // 1. Paxel
    if (c.includes('paxel')) {
      return `https://paxel.co/id/lacak-pengiriman?awb=${cleanResi}`;
    }
    // 2. J&T / JNT
    if (c.includes('j&t') || c.includes('jnt')) {
      return `https://jet.co.id/track?billcode=${cleanResi}`;
    }
    // 3. Kurir Lainnya (JNE, SiCepat, Anteraja, dll. via CekResi)
    return `https://cekresi.com/?noresi=${cleanResi}`;
  }

  /**
   * Mendapatkan nama brand kurir untuk label tombol
   */
  function getCourierDisplayName(courierName) {
    const c = String(courierName || '').toLowerCase();
    if (c.includes('paxel')) return 'Paxel';
    if (c.includes('j&t') || c.includes('jnt')) return 'J&T';
    if (c.includes('jne')) return 'JNE';
    if (c.includes('sicepat')) return 'SiCepat';
    if (c.includes('anteraja')) return 'Anteraja';
    return courierName || 'Kurir Ekspedisi';
  }

  /**
   * Salin Nomor Resi ke Clipboard
   */
  window.copyResi = function(resi) {
    if (!resi) return;
    navigator.clipboard.writeText(resi).then(() => {
      const btnText = document.getElementById('btnCopyResiText');
      if (btnText) {
        const orig = btnText.textContent;
        btnText.textContent = 'Tersalin!';
        setTimeout(() => {
          btnText.textContent = orig;
        }, 2000);
      }
      if (typeof showToast === 'function') {
        showToast('Nomor resi berhasil disalin: ' + resi, 'success');
      }
    });
  };

  /**
   * Render Tampilan Status & Timeline
   */
  window.renderOrderStatus = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    const isAutoWa = urlParams.get('autoWa') === '1';

    let order = null;
    if (orderId) {
      const history = typeof getOrderHistory === 'function' ? getOrderHistory() : [];
      order = history.find(o => o.invoiceNumber === orderId || o.invoiceNumber === decodeURIComponent(orderId)) || (typeof getLastOrder === 'function' ? getLastOrder() : null);
    } else {
      order = typeof getLastOrder === 'function' ? getLastOrder() : null;
    }

    const foundView = document.getElementById('orderFoundView');
    const noOrderView = document.getElementById('noOrderView');

    if (!order) {
      if (foundView) foundView.classList.add('hidden');
      if (noOrderView) noOrderView.classList.remove('hidden');
      return;
    }

    currentOrder = order;

    if (foundView) foundView.classList.remove('hidden');
    if (noOrderView) noOrderView.classList.add('hidden');

    // Notifikasi toast jika baru selesai checkout
    if (isAutoWa) {
      setTimeout(() => {
        if (typeof showToast === 'function') {
          showToast('Pesanan berhasil dibuat! Silakan konfirmasi ke WhatsApp CS di bawah.', 'success');
        }
      }, 400);
    }

    // Header values
    const nameEl = document.getElementById('dispCustomerName');
    if (nameEl) nameEl.textContent = order.customerName || 'Pelanggan';

    const invEl = document.getElementById('dispInvoice');
    if (invEl) invEl.textContent = order.invoiceNumber || '#SBK-89421';

    const dateObj = order.createdAt ? new Date(order.createdAt) : new Date();
    const dateEl = document.getElementById('dispOrderDate');
    if (dateEl) {
      dateEl.textContent = dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    }

    const courierEl = document.getElementById('dispTimelineCourier');
    if (courierEl) courierEl.textContent = order.courierName || 'Paxel';

    // Address & Customer Info
    const detailName = document.getElementById('dispDetailName');
    if (detailName) detailName.textContent = order.customerName;

    const detailPhone = document.getElementById('dispDetailPhone');
    if (detailPhone) detailPhone.textContent = order.customerPhone;

    const detailCity = document.getElementById('dispDetailCity');
    if (detailCity) detailCity.textContent = order.customerCity;

    const detailPostal = document.getElementById('dispDetailPostal');
    if (detailPostal) detailPostal.textContent = order.customerPostal;

    const detailAddr = document.getElementById('dispDetailAddress');
    if (detailAddr) detailAddr.textContent = order.customerAddress;

    const detailCour = document.getElementById('dispDetailCourier');
    if (detailCour) detailCour.textContent = order.courierName;

    const detailPay = document.getElementById('dispDetailPayment');
    if (detailPay) detailPay.textContent = order.paymentMethodName;

    // Gift & Kitchen Notes
    const notesBox = document.getElementById('additionalNotesBox');
    const giftWrapper = document.getElementById('dispGiftNoteWrapper');
    const kitchenWrapper = document.getElementById('dispKitchenNoteWrapper');
    let hasNotes = false;

    if (order.giftCardNote) {
      hasNotes = true;
      if (giftWrapper) giftWrapper.classList.remove('hidden');
      const note = document.getElementById('dispGiftNote');
      if (note) note.textContent = `"${order.giftCardNote}"`;
    }
    if (order.kitchenNote) {
      hasNotes = true;
      if (kitchenWrapper) kitchenWrapper.classList.remove('hidden');
      const knote = document.getElementById('dispKitchenNote');
      if (knote) knote.textContent = `"${order.kitchenNote}"`;
    }
    if (hasNotes && notesBox) {
      notesBox.classList.remove('hidden');
    }

    // Render Items list
    const itemsContainer = document.getElementById('dispItemsList');
    if (itemsContainer) {
      itemsContainer.innerHTML = (order.items || []).map(item => {
        const safeName = typeof escapeHtml === 'function' ? escapeHtml(item.name) : item.name;
        const safeSize = typeof escapeHtml === 'function' ? escapeHtml(item.size) : item.size;
        const safeImage = (typeof item.image === 'string' && item.image.startsWith('http')) ? encodeURI(item.image) : FALLBACK_IMG;
        const safeQty = parseInt(item.qty, 10) || 1;
        const safePrice = Number(item.price) || 0;

        return `
          <div class="pt-2.5 first:pt-0 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-11 h-11 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/40">
                <img src="${safeImage}" alt="${safeName}" onerror="this.src=FALLBACK_IMG; this.removeAttribute('onerror');" class="w-full h-full object-cover">
              </div>
              <div>
                <div class="font-bold text-xs sm:text-sm text-on-surface line-clamp-1">${safeName}</div>
                <div class="text-[11px] text-on-surface-variant">${safeSize} • ${safeQty}x @ ${formatRupiah(safePrice)}</div>
              </div>
            </div>
            <span class="font-extrabold text-xs sm:text-sm text-on-surface">${formatRupiah(safePrice * safeQty)}</span>
          </div>
        `;
      }).join('');
    }

    // Calculations Breakdown
    const subEl = document.getElementById('dispSubtotal');
    if (subEl) subEl.textContent = formatRupiah(order.subtotal || 0);

    const shipEl = document.getElementById('dispShipping');
    if (shipEl) shipEl.textContent = (order.shippingFee === 0) ? 'GRATIS' : formatRupiah(order.shippingFee || 0);

    const discEl = document.getElementById('dispDiscount');
    if (discEl) discEl.textContent = `-${formatRupiah(order.discountAmount || 0)}`;

    const grandEl = document.getElementById('dispGrandTotal');
    if (grandEl) grandEl.textContent = formatRupiah(order.grandTotal || 0);

    // WhatsApp Button Link
    const waBtn = document.getElementById('btnWhatsAppConfirm');
    if (waBtn && typeof generateWhatsAppOrderLink === 'function') {
      waBtn.href = generateWhatsAppOrderLink(order);
    }

    // Render Timeline & Tracking Resi
    updateTimelineUI(order);

    // Sinkronisasi status & resi terbaru dari Google Sheets secara otomatis
    syncStatusFromGoogleSheets(order.invoiceNumber, order);
  };

  /**
   * Memperbarui visual Timeline 4 Langkah & Kotak Resi
   */
  function updateTimelineUI(order) {
    if (!order) return;

    const rawStatus = String(order.status || '').toLowerCase();
    const resi = String(order.trackingNumber || order.noResi || '').trim();

    const isDelivered = rawStatus.includes('selesai') || rawStatus.includes('delivered') || rawStatus.includes('diterima');
    const isShipped = isDelivered || rawStatus.includes('kirim') || rawStatus.includes('shipped') || rawStatus.includes('jalan');
    const isCooking = !isShipped && (rawStatus.includes('proses') || rawStatus.includes('masak') || rawStatus.includes('dapur'));
    const isPending = !isShipped && !isCooking;

    // 1. Tampilan Nomor Resi di Atas
    const resiEl = document.getElementById('dispResi');
    if (resiEl) {
      if (resi && (isShipped || isDelivered)) {
        resiEl.innerHTML = `<strong class="text-primary font-mono font-bold tracking-wider">${escapeHtml(resi)}</strong>`;
      } else {
        resiEl.innerHTML = `<span class="text-on-surface-variant font-medium italic">Menunggu penjemputan kurir</span>`;
      }
    }

    // 2. Badge Status Header
    const badgeText = document.getElementById('dispStatusBadgeText');
    const badgeEl = document.getElementById('dispStatusBadge');
    if (badgeText && badgeEl) {
      if (isDelivered) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold';
        badgeEl.innerHTML = '<span class="material-symbols-outlined text-sm text-green-700">check_circle</span> <span>Pesanan Selesai</span>';
      } else if (isShipped) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span> <span>Sedang Dikirim Kurir</span>';
      } else if (isCooking) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span> <span>Sedang Diproses Dapur</span>';
      } else {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> <span>Menunggu Konfirmasi</span>';
      }
    }

    // 3. STEP 2: Sedang Dimasak & Dikemas
    const step2Icon = document.getElementById('step2Icon');
    const step2Title = document.getElementById('step2Title');
    const step2Tag = document.getElementById('step2Tag');
    if (step2Icon && step2Title && step2Tag) {
      if (isShipped || isDelivered) {
        // Sudah selesai tahap 2
        step2Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shadow-md';
        step2Icon.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
        step2Title.className = 'font-bold text-sm text-on-surface';
        step2Tag.className = 'text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block';
        step2Tag.textContent = 'Selesai';
      } else {
        // Sedang aktif di tahap 2
        step2Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shadow-md animate-pulse';
        step2Icon.innerHTML = '<span class="material-symbols-outlined text-sm fill">skillet</span>';
        step2Title.className = 'font-extrabold text-sm text-primary';
        step2Tag.className = 'text-[10px] font-semibold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded mt-1 inline-block';
        step2Tag.textContent = 'Tahap Saat Ini (Estimasi 2-4 Jam)';
      }
    }

    // 4. STEP 3: Dijemput Kurir Ekspedisi (Pelacakan Resi & Tombol Cek Resi)
    const step3Icon = document.getElementById('step3Icon');
    const step3Title = document.getElementById('step3Title');
    const step3ActionBox = document.getElementById('step3ActionBox');
    const courierBrand = getCourierDisplayName(order.courierName);
    const trackingUrl = getCourierTrackingUrl(order.courierName, resi);

    if (step3Icon && step3Title) {
      if (isDelivered) {
        // Selesai diantar
        step3Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shadow-md';
        step3Icon.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
        step3Title.className = 'font-bold text-sm text-on-surface';
      } else if (isShipped) {
        // Aktif sedang dikirim
        step3Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shadow-md animate-pulse';
        step3Icon.innerHTML = '<span class="material-symbols-outlined text-sm">local_shipping</span>';
        step3Title.className = 'font-extrabold text-sm text-primary';
      } else {
        // Menunggu
        step3Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs';
        step3Icon.innerHTML = '<span class="material-symbols-outlined text-sm">local_shipping</span>';
        step3Title.className = 'font-bold text-sm text-on-surface-variant';
      }
    }

    if (step3ActionBox) {
      if (isShipped && resi) {
        step3ActionBox.innerHTML = `
          <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-2 mt-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-on-surface-variant">Nomor Resi Resmi:</span>
              <span class="font-mono font-bold text-primary text-sm">${escapeHtml(resi)}</span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <!-- Tombol Salin Resi -->
              <button type="button" onclick="copyResi('${escapeHtml(resi)}')" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 transition-colors shadow-2xs active:scale-95 tap-target">
                <span class="material-symbols-outlined text-sm text-primary">content_copy</span>
                <span id="btnCopyResiText">Salin Resi</span>
              </button>

              <!-- Tombol Lacak di Kurir Asli -->
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-container transition-all shadow-xs active:scale-95 tap-target">
                <span>Lacak di ${escapeHtml(courierBrand)}</span>
                <span class="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>
          </div>
        `;
      } else {
        step3ActionBox.innerHTML = '';
      }
    }

    // 5. STEP 4: Tiba di Alamat Tujuan
    const step4Icon = document.getElementById('step4Icon');
    const step4Title = document.getElementById('step4Title');
    const step4Tag = document.getElementById('step4Tag');
    if (step4Icon && step4Title) {
      if (isDelivered) {
        step4Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shadow-md';
        step4Icon.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
        step4Title.className = 'font-black text-sm text-green-700';
        if (step4Tag) {
          step4Tag.classList.remove('hidden');
          step4Tag.textContent = 'Paket Berhasil Diterima';
        }
      } else {
        step4Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs';
        step4Icon.innerHTML = '<span class="material-symbols-outlined text-sm">home</span>';
        step4Title.className = 'font-bold text-sm text-on-surface-variant';
        if (step4Tag) step4Tag.classList.add('hidden');
      }
    }
  }

  /**
   * Sinkronisasi data status & nomor resi real-time dari Google Sheets
   */
  async function syncStatusFromGoogleSheets(invoiceNumber, localOrder) {
    const sheetUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SHEET_URL : '';
    if (!sheetUrl || sheetUrl === 'PASTE_URL_WEB_APP_APPS_SCRIPT_DISINI' || !sheetUrl.startsWith('http')) {
      return;
    }

    try {
      const res = await fetch(sheetUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      const json = await res.json();
      if (!json || json.status !== 'success' || !Array.isArray(json.data)) return;

      const targetId = String(invoiceNumber).trim().toUpperCase();
      const match = json.data.find(r => {
        const inv = r.Invoice || r.invoice || r.orderId || r.invoiceNumber;
        return inv && String(inv).trim().toUpperCase() === targetId;
      });

      if (match) {
        const remoteStatus = match.Status || match.status || '';
        const remoteResi = match.NoResi || match.noResi || match.trackingNumber || match.Resi || match.resi || '';

        let isUpdated = false;
        if (remoteStatus && remoteStatus !== localOrder.status) {
          localOrder.status = remoteStatus;
          isUpdated = true;
        }
        if (remoteResi && remoteResi !== localOrder.trackingNumber) {
          localOrder.trackingNumber = remoteResi;
          localOrder.noResi = remoteResi;
          isUpdated = true;
        }

        if (isUpdated) {
          // Update ke localStorage
          updateLocalOrderStorage(localOrder);
          // Re-render Timeline secara langsung
          updateTimelineUI(localOrder);

          if (remoteStatus.toLowerCase().includes('kirim') && remoteResi) {
            if (typeof showToast === 'function') {
              showToast(`Paket Anda sedang dikirim (${remoteResi})!`, 'info');
            }
          }
        }
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data status Google Sheets:', err);
    }
  }

  function updateLocalOrderStorage(order) {
    try {
      let history = typeof getOrderHistory === 'function' ? getOrderHistory() : [];
      const idx = history.findIndex(o => o.invoiceNumber === order.invoiceNumber);
      if (idx !== -1) {
        history[idx].status = order.status;
        history[idx].trackingNumber = order.trackingNumber;
        history[idx].noResi = order.trackingNumber;
        localStorage.setItem('sw_order_history_v1', JSON.stringify(history));
      }
      localStorage.setItem('sw_last_order', JSON.stringify(order));
    } catch (e) {
      console.error('Error saving updated order to localStorage:', e);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.renderOrderStatus();
  });

})();
