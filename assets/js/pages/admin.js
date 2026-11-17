/**
 * Sambal by Kazel - Admin Dashboard Logic
 * Cloudflare Pages Static E-Commerce Edition
 */

(function() {
  'use strict';

  // State
  let allOrders = [];
  let filteredOrders = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let currentSort = 'desc'; // 'desc' (terbaru) atau 'asc' (terlama)
  let isCloudConnected = false;
  let activeOrderDetail = null;

  // Elemen DOM
  const elements = {
    pinModal: null,
    pinInputs: [],
    pinError: null,
    dashboardContent: null,
    connectionBadge: null,
    statTotalOrders: null,
    statTotalRevenue: null,
    statNeedProcess: null,
    statCompleted: null,
    searchInput: null,
    filterPills: null,
    sortSelect: null,
    ordersTableBody: null,
    emptyState: null,
    orderCountLabel: null,
    detailModal: null,
    detailContent: null,
    quickStatusModal: null
  };

  /**
   * Format Rupiah
   */
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  }

  /**
   * Format Tanggal & Jam Indonesia
   */
  function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Inisialisasi DOM Reference
   */
  function initDOMElements() {
    elements.pinModal = document.getElementById('adminPinModal');
    elements.pinInputs = Array.from(document.querySelectorAll('.pin-digit-input'));
    elements.pinError = document.getElementById('pinErrorMessage');
    elements.dashboardContent = document.getElementById('dashboardContent');
    elements.connectionBadge = document.getElementById('connectionStatusBadge');
    elements.statTotalOrders = document.getElementById('statTotalOrders');
    elements.statTotalRevenue = document.getElementById('statTotalRevenue');
    elements.statNeedProcess = document.getElementById('statNeedProcess');
    elements.statCompleted = document.getElementById('statCompleted');
    elements.searchInput = document.getElementById('adminSearchInput');
    elements.filterPills = Array.from(document.querySelectorAll('[data-filter]'));
    elements.sortSelect = document.getElementById('adminSortSelect');
    elements.ordersTableBody = document.getElementById('adminOrdersTableBody');
    elements.emptyState = document.getElementById('adminEmptyState');
    elements.orderCountLabel = document.getElementById('adminOrderCountLabel');
    elements.detailModal = document.getElementById('orderDetailModal');
    elements.detailContent = document.getElementById('orderDetailContent');
  }

  // ============================================================================
  // PIN LOCK & SESSION MANAGEMENT
  // ============================================================================

  function checkAuth() {
    const isAuth = sessionStorage.getItem('sbk_admin_auth') === 'true';
    if (isAuth) {
      showDashboard();
    } else {
      showPinModal();
    }
  }

  function showPinModal() {
    if (elements.pinModal) {
      elements.pinModal.classList.remove('hidden');
      elements.pinModal.classList.add('flex');
    }
    if (elements.dashboardContent) {
      elements.dashboardContent.classList.add('hidden');
    }
    resetPinInputs();
  }

  function showDashboard() {
    if (elements.pinModal) {
      elements.pinModal.classList.add('hidden');
      elements.pinModal.classList.remove('flex');
    }
    if (elements.dashboardContent) {
      elements.dashboardContent.classList.remove('hidden');
    }
    loadOrdersData();
  }

  function resetPinInputs() {
    elements.pinInputs.forEach(input => {
      input.value = '';
      input.classList.remove('border-primary', 'bg-red-50');
    });
    if (elements.pinError) elements.pinError.classList.add('hidden');
    if (elements.pinInputs[0]) {
      setTimeout(() => elements.pinInputs[0].focus(), 150);
    }
  }

  function setupPinListeners() {
    const inputs = elements.pinInputs;

    inputs.forEach((input, index) => {
      // Input angka saja
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';

        if (e.target.value) {
          if (index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else {
            // Digit terakhir terisi, verifikasi PIN
            verifyEnteredPin();
          }
        }
      });

      // Handle Backspace
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        } else if (e.key === 'Enter') {
          verifyEnteredPin();
        }
      });

      // Handle Paste 6 digit
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length) {
          for (let i = 0; i < pasted.length && i < inputs.length; i++) {
            inputs[i].value = pasted[i];
          }
          if (pasted.length >= inputs.length) {
            inputs[inputs.length - 1].focus();
            verifyEnteredPin();
          } else {
            inputs[pasted.length].focus();
          }
        }
      });
    });

    // Keyboard Keypad Numeric Onscreen (opsional di mobile)
    const keypadButtons = document.querySelectorAll('[data-keypad-val]');
    keypadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-keypad-val');
        if (val === 'backspace') {
          for (let i = inputs.length - 1; i >= 0; i--) {
            if (inputs[i].value) {
              inputs[i].value = '';
              inputs[i].focus();
              break;
            }
          }
        } else if (val === 'clear') {
          resetPinInputs();
        } else {
          for (let i = 0; i < inputs.length; i++) {
            if (!inputs[i].value) {
              inputs[i].value = val;
              if (i < inputs.length - 1) {
                inputs[i + 1].focus();
              } else {
                verifyEnteredPin();
              }
              break;
            }
          }
        }
      });
    });
  }

  function verifyEnteredPin() {
    const enteredPin = elements.pinInputs.map(i => i.value).join('');
    if (enteredPin.length < 6) return;

    const validPin = (window.APP_CONFIG && window.APP_CONFIG.ADMIN_PIN) ? String(window.APP_CONFIG.ADMIN_PIN) : '202688';

    if (enteredPin === validPin) {
      sessionStorage.setItem('sbk_admin_auth', 'true');
      if (typeof showToast === 'function') {
        showToast('Login Administrator Berhasil!', 'success');
      }
      showDashboard();
    } else {
      // Animasi Shake & Error
      if (elements.pinError) elements.pinError.classList.remove('hidden');
      elements.pinInputs.forEach(i => {
        i.classList.add('border-primary', 'bg-red-50');
      });

      const pinBox = document.getElementById('pinInputContainer');
      if (pinBox) {
        pinBox.classList.add('animate-shake');
        setTimeout(() => pinBox.classList.remove('animate-shake'), 600);
      }

      setTimeout(() => {
        resetPinInputs();
      }, 900);
    }
  }

  window.adminLogout = function() {
    sessionStorage.removeItem('sbk_admin_auth');
    if (typeof showToast === 'function') {
      showToast('Sesi Admin telah diakhiri.', 'info');
    }
    showPinModal();
  };

  // ============================================================================
  // LOAD & SYNC DATA (GOOGLE SHEETS / LOCALSTORAGE FALLBACK)
  // ============================================================================

  async function loadOrdersData() {
    showTableLoading(true);

    const sheetUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SHEET_URL : '';
    const isUrlConfigured = sheetUrl && sheetUrl !== 'PASTE_URL_WEB_APP_APPS_SCRIPT_DISINI' && sheetUrl.startsWith('http');

    if (isUrlConfigured) {
      try {
        const response = await fetch(sheetUrl, {
          method: 'GET',
          redirect: 'follow'
        });
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          allOrders = normalizeOrders(result.data);
          isCloudConnected = true;
          updateConnectionStatus(true);
          renderDashboard();
          showTableLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Gagal mengambil data dari Google Sheets:', err);
      }
    }

    // Fallback jika Google Sheets offline
    isCloudConnected = false;
    updateConnectionStatus(false);
    
    let localHistory = [];
    if (typeof window.getOrderHistory === 'function') {
      localHistory = window.getOrderHistory() || [];
    } else {
      try {
        const raw = localStorage.getItem('sw_order_history_v1') || localStorage.getItem('sw_last_order');
        if (raw) {
          const parsed = JSON.parse(raw);
          localHistory = Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch (e) {
        localHistory = [];
      }
    }

    allOrders = normalizeOrders(localHistory);
    renderDashboard();
    showTableLoading(false);
  }

  /**
   * Standardisasi struktur pesanan (Mendukung respon Apps Script EN & ID)
   */
  function normalizeOrders(rawList) {
    return rawList.map(item => {
      let rawItems = item.Items !== undefined ? item.Items : (item.items !== undefined ? item.items : '-');
      let itemsText = rawItems;
      if (Array.isArray(rawItems)) {
        itemsText = rawItems.map(i => `${i.name || 'Produk'} (${i.size || '150gr'}) x${i.qty || 1}`).join('; ');
      }

      const inv = item.Invoice || item.invoice || item.orderId || item.invoiceNumber || ('#SBK-' + Date.now());
      const custName = item.Nama || item.nama || item.customerName || item.name || 'Pelanggan';
      const phone = String(item.WhatsApp !== undefined ? item.WhatsApp : (item.whatsapp !== undefined ? item.whatsapp : (item.customerPhone || ''))).trim();
      const addr = item.Alamat || item.alamat || item.address || item.customerAddress || '-';
      const kurir = item.Kurir || item.kurir || item.shippingCourier || item.courierName || 'Kurir Standar';
      const bayar = item.MetodeBayar || item.metodeBayar || item.paymentMethod || item.paymentMethodName || 'Transfer Bank';
      const totalNum = Number(item.Total !== undefined ? item.Total : (item.totalAmount !== undefined ? item.totalAmount : (item.grandTotal || item.total || 0))) || 0;
      const statusStr = item.Status || item.status || 'Menunggu Konfirmasi';
      const tracking = item.Resi || item.resi || item.trackingNumber || '';
      const notesStr = item.Catatan || item.catatan || item.notes || [item.kitchenNote, item.giftCardNote ? `Kado: ${item.giftCardNote}` : ''].filter(Boolean).join(' | ') || '-';
      const timeStr = item.Waktu || item.waktu || item.createdAt || item.timestamp || new Date().toISOString();

      return {
        orderId: inv,
        invoiceNumber: inv,
        createdAt: timeStr,
        customerName: custName,
        whatsapp: phone,
        customerPhone: phone,
        address: addr,
        customerAddress: addr,
        customerCity: item.customerCity || '',
        items: itemsText || '-',
        rawItemsArray: Array.isArray(rawItems) ? rawItems : [],
        totalAmount: totalNum,
        grandTotal: totalNum,
        shippingCourier: kurir,
        courierName: kurir,
        paymentMethod: bayar,
        paymentMethodName: bayar,
        status: cleanStatus(statusStr),
        trackingNumber: tracking,
        notes: notesStr
      };
    });
  }

  function cleanStatus(status) {
    if (!status) return 'Menunggu Konfirmasi';
    const s = String(status).toLowerCase();
    if (s.includes('selesai') || s.includes('delivered') || s.includes('diterima')) return 'Selesai';
    if (s.includes('kirim') || s.includes('jalan') || s.includes('shipped')) return 'Dikirim';
    if (s.includes('proses') || s.includes('masak') || s.includes('dapur')) return 'Diproses';
    if (s.includes('batal') || s.includes('cancel')) return 'Dibatalkan';
    return 'Menunggu Konfirmasi';
  }

  function updateConnectionStatus(connected) {
    const isUrlConfigured = window.APP_CONFIG && window.APP_CONFIG.GOOGLE_SHEET_URL && window.APP_CONFIG.GOOGLE_SHEET_URL !== 'PASTE_URL_WEB_APP_APPS_SCRIPT_DISINI' && window.APP_CONFIG.GOOGLE_SHEET_URL.startsWith('http');

    if (elements.connectionBadge) {
      if (connected || isUrlConfigured) {
        elements.connectionBadge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
            <span class="w-2 h-2 rounded-full bg-green-600 ${connected ? 'animate-pulse' : ''}"></span>
            <span>Google Sheets Terhubung</span>
          </span>
        `;
      } else {
        elements.connectionBadge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Penyimpanan Lokal</span>
          </span>
        `;
      }
    }
  }

  function showTableLoading(loading) {
    if (!elements.ordersTableBody) return;
    if (loading) {
      elements.ordersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-on-surface-variant">
            <div class="inline-flex items-center gap-3">
              <span class="material-symbols-outlined animate-spin text-primary text-2xl">sync</span>
              <span class="text-sm font-semibold">Memuat data pesanan...</span>
            </div>
          </td>
        </tr>
      `;
    }
  }

  // ============================================================================
  // RENDER DASHBOARD & STATS
  // ============================================================================

  function renderDashboard() {
    renderStatistics();
    applyFilterAndSort();
  }

  function renderStatistics() {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const needProcess = allOrders.filter(o => o.status === 'Menunggu Konfirmasi' || o.status === 'Diproses').length;
    const completed = allOrders.filter(o => o.status === 'Selesai').length;

    if (elements.statTotalOrders) elements.statTotalOrders.textContent = totalOrders.toLocaleString('id-ID');
    if (elements.statTotalRevenue) elements.statTotalRevenue.textContent = formatRupiah(totalRevenue);
    if (elements.statNeedProcess) elements.statNeedProcess.textContent = needProcess.toLocaleString('id-ID');
    if (elements.statCompleted) elements.statCompleted.textContent = completed.toLocaleString('id-ID');

    // Update Counter di Filter Pills
    updateFilterBadgeCounts();
  }

  function updateFilterBadgeCounts() {
    const counts = {
      all: allOrders.length,
      'Menunggu Konfirmasi': allOrders.filter(o => o.status === 'Menunggu Konfirmasi').length,
      'Diproses': allOrders.filter(o => o.status === 'Diproses').length,
      'Dikirim': allOrders.filter(o => o.status === 'Dikirim').length,
      'Selesai': allOrders.filter(o => o.status === 'Selesai').length
    };

    elements.filterPills.forEach(pill => {
      const filterKey = pill.getAttribute('data-filter');
      const badge = pill.querySelector('.filter-count');
      if (badge && counts[filterKey] !== undefined) {
        badge.textContent = counts[filterKey];
      }
    });
  }

  function applyFilterAndSort() {
    filteredOrders = allOrders.filter(order => {
      // 1. Status Filter
      if (currentFilter !== 'all' && order.status !== currentFilter) {
        return false;
      }

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = order.invoiceNumber.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchPhone = order.customerPhone.toLowerCase().includes(q);
        const matchItems = order.items.toLowerCase().includes(q);
        if (!matchInvoice && !matchName && !matchPhone && !matchItems) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filteredOrders.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return currentSort === 'desc' ? timeB - timeA : timeA - timeB;
    });

    renderTable();
  }

  function renderTable() {
    if (!elements.ordersTableBody) return;

    if (elements.orderCountLabel) {
      elements.orderCountLabel.textContent = `Menampilkan ${filteredOrders.length} dari ${allOrders.length} pesanan`;
    }

    if (filteredOrders.length === 0) {
      elements.ordersTableBody.innerHTML = '';
      if (elements.emptyState) elements.emptyState.classList.remove('hidden');
      return;
    }

    if (elements.emptyState) elements.emptyState.classList.add('hidden');

    const rowsHtml = filteredOrders.map(order => {
      const statusBadge = getStatusBadgeHtml(order.status);
      const cleanWa = order.whatsapp.replace(/\D/g, '');
      const waNumberFormatted = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
      const waMessage = encodeURIComponent(
        `Halo kak ${order.customerName}, konfirmasi pesanan Sambal by Kazel (${order.invoiceNumber}). Status pesanan saat ini: ${order.status}. Terima kasih!`
      );
      const waUrl = `https://wa.me/${waNumberFormatted}?text=${waMessage}`;

      return `
        <tr class="hover:bg-surface-container-low/60 transition-colors border-b border-outline-variant/30 text-xs sm:text-sm">
          <!-- Waktu Masuk -->
          <td class="py-3.5 px-4 whitespace-nowrap text-on-surface-variant font-medium">
            <div>${formatDateIndo(order.createdAt)}</div>
          </td>

          <!-- No. Invoice -->
          <td class="py-3.5 px-4 whitespace-nowrap">
            <div class="flex items-center gap-1.5 font-bold text-on-surface font-mono">
              <span>${order.invoiceNumber}</span>
              <button onclick="copyToClipboard('${order.invoiceNumber}')" class="p-1 hover:text-primary rounded text-on-surface-variant transition-colors" title="Salin No. Invoice">
                <span class="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </td>

          <!-- Pelanggan & WA -->
          <td class="py-3.5 px-4">
            <div class="font-bold text-on-surface text-sm">${escapeHtml(order.customerName)}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-on-surface-variant font-mono">${escapeHtml(order.customerPhone || '-')}</span>
              ${order.customerPhone ? `
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                  <span class="material-symbols-outlined text-xs text-green-600">chat</span>
                  <span>WA</span>
                </a>
              ` : ''}
            </div>
          </td>

          <!-- Detail Item -->
          <td class="py-3.5 px-4 max-w-xs">
            <div class="line-clamp-2 text-xs text-on-surface leading-relaxed">${escapeHtml(order.items)}</div>
            ${order.notes && order.notes !== '-' ? `
              <div class="text-[11px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block border border-amber-200/60 line-clamp-1">
                Catatan: ${escapeHtml(order.notes)}
              </div>
            ` : ''}
          </td>

          <!-- Alamat & Kurir -->
          <td class="py-3.5 px-4 max-w-xs">
            <div class="text-xs text-on-surface-variant line-clamp-2">${escapeHtml(order.address)}</div>
            <div class="flex items-center gap-1 mt-1 text-[11px] font-semibold text-on-surface">
              <span class="material-symbols-outlined text-xs text-primary">local_shipping</span>
              <span>${escapeHtml(order.shippingCourier)}</span>
            </div>
          </td>

          <!-- No. Resi (Kolom L) -->
          <td class="py-3.5 px-4 whitespace-nowrap">
            <div class="flex items-center gap-1.5 min-w-[170px]">
              <input 
                type="text" 
                id="rowResi_${order.invoiceNumber}" 
                value="${escapeHtml(order.trackingNumber || '')}" 
                placeholder="Ketik No. Resi..." 
                class="w-full text-xs font-mono font-bold rounded-lg border border-outline-variant/60 py-1.5 px-2.5 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              >
              <button 
                type="button" 
                onclick="saveResiAndShip('${order.invoiceNumber}')" 
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold transition-all shrink-0 shadow-2xs active:scale-95" 
                title="Simpan No. Resi & Ubah Status ke 'Dikirim'"
              >
                <span class="material-symbols-outlined text-sm">local_shipping</span>
                <span class="hidden xl:inline">Kirim</span>
              </button>
            </div>
          </td>

          <!-- Total Bayar -->
          <td class="py-3.5 px-4 whitespace-nowrap">
            <div class="font-extrabold text-primary text-sm">${formatRupiah(order.totalAmount)}</div>
            <div class="text-[11px] text-on-surface-variant mt-0.5">${escapeHtml(order.paymentMethod)}</div>
          </td>

          <!-- Status & Aksi -->
          <td class="py-3.5 px-4 whitespace-nowrap text-right">
            <div class="flex items-center justify-end gap-2">
              <div class="relative inline-block text-left">
                <select onchange="handleDropdownStatusChange('${order.invoiceNumber}', this.value)" class="text-xs font-bold rounded-lg border border-outline-variant/60 py-1.5 pl-2.5 pr-7 bg-surface-container-lowest text-on-surface hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors shadow-2xs">
                  <option value="Menunggu Konfirmasi" ${order.status === 'Menunggu Konfirmasi' ? 'selected' : ''}>⏳ Menunggu Konfirmasi</option>
                  <option value="Diproses" ${order.status === 'Diproses' ? 'selected' : ''}>🍳 Diproses di Dapur</option>
                  <option value="Dikirim" ${order.status === 'Dikirim' ? 'selected' : ''}>🚚 Dikirim Kurir</option>
                  <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>✅ Selesai</option>
                  <option value="Dibatalkan" ${order.status === 'Dibatalkan' ? 'selected' : ''}>❌ Dibatalkan</option>
                </select>
              </div>

              <button onclick="openOrderDetailModal('${order.invoiceNumber}')" class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors" title="Lihat Detail Pesanan">
                <span class="material-symbols-outlined text-base">visibility</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    elements.ordersTableBody.innerHTML = rowsHtml;
  }

  function getStatusBadgeHtml(status) {
    switch (status) {
      case 'Selesai':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">✅ Selesai</span>';
      case 'Dikirim':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">🚚 Dikirim</span>';
      case 'Diproses':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">🍳 Diproses</span>';
      case 'Dibatalkan':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">❌ Dibatalkan</span>';
      default:
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">⏳ Menunggu Konfirmasi</span>';
    }
  }

  // ============================================================================
  // UPDATE STATUS & RESI (GOOGLE SHEETS & LOCAL STORAGE)
  // ============================================================================

  window.handleDropdownStatusChange = function(invoiceNumber, newStatus) {
    const resiInput = document.getElementById(`rowResi_${invoiceNumber}`);
    const existingResi = resiInput ? resiInput.value.trim() : '';

    if (newStatus === 'Dikirim' && !existingResi) {
      const prompted = prompt(`Pesanan ${invoiceNumber} diubah ke status "Dikirim". Masukkan Nomor Resi Ekspedisi:`, '');
      if (prompted !== null && prompted.trim()) {
        const cleanPrompted = prompted.trim();
        if (resiInput) resiInput.value = cleanPrompted;
        window.updateOrderStatus(invoiceNumber, newStatus, cleanPrompted);
      } else {
        // Kembalikan tampilan jika batal
        renderTable();
      }
      return;
    }

    window.updateOrderStatus(invoiceNumber, newStatus, existingResi);
  };

  window.saveResiAndShip = function(invoiceNumber) {
    const resiInput = document.getElementById(`rowResi_${invoiceNumber}`);
    const resiVal = resiInput ? resiInput.value.trim() : '';

    if (!resiVal) {
      if (typeof showToast === 'function') {
        showToast('Ketikkan nomor resi sebelum mengubah status ke Dikirim!', 'error');
      }
      if (resiInput) resiInput.focus();
      return;
    }

    window.updateOrderStatus(invoiceNumber, 'Dikirim', resiVal);
  };

  window.updateOrderStatus = async function(invoiceNumber, newStatus, optionalResi) {
    const order = allOrders.find(o => o.invoiceNumber === invoiceNumber);
    if (!order) return;

    order.status = newStatus;
    if (optionalResi !== undefined && optionalResi !== null) {
      order.trackingNumber = optionalResi;
      order.noResi = optionalResi;
    }

    // 1. Simpan ke LocalStorage agar state persist
    saveUpdatedOrderToLocalStorage(order);

    // 2. Render ulang UI lokal seketika
    renderDashboard();

    const resiInfo = order.trackingNumber ? ` (Resi: ${order.trackingNumber})` : '';
    if (typeof showToast === 'function') {
      showToast(`Pesanan ${invoiceNumber} diubah ke '${newStatus}'${resiInfo}`, 'success');
    }

    // 3. Kirim update ke Google Sheets (Simpan Status Kolom K & NoResi Kolom L secara bersamaan)
    const sheetUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SHEET_URL : '';
    const isUrlConfigured = sheetUrl && sheetUrl !== 'PASTE_URL_WEB_APP_APPS_SCRIPT_DISINI' && sheetUrl.startsWith('http');

    if (isUrlConfigured) {
      try {
        const payload = {
          action: 'updateStatus',
          orderId: invoiceNumber,
          invoice: invoiceNumber,
          invoiceNumber: invoiceNumber,
          status: newStatus,
          noResi: order.trackingNumber || '',
          trackingNumber: order.trackingNumber || '',
          resi: order.trackingNumber || ''
        };

        // Kirim request POST ke Apps Script
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Gagal sync update status ke Google Sheets:', err);
      }
    }
  };

  function saveUpdatedOrderToLocalStorage(updatedOrder) {
    try {
      let history = [];
      if (typeof window.getOrderHistory === 'function') {
        history = window.getOrderHistory() || [];
      } else {
        const raw = localStorage.getItem('sw_order_history_v1');
        history = raw ? JSON.parse(raw) : [];
      }

      const idx = history.findIndex(o => o.invoiceNumber === updatedOrder.invoiceNumber);
      if (idx !== -1) {
        history[idx].status = updatedOrder.status;
        history[idx].trackingNumber = updatedOrder.trackingNumber || '';
        history[idx].noResi = updatedOrder.trackingNumber || '';
      } else {
        history.unshift(updatedOrder);
      }

      localStorage.setItem('sw_order_history_v1', JSON.stringify(history));

      // Update juga sw_last_order jika invoice sama
      try {
        const lastRaw = localStorage.getItem('sw_last_order');
        if (lastRaw) {
          const lastOrder = JSON.parse(lastRaw);
          if (lastOrder && (lastOrder.invoiceNumber === updatedOrder.invoiceNumber || lastOrder.orderId === updatedOrder.invoiceNumber)) {
            lastOrder.status = updatedOrder.status;
            lastOrder.trackingNumber = updatedOrder.trackingNumber || '';
            lastOrder.noResi = updatedOrder.trackingNumber || '';
            localStorage.setItem('sw_last_order', JSON.stringify(lastOrder));
          }
        }
      } catch (le) {}
    } catch (e) {
      console.error('Error saving updated order to localStorage:', e);
    }
  }

  // ============================================================================
  // ORDER DETAIL MODAL
  // ============================================================================

  window.openOrderDetailModal = function(invoiceNumber) {
    const order = allOrders.find(o => o.invoiceNumber === invoiceNumber);
    if (!order || !elements.detailModal || !elements.detailContent) return;

    activeOrderDetail = order;

    const cleanWa = order.whatsapp.replace(/\D/g, '');
    const waNumberFormatted = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
    const waUrl = `https://wa.me/${waNumberFormatted}?text=${encodeURIComponent('Halo kak ' + order.customerName + ', konfirmasi pesanan Sambal by Kazel ' + order.invoiceNumber)}`;

    elements.detailContent.innerHTML = `
      <div class="space-y-6 text-on-surface">
        <!-- Header Info -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/40">
          <div>
            <span class="text-xs text-on-surface-variant">Nomor Invoice</span>
            <div class="text-xl font-extrabold font-mono text-primary">${order.invoiceNumber}</div>
            <div class="text-xs text-on-surface-variant mt-0.5">${formatDateIndo(order.createdAt)}</div>
          </div>
          <div>
            ${getStatusBadgeHtml(order.status)}
          </div>
        </div>

        <!-- Pelanggan & Alamat -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/70 p-4 rounded-xl border border-outline-variant/30 text-xs">
          <div>
            <div class="font-bold text-on-surface text-sm mb-1">${escapeHtml(order.customerName)}</div>
            <div class="text-on-surface-variant mb-2">WhatsApp: <span class="font-mono font-semibold">${escapeHtml(order.customerPhone || '-')}</span></div>
            ${order.customerPhone ? `
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-2xs">
                <span class="material-symbols-outlined text-sm">chat</span>
                <span>Chat Pelanggan di WhatsApp</span>
              </a>
            ` : ''}
          </div>
          <div>
            <div class="font-bold text-on-surface mb-1">Alamat Tujuan Pengiriman:</div>
            <div class="text-on-surface-variant leading-relaxed">${escapeHtml(order.address)}</div>
            <div class="mt-2 font-semibold text-primary">Kurir: ${escapeHtml(order.shippingCourier)}</div>
          </div>
        </div>

        <!-- Detail Item Pesanan -->
        <div>
          <h4 class="font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2.5">Daftar Menu yang Dipesan</h4>
          <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4 divide-y divide-outline-variant/30 text-xs sm:text-sm">
            <div class="py-2 text-on-surface font-medium leading-relaxed">
              ${escapeHtml(order.items).split(';').map(i => `<div class="py-1 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-primary">check_circle</span> <span>${i.trim()}</span></div>`).join('')}
            </div>
            ${order.notes && order.notes !== '-' ? `
              <div class="pt-3 text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-lg mt-2">
                <span class="font-bold">Catatan Khusus:</span> ${escapeHtml(order.notes)}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Input No Resi & Status Update Langsung -->
        <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/40 space-y-3">
          <h4 class="font-bold text-xs uppercase tracking-wider text-on-surface">Update Pesanan Cepat</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-1">Ubah Status:</label>
              <select id="modalStatusSelect" class="w-full text-xs font-bold rounded-lg border border-outline-variant/60 py-2 px-3 bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary">
                <option value="Menunggu Konfirmasi" ${order.status === 'Menunggu Konfirmasi' ? 'selected' : ''}>Menunggu Konfirmasi</option>
                <option value="Diproses" ${order.status === 'Diproses' ? 'selected' : ''}>Diproses di Dapur</option>
                <option value="Dikirim" ${order.status === 'Dikirim' ? 'selected' : ''}>Dikirim Kurir</option>
                <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                <option value="Dibatalkan" ${order.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-1">Nomor Resi Pengiriman:</label>
              <input type="text" id="modalResiInput" value="${escapeHtml(order.trackingNumber || '')}" placeholder="Contoh: JNE89123441" class="w-full text-xs rounded-lg border border-outline-variant/60 py-2 px-3 bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary">
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <button onclick="saveModalOrderChanges('${order.invoiceNumber}')" class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold transition-colors shadow-2xs">
              Simpan Perubahan
            </button>
          </div>
        </div>

        <!-- Total Tagihan -->
        <div class="flex items-center justify-between pt-2 border-t border-outline-variant/40">
          <div class="text-xs text-on-surface-variant">Metode: <span class="font-semibold text-on-surface">${escapeHtml(order.paymentMethod)}</span></div>
          <div class="text-right">
            <div class="text-xs text-on-surface-variant">Total Pembayaran</div>
            <div class="text-xl font-black text-primary">${formatRupiah(order.totalAmount)}</div>
          </div>
        </div>
      </div>
    `;

    elements.detailModal.classList.remove('hidden');
    elements.detailModal.classList.add('flex');
  };

  window.closeOrderDetailModal = function() {
    if (elements.detailModal) {
      elements.detailModal.classList.add('hidden');
      elements.detailModal.classList.remove('flex');
    }
    activeOrderDetail = null;
  };

  window.saveModalOrderChanges = function(invoiceNumber) {
    const statusSelect = document.getElementById('modalStatusSelect');
    const resiInput = document.getElementById('modalResiInput');
    if (!statusSelect) return;

    const newStatus = statusSelect.value;
    const newResi = resiInput ? resiInput.value.trim() : '';

    window.updateOrderStatus(invoiceNumber, newStatus, newResi);
    window.closeOrderDetailModal();
  };

  // ============================================================================
  // EXPORT CSV & SEARCH / FILTER LISTENERS
  // ============================================================================

  window.exportOrdersToCSV = function() {
    if (!filteredOrders.length) {
      if (typeof showToast === 'function') showToast('Tidak ada data pesanan untuk diekspor.', 'warning');
      return;
    }

    const headers = ['Waktu', 'No Invoice', 'Nama Pelanggan', 'WhatsApp', 'Alamat', 'Item Pesanan', 'Total Bayar', 'Kurir', 'Pembayaran', 'Status', 'Resi', 'Catatan'];
    const rows = filteredOrders.map(o => [
      `"${o.createdAt}"`,
      `"${o.invoiceNumber}"`,
      `"${o.customerName}"`,
      `"'${o.customerPhone}"`,
      `"${(o.address || '').replace(/"/g, '""')}"`,
      `"${(o.items || '').replace(/"/g, '""')}"`,
      o.totalAmount,
      `"${o.shippingCourier}"`,
      `"${o.paymentMethod}"`,
      `"${o.status}"`,
      `"${o.trackingNumber}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pesanan_Sambal_by_Kazel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') {
      showToast('Data berhasil diekspor ke file CSV!', 'success');
    }
  };

  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') {
        showToast(`Tersalin: ${text}`, 'info');
      }
    });
  };

  function setupFilterAndSearchListeners() {
    // Search input
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyFilterAndSort();
      });
    }

    // Filter pills
    elements.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.filterPills.forEach(p => {
          p.classList.remove('bg-primary', 'text-white', 'shadow-xs');
          p.classList.add('bg-surface-container-lowest', 'text-on-surface-variant');
        });
        pill.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant');
        pill.classList.add('bg-primary', 'text-white', 'shadow-xs');

        currentFilter = pill.getAttribute('data-filter');
        applyFilterAndSort();
      });
    });

    // Sort select
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilterAndSort();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('adminRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadOrdersData();
        if (typeof showToast === 'function') {
          showToast('Menyinkronkan data pesanan...', 'info');
        }
      });
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

  // Inisialisasi saat Halaman Dimuat
  document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    setupPinListeners();
    setupFilterAndSearchListeners();
    checkAuth();
  });

})();
