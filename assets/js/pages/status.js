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

  let selectedProofBase64 = null;

  /**
   * Salin Nomor Rekening ke Clipboard
   */
  window.copyPaymentAccount = function(accNumber, btnEl) {
    if (!accNumber) return;
    navigator.clipboard.writeText(accNumber).then(() => {
      if (btnEl) {
        const textSpan = btnEl.querySelector('span:not(.material-symbols-outlined)') || btnEl;
        const orig = textSpan.textContent;
        textSpan.textContent = 'Tersalin!';
        setTimeout(() => {
          textSpan.textContent = orig;
        }, 2000);
      }
      if (typeof showToast === 'function') {
        showToast('Nomor rekening berhasil disalin: ' + accNumber, 'success');
      }
    });
  };

  /**
   * Kompresi Otomatis Foto Bukti Transfer via Canvas (< 500KB)
   */
  window.handleProofFileSelect = function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (typeof showToast === 'function') {
        showToast('Mohon pilih file gambar (JPG/PNG).', 'error');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Kompresi otomatis via Canvas max 1200px
        const maxDimension = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Quality 0.75 menghasilkan ukuran file ~100KB - 300KB
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        selectedProofBase64 = compressedDataUrl;

        // Tampilkan Preview
        const previewImg = document.getElementById('proofPreviewImg');
        const previewBox = document.getElementById('proofPreviewContainer');
        const dropzone = document.getElementById('proofDropzone');
        const submitBtn = document.getElementById('btnSubmitProof');
        const sizeText = document.getElementById('proofFileSizeText');

        if (previewImg) previewImg.src = compressedDataUrl;
        if (previewBox) previewBox.classList.remove('hidden');
        if (dropzone) dropzone.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;

        const approxKb = Math.round((compressedDataUrl.length * 3 / 4) / 1024);
        if (sizeText) sizeText.textContent = `Ukuran terkompresi: ~${approxKb} KB`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  /**
   * Kirim Foto Bukti Transfer ke Backend Apps Script
   */
  window.submitPaymentProof = async function() {
    if (!currentOrder || !selectedProofBase64) {
      if (typeof showToast === 'function') {
        showToast('Silakan pilih foto bukti transfer terlebih dahulu.', 'error');
      }
      return;
    }

    const submitBtn = document.getElementById('btnSubmitProof');
    const submitBtnText = document.getElementById('btnSubmitProofText');

    if (submitBtn) submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.innerHTML = '<span class="inline-flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span> Mengunggah...</span>';

    try {
      if (typeof window.submitPaymentProofToGoogleSheets === 'function') {
        await window.submitPaymentProofToGoogleSheets({
          invoice: currentOrder.invoiceNumber,
          name: currentOrder.customerName,
          imageBase64: selectedProofBase64
        });
      }

      // Update status lokal di localStorage
      currentOrder.status = 'Menunggu Verifikasi';
      currentOrder.buktiBayar = selectedProofBase64;

      try {
        localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(currentOrder));
        let history = typeof getOrderHistory === 'function' ? getOrderHistory() : [];
        const idx = history.findIndex(o => o.invoiceNumber === currentOrder.invoiceNumber);
        if (idx > -1) {
          history[idx] = currentOrder;
        } else {
          history.unshift(currentOrder);
        }
        localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
      } catch (storageErr) {
        console.warn('Storage save warning:', storageErr);
      }

      if (typeof showToast === 'function') {
        showToast('Bukti transfer berhasil dikirim! Menunggu verifikasi admin.', 'success');
      }

      // Reset state form dan render ulang tampilan
      selectedProofBase64 = null;
      window.renderOrderStatus();

    } catch (err) {
      console.error('Submit proof error:', err);
      if (typeof showToast === 'function') {
        showToast('Gagal mengunggah bukti transfer, silakan kirim via WhatsApp CS.', 'error');
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = 'Kirim Bukti Pembayaran';
    }
  };

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
          showToast('Pesanan berhasil dibuat! Silakan konfirmasi atau selesaikan pembayaran.', 'success');
        }
      }, 400);
    }

    // 1. Bedakan Alur Awal COD vs Non-COD
    const isCod = String(order.paymentMethodName || order.paymentCode || '').toLowerCase().includes('cod');
    const rawStatus = String(order.status || '').trim();
    const isWaitingPayment = !isCod && (rawStatus.toLowerCase().includes('menunggu pembayaran') || rawStatus.toLowerCase() === 'pending');
    const isWaitingVerification = !isCod && rawStatus.toLowerCase().includes('verifikasi');

    // 2. Pembaruan Header Banner Berdasarkan Status
    const bannerEl = document.getElementById('statusHeaderBanner');
    const bannerPill = document.getElementById('dispBannerPill');
    const bannerPillIcon = document.getElementById('dispBannerPillIcon');
    const bannerPillText = document.getElementById('dispBannerPillText');
    const bannerTitle = document.getElementById('dispBannerTitle');
    const bannerSubtitle = document.getElementById('dispBannerSubtitle');

    if (bannerEl && bannerTitle && bannerSubtitle) {
      if (isWaitingPayment) {
        bannerEl.className = 'bg-gradient-to-br from-amber-600 via-amber-700 to-primary rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300';
        if (bannerPill) bannerPill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm text-amber-200';
        if (bannerPillIcon) bannerPillIcon.textContent = 'pending';
        if (bannerPillText) bannerPillText.textContent = 'Menunggu Pembayaran Transfer';
        bannerTitle.innerHTML = 'Menunggu Pembayaran — Segera Selesaikan Transfer';
        bannerSubtitle.innerHTML = `Silakan transfer tepat <strong class="text-yellow-300 font-extrabold">${formatRupiah(order.grandTotal)}</strong> ke rekening resmi di bawah dan upload foto bukti bayar agar pesanan segera dimasak di dapur.`;
      } else if (isWaitingVerification) {
        bannerEl.className = 'bg-gradient-to-br from-amber-700 via-primary-container to-primary rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300';
        if (bannerPill) bannerPill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm text-amber-100';
        if (bannerPillIcon) bannerPillIcon.textContent = 'hourglass_top';
        if (bannerPillText) bannerPillText.textContent = 'Bukti Terkirim — Menunggu Verifikasi Admin';
        bannerTitle.innerHTML = 'Bukti Pembayaran Berhasil Diterima!';
        bannerSubtitle.innerHTML = 'Admin Sambal by Kazel sedang memeriksa mutasi rekening Anda. Status pesanan akan otomatis terupdate begitu diverifikasi.';
      } else {
        bannerEl.className = 'bg-gradient-to-br from-primary via-primary-container to-secondary rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300';
        if (bannerPill) bannerPill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm text-white';
        if (bannerPillIcon) bannerPillIcon.textContent = 'check_circle';
        if (bannerPillText) bannerPillText.textContent = isCod ? 'Pesanan COD Berhasil Masuk ke Dapur' : 'Pembayaran Diverifikasi & Masuk Dapur';
        bannerTitle.innerHTML = `Terima Kasih, <span id="dispCustomerName">${escapeHtml(order.customerName || 'Pelanggan')}</span>!`;
        bannerSubtitle.innerHTML = 'Sambal racikan spesial Anda sedang kami siapkan dengan standar higienis terbaik.';
      }
    }

    // 3. Tampilkan Kartu Instruksi Pembayaran & Upload Bukti jika Non-COD
    const payCard = document.getElementById('paymentInstructionCard');
    if (payCard) {
      if (!isCod && (isWaitingPayment || isWaitingVerification)) {
        payCard.classList.remove('hidden');
        const payTotalEl = document.getElementById('payTotalAmount');
        if (payTotalEl) payTotalEl.textContent = formatRupiah(order.grandTotal);

        const cardBadge = document.getElementById('payCardStatusBadge');
        if (cardBadge) {
          if (isWaitingVerification) {
            cardBadge.textContent = 'Sedang Diverifikasi Admin';
            cardBadge.parentElement.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 mb-1';
          } else {
            cardBadge.textContent = 'Menunggu Pembayaran';
            cardBadge.parentElement.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 mb-1';
          }
        }

        // Cek jika sudah pernah upload bukti
        const hasProof = order.buktiBayar && order.buktiBayar !== '-';
        const indicator = document.getElementById('proofUploadedIndicator');
        const existingBox = document.getElementById('existingProofBox');
        const proofLink = document.getElementById('linkViewUploadedProof');

        if (hasProof) {
          if (indicator) indicator.classList.remove('hidden');
          if (existingBox) {
            existingBox.classList.remove('hidden');
            existingBox.classList.add('flex');
          }
          if (proofLink) proofLink.href = order.buktiBayar;
        } else {
          if (indicator) indicator.classList.add('hidden');
          if (existingBox) {
            existingBox.classList.add('hidden');
            existingBox.classList.remove('flex');
          }
        }

        // Tombol Kirim Bukti Alternatif via WhatsApp
        const waAltBtn = document.getElementById('btnWaAltProof');
        if (waAltBtn) {
          const adminPhone = (window.APP_CONFIG && window.APP_CONFIG.WHATSAPP_ADMIN) || '6281234567890';
          const msg = `Halo Admin Sambal by Kazel! Saya ingin konfirmasi pembayaran pesanan ${order.invoiceNumber} (${order.customerName}) sebesar ${formatRupiah(order.grandTotal)}. Berikut bukti transfer saya:`;
          waAltBtn.href = `https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`;
        }
      } else {
        payCard.classList.add('hidden');
      }
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

    // Render Template Cetak Bukti Invoice 1 Halaman
    populatePrintableInvoice(order);

    // Sinkronisasi status & resi terbaru dari Google Sheets secara otomatis & berkala
    syncStatusFromGoogleSheets(order.invoiceNumber, order);
    startStatusPolling(order.invoiceNumber, order);
  };

  /**
   * Memperbarui visual Timeline 4 Langkah & Kotak Resi
   */
  function updateTimelineUI(order) {
    if (!order) return;

    const rawStatus = String(order.status || '').toLowerCase();
    const resi = String(order.trackingNumber || order.noResi || '').trim();
    const isCod = String(order.paymentMethodName || order.paymentCode || '').toLowerCase().includes('cod');

    const isDelivered = rawStatus.includes('selesai') || rawStatus.includes('delivered') || rawStatus.includes('diterima');
    const isShipped = isDelivered || rawStatus.includes('kirim') || rawStatus.includes('shipped') || rawStatus.includes('jalan');
    const isCooking = !isShipped && (rawStatus.includes('proses') || rawStatus.includes('masak') || rawStatus.includes('dapur'));
    const isWaitingVerification = !isShipped && !isCooking && rawStatus.includes('verifikasi');
    const isWaitingPayment = !isShipped && !isCooking && !isWaitingVerification && (!isCod || rawStatus.includes('bayar'));

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
    if (badgeEl) {
      if (isDelivered) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold';
        badgeEl.innerHTML = '<span class="material-symbols-outlined text-sm text-green-700">check_circle</span> <span>Pesanan Selesai</span>';
      } else if (isShipped) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary border border-primary-border text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span> <span>Sedang Dikirim Kurir</span>';
      } else if (isCooking) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span> <span>Sedang Diproses Dapur</span>';
      } else if (isWaitingVerification) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> <span>Menunggu Verifikasi Admin</span>';
      } else {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold';
        badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> <span>Menunggu Pembayaran</span>';
      }
    }

    // Toggle Tombol Simpan Invoice (Sembunyikan otomatis jika pesanan belum dibayar atau dibatalkan)
    const btnSaveInvoice = document.getElementById('btnSaveInvoice');
    if (btnSaveInvoice) {
      const isCancelled = rawStatus.includes('batal') || rawStatus.includes('cancel');
      if (isWaitingPayment || isCancelled) {
        btnSaveInvoice.classList.add('hidden');
      } else {
        btnSaveInvoice.classList.remove('hidden');
      }
    }

    // 3. STEP 1: Status Pembayaran & Konfirmasi
    const step1Icon = document.getElementById('step1Icon');
    const step1Title = document.getElementById('step1Title');
    const step1Desc = document.getElementById('step1Desc');
    const step1Tag = document.getElementById('step1Tag');

    if (step1Icon && step1Title && step1Desc && step1Tag) {
      if (isWaitingPayment) {
        step1Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shadow-md animate-pulse';
        step1Icon.innerHTML = '<span class="material-symbols-outlined text-sm">payment</span>';
        step1Title.className = 'font-extrabold text-sm text-amber-800';
        step1Title.textContent = 'Menunggu Pembayaran Transfer';
        step1Desc.textContent = `Silakan transfer nominal ${formatRupiah(order.grandTotal)} dan unggah bukti transfer.`;
        step1Tag.className = 'text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded mt-1 inline-block';
        step1Tag.textContent = 'Tahap Saat Ini';
      } else if (isWaitingVerification) {
        step1Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-md animate-pulse';
        step1Icon.innerHTML = '<span class="material-symbols-outlined text-sm">hourglass_top</span>';
        step1Title.className = 'font-extrabold text-sm text-blue-800';
        step1Title.textContent = 'Menunggu Verifikasi Admin';
        step1Desc.textContent = 'Bukti pembayaran telah diterima. Admin sedang memverifikasi mutasi rekening.';
        step1Tag.className = 'text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block';
        step1Tag.textContent = 'Sedang Diverifikasi';
      } else if (isCod) {
        step1Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shadow-md';
        step1Icon.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
        step1Title.className = 'font-bold text-sm text-on-surface';
        step1Title.textContent = 'Pesanan Diterima (COD)';
        step1Desc.textContent = 'Pesanan langsung masuk ke dapur. Pembayaran tunai saat kurir tiba.';
        step1Tag.className = 'text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block';
        step1Tag.textContent = 'Selesai';
      } else {
        step1Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shadow-md';
        step1Icon.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
        step1Title.className = 'font-bold text-sm text-on-surface';
        step1Title.textContent = 'Pembayaran Terverifikasi & Diterima';
        step1Desc.textContent = 'Pembayaran transfer telah diverifikasi lunas oleh admin.';
        step1Tag.className = 'text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block';
        step1Tag.textContent = 'Selesai';
      }
    }

    // 4. STEP 2: Sedang Dimasak & Dikemas
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
      } else if (isCooking) {
        // Sedang aktif di tahap 2
        step2Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shadow-md animate-pulse';
        step2Icon.innerHTML = '<span class="material-symbols-outlined text-sm fill">skillet</span>';
        step2Title.className = 'font-extrabold text-sm text-primary';
        step2Tag.className = 'text-[10px] font-semibold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded mt-1 inline-block';
        step2Tag.textContent = 'Tahap Saat Ini (Estimasi 2-4 Jam)';
      } else {
        step2Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs';
        step2Icon.innerHTML = '<span class="material-symbols-outlined text-sm fill">skillet</span>';
        step2Title.className = 'font-bold text-sm text-on-surface-variant';
        step2Tag.className = 'text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded mt-1 inline-block';
        step2Tag.textContent = isWaitingVerification ? 'Menunggu Verifikasi' : 'Menunggu Pembayaran';
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
        const safeResi = String(resi || '').replace(/[^a-zA-Z0-9_\-#]/g, '');
        step3ActionBox.innerHTML = `
          <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-2 mt-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-on-surface-variant">Nomor Resi Resmi:</span>
              <span class="font-mono font-bold text-primary text-sm">${escapeHtml(safeResi)}</span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <!-- Tombol Salin Resi -->
              <button type="button" onclick="copyResi('${safeResi}')" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 transition-colors shadow-2xs active:scale-95 tap-target">
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
          step4Tag.classList.add('inline-block');
          step4Tag.textContent = 'Paket Berhasil Diterima';
        }
      } else {
        step4Icon.className = 'absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs';
        step4Icon.innerHTML = '<span class="material-symbols-outlined text-sm">home</span>';
        step4Title.className = 'font-bold text-sm text-on-surface-variant';
        if (step4Tag) {
          step4Tag.classList.add('hidden');
          step4Tag.classList.remove('inline-block');
        }
      }
    }
  }

  /**
   * Mengisi data ke template khusus Cetak Bukti Invoice 1 Halaman (#printableInvoice)
   */
  function populatePrintableInvoice(order) {
    if (!order) return;

    // 1. Kop Invoice
    const printInv = document.getElementById('printInvoice');
    if (printInv) printInv.textContent = order.invoiceNumber || '#SBK-00000';

    const printDate = document.getElementById('printDate');
    if (printDate) {
      const dateObj = order.createdAt ? new Date(order.createdAt) : new Date();
      printDate.textContent = dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    }

    const printStatus = document.getElementById('printStatus');
    if (printStatus) {
      printStatus.textContent = order.status || 'Menunggu Pembayaran';
    }

    // 2. Kolom Kiri: Ditagihkan / Dikirim Kepada
    const printName = document.getElementById('printCustomerName');
    if (printName) printName.textContent = order.customerName || 'Pelanggan';

    const printPhone = document.getElementById('printCustomerPhone');
    if (printPhone) printPhone.textContent = order.customerPhone || '-';

    const printAddress = document.getElementById('printCustomerAddress');
    if (printAddress) {
      const parts = [
        order.customerAddress,
        order.customerCity,
        order.customerPostal
      ].filter(Boolean);
      printAddress.textContent = parts.length > 0 ? parts.join(', ') : '-';
    }

    // 3. Kolom Kanan: Detail Pengiriman & Pembayaran
    const printCourier = document.getElementById('printCourier');
    if (printCourier) {
      printCourier.textContent = order.courierName || order.shippingCourier || 'Paxel';
    }

    const printResi = document.getElementById('printResi');
    if (printResi) {
      const resi = String(order.trackingNumber || order.noResi || '').trim();
      printResi.textContent = (resi && resi !== '-') ? resi : 'Menunggu nomor resi';
    }

    const printPayment = document.getElementById('printPayment');
    if (printPayment) {
      printPayment.textContent = order.paymentMethodName || order.paymentMethod || 'Transfer Bank';
    }

    // 4. Tabel Rincian Menu
    const printItemsList = document.getElementById('printItemsList');
    if (printItemsList) {
      if (Array.isArray(order.items) && order.items.length > 0) {
        printItemsList.innerHTML = order.items.map(item => {
          const safeName = escapeHtml(item.name || 'Menu Sambal');
          const safeSize = item.size ? ` (${escapeHtml(item.size)})` : '';
          const safeQty = parseInt(item.qty, 10) || 1;
          const safePrice = Number(item.price) || 0;
          const lineTotal = safePrice * safeQty;
          return `
            <tr>
              <td class="py-2 px-2 text-left text-gray-800 font-medium">${safeName}${safeSize}</td>
              <td class="py-2 px-2 text-center text-gray-700 font-mono">${safeQty}</td>
              <td class="py-2 px-2 text-right text-gray-700 font-mono">${formatRupiah(safePrice)}</td>
              <td class="py-2 px-2 text-right text-gray-900 font-bold font-mono">${formatRupiah(lineTotal)}</td>
            </tr>
          `;
        }).join('');
      } else if (typeof order.items === 'string' && order.items.trim()) {
        printItemsList.innerHTML = `
          <tr>
            <td class="py-2 px-2 text-left text-gray-800 font-medium" colspan="3">${escapeHtml(order.items)}</td>
            <td class="py-2 px-2 text-right text-gray-900 font-bold font-mono">${formatRupiah(order.subtotal || order.grandTotal || 0)}</td>
          </tr>
        `;
      } else {
        printItemsList.innerHTML = `
          <tr>
            <td class="py-2 px-2 text-left text-gray-500 italic" colspan="4">Rincian menu tidak tersedia</td>
          </tr>
        `;
      }
    }

    // 5. Catatan Khusus
    const printNotesBox = document.getElementById('printNotesBox');
    const printNotesText = document.getElementById('printNotesText');
    const notesArr = [];
    if (order.kitchenNote) notesArr.push(`Catatan Dapur: ${order.kitchenNote}`);
    if (order.giftCardNote) notesArr.push(`Kartu Ucapan: "${order.giftCardNote}"`);
    if (notesArr.length > 0 && printNotesBox && printNotesText) {
      printNotesText.textContent = notesArr.join(' | ');
      printNotesBox.classList.remove('hidden');
    } else if (printNotesBox) {
      printNotesBox.classList.add('hidden');
    }

    // 6. Ringkasan Finansial
    const printSubtotal = document.getElementById('printSubtotal');
    if (printSubtotal) printSubtotal.textContent = formatRupiah(order.subtotal || 0);

    const printShipping = document.getElementById('printShipping');
    if (printShipping) {
      printShipping.textContent = (order.shippingFee === 0) ? 'GRATIS' : formatRupiah(order.shippingFee || 0);
    }

    const printDiscountRow = document.getElementById('printDiscountRow');
    const printDiscount = document.getElementById('printDiscount');
    const discountAmt = Number(order.discountAmount || 0);
    if (discountAmt > 0 && printDiscountRow && printDiscount) {
      printDiscount.textContent = `-${formatRupiah(discountAmt)}`;
      printDiscountRow.classList.remove('hidden');
    } else if (printDiscountRow) {
      printDiscountRow.classList.add('hidden');
    }

    const printGrandTotal = document.getElementById('printGrandTotal');
    if (printGrandTotal) printGrandTotal.textContent = formatRupiah(order.grandTotal || 0);
  }

  let statusPollTimer = null;

  function startStatusPolling(invoiceNumber, localOrder) {
    if (statusPollTimer) clearInterval(statusPollTimer);

    // Polling background setiap 10 detik agar pembeli melihat update kurir/resi secara otomatis tanpa perlu refresh
    statusPollTimer = setInterval(() => {
      if (!document.hidden && currentOrder) {
        const s = String(currentOrder.status || '').toLowerCase();
        // Berhenti polling jika pesanan sudah selesai atau dibatalkan
        if (s.includes('selesai') || s.includes('batal')) {
          clearInterval(statusPollTimer);
          statusPollTimer = null;
          return;
        }
        syncStatusFromGoogleSheets(currentOrder.invoiceNumber, currentOrder);
      }
    }, 10000);
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
      // Gunakan query param _t agar request tidak di-cache oleh browser
      const fetchUrl = sheetUrl + (sheetUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
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
          // Re-populate Printable Invoice
          populatePrintableInvoice(localOrder);

          if (remoteStatus.toLowerCase().includes('kirim') && remoteResi) {
            if (typeof showToast === 'function') {
              showToast(`Status Pesanan Diperbarui: Sedang dikirim kurir (${remoteResi})!`, 'info');
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

  // Auto-sync saat tab aktif kembali
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentOrder) {
      syncStatusFromGoogleSheets(currentOrder.invoiceNumber, currentOrder);
    }
  });

  // Auto-sync jika admin merubah status di tab yang sama / storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'sw_order_history_v1' || e.key === 'sw_last_order') {
      window.renderOrderStatus();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    window.renderOrderStatus();
  });

})();
