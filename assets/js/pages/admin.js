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
  let syncTimer = null;
  let isSyncing = false;
  let lastDataFingerprint = '';
  let lastSyncTimeFormatted = '';

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
   * Parse Tanggal dari Berbagai Format (ISO, Spreadsheet DD/MM/YYYY, Timestamp)
   */
  function parseOrderDate(dateVal) {
    if (!dateVal) return new Date();
    if (dateVal instanceof Date) return dateVal;
    const s = String(dateVal).trim();
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const hour = parseInt(dmyMatch[4] || '0', 10);
      const min = parseInt(dmyMatch[5] || '0', 10);
      const sec = parseInt(dmyMatch[6] || '0', 10);
      return new Date(year, month, day, hour, min, sec);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  /**
   * Format Tanggal & Jam Indonesia
   */
  function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = parseOrderDate(dateStr);
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
  // ============================================================================
  // PIN LOCK, SERVER AUTH & ANTI-BRUTEFORCE MANAGEMENT
  // ============================================================================

  const BRUTEFORCE_LOCKOUT_KEY = 'sbk_admin_lockout';
  const BRUTEFORCE_ATTEMPTS_KEY = 'sbk_admin_attempts';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // Cooldown 5 menit
  let lockoutTimer = null;
  let isVerifyingPin = false;

  // Bersihkan lockout sisa kegagalan sebelumnya saat script dimuat agar admin bisa langsung login
  try {
    localStorage.removeItem(BRUTEFORCE_LOCKOUT_KEY);
    localStorage.removeItem(BRUTEFORCE_ATTEMPTS_KEY);
  } catch (e) {}

  function isAuthenticated() {
    return sessionStorage.getItem('sbk_admin_auth') === 'true' && !!sessionStorage.getItem('sbk_admin_token');
  }

  function checkAuth() {
    if (isAuthenticated()) {
      showDashboard();
    } else {
      showPinModal();
    }
  }

  function getLockoutRemainingMs() {
    const until = parseInt(localStorage.getItem(BRUTEFORCE_LOCKOUT_KEY), 10);
    if (!until || isNaN(until)) return 0;
    const remaining = until - Date.now();
    if (remaining <= 0) {
      localStorage.removeItem(BRUTEFORCE_LOCKOUT_KEY);
      localStorage.removeItem(BRUTEFORCE_ATTEMPTS_KEY);
      return 0;
    }
    return remaining;
  }

  function formatRemainingTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min} menit ${sec < 10 ? '0' : ''}${sec} detik`;
  }

  function setInputsDisabled(disabled) {
    elements.pinInputs.forEach(i => {
      i.disabled = disabled;
      if (disabled) i.classList.add('opacity-50', 'cursor-not-allowed');
      else i.classList.remove('opacity-50', 'cursor-not-allowed');
    });
    const keypadButtons = document.querySelectorAll('[data-keypad-val]');
    keypadButtons.forEach(btn => {
      btn.disabled = disabled;
      if (disabled) btn.classList.add('opacity-50', 'cursor-not-allowed');
      else btn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
  }

  function showPinError(message) {
    if (!elements.pinError) return;
    const textSpan = elements.pinError.querySelector('span:last-child') || elements.pinError;
    textSpan.textContent = message;
    elements.pinError.classList.remove('hidden');
    elements.pinError.classList.add('flex');
  }

  function checkLockoutState() {
    if (lockoutTimer) {
      clearInterval(lockoutTimer);
      lockoutTimer = null;
    }

    const remaining = getLockoutRemainingMs();
    if (remaining > 0) {
      setInputsDisabled(true);
      showPinError(`Terlalu banyak percobaan gagal. Akses terkunci selama ${formatRemainingTime(remaining)}.`);

      lockoutTimer = setInterval(() => {
        const rem = getLockoutRemainingMs();
        if (rem <= 0) {
          clearInterval(lockoutTimer);
          lockoutTimer = null;
          setInputsDisabled(false);
          resetPinInputs();
          if (typeof showToast === 'function') {
            showToast('Masa cooldown selesai. Silakan masukkan PIN kembali.', 'info');
          }
        } else {
          showPinError(`Terlalu banyak percobaan gagal. Akses terkunci selama ${formatRemainingTime(rem)}.`);
        }
      }, 1000);
      return true;
    } else {
      setInputsDisabled(false);
      return false;
    }
  }

  function showPinModal() {
    if (elements.pinModal) {
      elements.pinModal.classList.remove('hidden');
      elements.pinModal.classList.add('flex');
    }
    if (elements.dashboardContent) {
      elements.dashboardContent.classList.add('hidden');
      elements.dashboardContent.classList.remove('flex');
    }
    resetPinInputs();
    checkLockoutState();
  }

  function showDashboard() {
    if (elements.pinModal) {
      elements.pinModal.classList.add('hidden');
      elements.pinModal.classList.remove('flex');
    }
    if (elements.dashboardContent) {
      elements.dashboardContent.classList.remove('hidden');
      elements.dashboardContent.classList.add('flex');
    }
    loadOrdersData(false);
    startRealtimeSync();
  }

  function resetPinInputs() {
    elements.pinInputs.forEach(input => {
      input.value = '';
      input.classList.remove('border-primary', 'bg-primary-fixed/40');
    });
    if (elements.pinError) {
      elements.pinError.classList.add('hidden');
      elements.pinError.classList.remove('flex');
    }
    if (elements.pinInputs[0] && getLockoutRemainingMs() <= 0) {
      setTimeout(() => elements.pinInputs[0].focus(), 150);
    }
  }

  function setupPinListeners() {
    const inputs = elements.pinInputs;

    inputs.forEach((input, index) => {
      // Input angka saja
      input.addEventListener('input', (e) => {
        if (getLockoutRemainingMs() > 0 || isVerifyingPin) {
          e.target.value = '';
          return;
        }
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';

        if (e.target.value) {
          if (index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else {
            verifyEnteredPin();
          }
        }
      });

      // Handle Backspace
      input.addEventListener('keydown', (e) => {
        if (getLockoutRemainingMs() > 0 || isVerifyingPin) return;
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        } else if (e.key === 'Enter') {
          verifyEnteredPin();
        }
      });

      // Handle Paste 6 digit
      input.addEventListener('paste', (e) => {
        if (getLockoutRemainingMs() > 0 || isVerifyingPin) return;
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
        if (getLockoutRemainingMs() > 0 || isVerifyingPin) return;
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

  async function verifyEnteredPin() {
    if (isVerifyingPin) return;

    const enteredPin = elements.pinInputs.map(i => i.value).join('');
    if (enteredPin.length < 6) return;

    isVerifyingPin = true;
    setInputsDisabled(true);
    showPinError('Memverifikasi PIN keamanan ke server...');

    const adminEndpoint = (window.APP_CONFIG && window.APP_CONFIG.ADMIN_ENDPOINT) || '/api/admin';

    try {
      const response = await fetch(adminEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          pin: enteredPin
        })
      });

      const result = await response.json();

      if (response.ok && result.success && result.token) {
        // Autentikasi server berhasil
        localStorage.removeItem(BRUTEFORCE_LOCKOUT_KEY);
        localStorage.removeItem(BRUTEFORCE_ATTEMPTS_KEY);
        sessionStorage.setItem('sbk_admin_token', result.token);
        sessionStorage.setItem('sbk_admin_auth', 'true');
        setInputsDisabled(false);

        if (typeof showToast === 'function') {
          showToast('Login Administrator Berhasil!', 'success');
        }
        showDashboard();
        return;
      } else {
        handleFailedAuth(result.message || 'PIN yang Anda masukkan salah');
      }
    } catch (err) {
      console.warn('Verifikasi server gagal terhubung:', err);
      handleFailedAuth('Gagal menghubungi server verifikasi admin');
    } finally {
      isVerifyingPin = false;
      setInputsDisabled(false);
    }
  }

  function handleFailedAuth(errorMsg) {
    const rawAttempts = localStorage.getItem(BRUTEFORCE_ATTEMPTS_KEY);
    let attempts = (parseInt(rawAttempts, 10) || 0) + 1;

    // Animasi Shake & Highlight
    const pinBox = document.getElementById('pinInputContainer');
    if (pinBox) {
      pinBox.classList.add('animate-shake');
      setTimeout(() => pinBox.classList.remove('animate-shake'), 600);
    }
    elements.pinInputs.forEach(i => {
      i.classList.add('border-primary', 'bg-primary-fixed/40');
    });

    if (attempts >= MAX_ATTEMPTS) {
      const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(BRUTEFORCE_LOCKOUT_KEY, String(lockoutEnd));
      localStorage.removeItem(BRUTEFORCE_ATTEMPTS_KEY);
      checkLockoutState();
    } else {
      localStorage.setItem(BRUTEFORCE_ATTEMPTS_KEY, String(attempts));
      const remainingAttempts = MAX_ATTEMPTS - attempts;
      showPinError(`${errorMsg}. Sisa percobaan: ${remainingAttempts}x.`);
      setInputsDisabled(false);
      setTimeout(() => {
        resetPinInputs();
      }, 900);
    }
  }

  window.adminLogout = function() {
    stopRealtimeSync();
    sessionStorage.removeItem('sbk_admin_auth');
    sessionStorage.removeItem('sbk_admin_token');
    if (typeof showToast === 'function') {
      showToast('Sesi Admin telah diakhiri (Logout).', 'info');
    }
    showPinModal();
  };

  // ============================================================================
  // LOAD & REALTIME TWO-WAY SYNC (GOOGLE SHEETS & LOCAL STORAGE)
  // ============================================================================

  function computeFingerprint(list) {
    if (!Array.isArray(list)) return '';
    return list.map(item => {
      const inv = item.Invoice || item.invoice || item.orderId || item.invoiceNumber || '';
      const st = item.Status || item.status || '';
      const resi = item.NoResi || item.noResi || item.Resi || item.resi || item.trackingNumber || '';
      const tot = item.Total || item.total || item.totalAmount || '';
      const upd = item.updatedAt || item['Terakhir Diperbarui'] || '';
      return `${inv}:${st}:${resi}:${tot}:${upd}`;
    }).join('|');
  }

  async function loadOrdersData(isBackground = false) {
    if (isSyncing) return;
    isSyncing = true;

    const refreshIcon = document.querySelector('#adminRefreshBtn .material-symbols-outlined');
    if (refreshIcon) refreshIcon.classList.add('animate-spin');

    // Hanya tampilkan loader penuh jika belum ada data sama sekali dan bukan background sync
    if (!isBackground && allOrders.length === 0) {
      showTableLoading(true);
    }

    const adminEndpoint = (window.APP_CONFIG && window.APP_CONFIG.ADMIN_ENDPOINT) || '/api/admin';
    const adminToken = sessionStorage.getItem('sbk_admin_token') || '';

    try {
      const fetchUrl = adminEndpoint + '?action=getOrders&_t=' + Date.now();
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + adminToken,
          'X-Admin-Token': adminToken,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.status === 401 || response.status === 403) {
        if (typeof showToast === 'function') {
          showToast('Sesi administrator telah habis. Silakan login kembali.', 'error');
        }
        window.adminLogout();
        return;
      }

      const result = await response.json();

      if (result && (result.success || result.status === 'success') && Array.isArray(result.data)) {
        const newFingerprint = computeFingerprint(result.data);
        const hasChanged = newFingerprint !== lastDataFingerprint;

        const now = new Date();
        lastSyncTimeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

        if (hasChanged || allOrders.length === 0) {
          // Ambil elemen input yang sedang difokuskan pengguna (agar tidak hilang ketikannya)
          const activeEl = document.activeElement;
          const activeId = (activeEl && activeEl.tagName === 'INPUT') ? activeEl.id : null;
          const activeVal = activeId ? activeEl.value : null;

          allOrders = normalizeOrders(result.data);
          lastDataFingerprint = newFingerprint;
          isCloudConnected = true;
          updateConnectionStatus(true, lastSyncTimeFormatted);
          renderDashboard();

          // Kembalikan nilai & fokus input jika pengguna sedang mengetik nomor resi
          if (activeId && activeVal !== null) {
            const restoredEl = document.getElementById(activeId);
            if (restoredEl) {
              restoredEl.value = activeVal;
              restoredEl.focus();
            }
          }

          if (isBackground && typeof showToast === 'function') {
            showToast('Data otomatis tersinkron dari database!', 'info');
          }
        } else {
          isCloudConnected = true;
          updateConnectionStatus(true, lastSyncTimeFormatted);
        }

        showTableLoading(false);
        if (refreshIcon) refreshIcon.classList.remove('animate-spin');
        isSyncing = false;
        return;
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data dari admin backend API:', err);
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
    lastDataFingerprint = computeFingerprint(localHistory);
    renderDashboard();
    showTableLoading(false);
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    isSyncing = false;
  }

  function startRealtimeSync() {
    stopRealtimeSync();
    // Sinkronisasi otomatis setiap 8 detik di latar belakang
    syncTimer = setInterval(() => {
      if (!document.hidden && sessionStorage.getItem('sbk_admin_auth') === 'true' && !isSyncing) {
        loadOrdersData(true);
      }
    }, 8000);
  }

  function stopRealtimeSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  /**
   * Standardisasi struktur pesanan (Mendukung respon Apps Script EN & ID)
   */
  function normalizeOrders(rawList) {
    return rawList.map(item => {
      let rawItems = item.Items !== undefined ? item.Items : (item.items !== undefined ? item.items : '-');
      let itemsText = rawItems;
      if (Array.isArray(rawItems)) {
        itemsText = rawItems.map(i => `• ${i.name || 'Produk'}${i.size ? ' (' + i.size + ')' : ''} (${i.qty || 1}x)`).join('\n');
      }

      const rawInv = String(item.Invoice || item.invoice || item.orderId || item.invoiceNumber || ('#SBK-' + Date.now())).trim();
      const inv = rawInv.replace(/[^a-zA-Z0-9_\-#]/g, '');
      const custName = item.Nama || item.nama || item.customerName || item.name || 'Pelanggan';
      const phone = String(item.WhatsApp !== undefined ? item.WhatsApp : (item.whatsapp !== undefined ? item.whatsapp : (item.customerPhone || ''))).trim();
      const addr = item.Alamat || item.alamat || item.address || item.customerAddress || '-';
      const kurir = item.Kurir || item.kurir || item.shippingCourier || item.courierName || 'Kurir Standar';
      const bayar = item.MetodeBayar || item.metodeBayar || item.paymentMethod || item.paymentMethodName || 'Transfer Bank';
      const totalNum = Number(item.Total !== undefined ? item.Total : (item.totalAmount !== undefined ? item.totalAmount : (item.grandTotal || item.total || 0))) || 0;
      const statusStr = item.Status || item.status || 'Menunggu Pembayaran';
      const tracking = item.NoResi || item.noResi || item.Resi || item.resi || item.trackingNumber || '';
      const proofStr = item.BuktiBayar || item.buktiBayar || item.paymentProofUrl || '';
      const notesStr = item.Catatan || item.catatan || item.notes || [item.kitchenNote, item.giftCardNote ? `Kado: ${item.giftCardNote}` : ''].filter(Boolean).join(' | ') || '-';
      const timeStr = item.Waktu || item.waktu || item.createdAt || item.timestamp || new Date().toISOString();
      const updStr = item.updatedAt || item['Terakhir Diperbarui'] || '';

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
        noResi: tracking,
        notes: notesStr,
        updatedAt: updStr,
        buktiBayar: proofStr,
        paymentProofUrl: proofStr
      };
    });
  }

  function cleanStatus(status) {
    if (!status) return 'Menunggu Pembayaran';
    const s = String(status).toLowerCase();
    if (s.includes('selesai') || s.includes('delivered') || s.includes('diterima')) return 'Selesai';
    if (s.includes('kirim') || s.includes('jalan') || s.includes('shipped')) return 'Dikirim';
    if (s.includes('proses') || s.includes('masak') || s.includes('dapur')) return 'Diproses';
    if (s.includes('verifikasi')) return 'Menunggu Verifikasi';
    if (s.includes('bayar')) return 'Menunggu Pembayaran';
    if (s.includes('konfirmasi')) return 'Menunggu Konfirmasi';
    if (s.includes('batal') || s.includes('cancel')) return 'Dibatalkan';
    return status;
  }

  function updateConnectionStatus(connected, lastSyncTime) {
    const isUrlConfigured = true; // Terhubung via Cloudflare Pages Functions /api/admin

    if (elements.connectionBadge) {
      if (connected || isUrlConfigured) {
        const timeHtml = lastSyncTime ? `<span class="text-[10px] text-green-700/80 font-mono hidden sm:inline">(${lastSyncTime})</span>` : '';
        elements.connectionBadge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-2xs" title="Sinkronisasi dua arah aktif setiap 8 detik">
            <span class="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
            <span>Realtime Sync Aktif</span>
            ${timeHtml}
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
          <td colspan="8" class="py-12 text-center text-on-surface-variant">
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
    renderKitchenProductionSummary();
    if (activeAdminTab === 'analytics') {
      renderAnalytics();
    }
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

    const drawerBadge = document.getElementById('drawerBadgeOrders');
    if (drawerBadge) drawerBadge.textContent = totalOrders.toLocaleString('id-ID');

    // Update Counter di Filter Pills
    updateFilterBadgeCounts();
  }

  function updateFilterBadgeCounts() {
    const counts = {
      all: allOrders.length,
      'Menunggu Pembayaran': allOrders.filter(o => o.status === 'Menunggu Pembayaran').length,
      'Menunggu Verifikasi': allOrders.filter(o => o.status === 'Menunggu Verifikasi').length,
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
    renderKitchenProductionSummary();
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
          <td class="py-3 px-3 whitespace-nowrap text-on-surface-variant font-medium w-[100px]">
            <div>${formatDateIndo(order.createdAt)}</div>
          </td>

          <!-- No. Invoice -->
          <td class="py-3 px-3 whitespace-nowrap w-[115px]">
            <div class="flex items-center gap-1 font-bold text-on-surface font-mono">
              <span>${order.invoiceNumber}</span>
              <button onclick="copyToClipboard('${order.invoiceNumber}')" class="p-0.5 hover:text-primary rounded text-on-surface-variant transition-colors" title="Salin No. Invoice">
                <span class="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </td>

          <!-- Pelanggan & WA -->
          <td class="py-3 px-3 min-w-[130px] max-w-[160px]">
            <div class="font-bold text-on-surface text-xs sm:text-sm truncate">${escapeHtml(order.customerName)}</div>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-[11px] text-on-surface-variant font-mono truncate">${escapeHtml(order.customerPhone || '-')}</span>
              ${order.customerPhone ? `
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors shrink-0">
                  <span class="material-symbols-outlined text-xs text-green-600">chat</span>
                  <span>WA</span>
                </a>
              ` : ''}
            </div>
          </td>

          <!-- Detail Item -->
          <td class="py-3 px-3 min-w-[150px] max-w-xs">
            <div class="line-clamp-2 text-xs text-on-surface leading-relaxed whitespace-pre-line">${escapeHtml(order.items)}</div>
            ${order.notes && order.notes !== '-' ? `
              <div class="text-[10px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block border border-amber-200/60 line-clamp-1">
                Catatan: ${escapeHtml(order.notes)}
              </div>
            ` : ''}
          </td>

          <!-- Alamat & Kurir -->
          <td class="py-3 px-3 min-w-[130px] max-w-[180px]">
            <div class="text-xs text-on-surface-variant line-clamp-2">${escapeHtml(order.address)}</div>
            <div class="flex items-center gap-1 mt-1 text-[11px] font-semibold text-on-surface truncate">
              <span class="material-symbols-outlined text-xs text-primary shrink-0">local_shipping</span>
              <span class="truncate">${escapeHtml(order.shippingCourier)}</span>
            </div>
          </td>

          <!-- No. Resi (Kolom L) -->
          <td class="py-3 px-3 whitespace-nowrap w-[185px]">
            <div class="flex items-center gap-1 sm:gap-1.5">
              <input 
                type="text" 
                id="rowResi_${order.invoiceNumber}" 
                value="${escapeHtml(order.trackingNumber || '')}" 
                placeholder="Ketik No. Resi..." 
                class="w-24 sm:w-28 text-xs font-mono font-bold rounded-lg border border-outline-variant/60 py-1.5 px-2 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              >
              <button 
                type="button" 
                onclick="saveResiAndShip('${order.invoiceNumber}')" 
                class="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold transition-all shrink-0 shadow-2xs active:scale-95" 
                title="Simpan No. Resi & Ubah Status ke 'Dikirim'"
              >
                <span class="material-symbols-outlined text-sm">local_shipping</span>
                <span class="hidden 2xl:inline">Kirim</span>
              </button>
              ${order.trackingNumber ? `
                <button 
                  type="button" 
                  onclick="sendTrackingToWA('${order.invoiceNumber}')" 
                  class="inline-flex items-center justify-center p-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all shrink-0 shadow-2xs active:scale-95" 
                  title="Kirim Resi via WhatsApp ke Pembeli"
                >
                  <span class="material-symbols-outlined text-sm">chat</span>
                </button>
              ` : ''}
            </div>
          </td>

          <!-- Total Bayar & Bukti Transfer -->
          <td class="py-3 px-3 whitespace-nowrap w-[115px]">
            <div class="font-extrabold text-primary text-xs sm:text-sm">${formatRupiah(order.totalAmount)}</div>
            <div class="text-[11px] text-on-surface-variant mt-0.5 truncate">${escapeHtml(order.paymentMethod)}</div>
            ${order.buktiBayar && order.buktiBayar !== '-' ? `
              <div class="mt-1 flex flex-col gap-1">
                <button type="button" onclick="openProofModal('${escapeHtml(order.buktiBayar)}', '${order.invoiceNumber}')" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs">
                  <span class="material-symbols-outlined text-xs">receipt</span>
                  <span>Bukti TF ↗</span>
                </button>
                ${(order.status === 'Menunggu Verifikasi' || order.status === 'Menunggu Pembayaran') ? `
                  <button type="button" onclick="verifyPayment('${order.invoiceNumber}')" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-2xs">
                    <span class="material-symbols-outlined text-[11px]">check_circle</span>
                    <span>Lunas → Diproses</span>
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </td>

          <!-- Status & Aksi -->
          <td class="py-3 px-3 whitespace-nowrap text-right min-w-[175px]">
            <div class="flex items-center justify-end gap-1 sm:gap-1.5">
              <div class="relative inline-block text-left">
                <select onchange="handleDropdownStatusChange('${order.invoiceNumber}', this.value)" class="text-xs font-bold rounded-lg border border-outline-variant/60 py-1.5 pl-2 pr-6 bg-surface-container-lowest text-on-surface hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors shadow-2xs max-w-[125px]">
                  <option value="Menunggu Pembayaran" ${order.status === 'Menunggu Pembayaran' ? 'selected' : ''}>💳 Menunggu Bayar</option>
                  <option value="Menunggu Verifikasi" ${order.status === 'Menunggu Verifikasi' ? 'selected' : ''}>🔍 Menunggu Verifikasi</option>
                  <option value="Menunggu Konfirmasi" ${order.status === 'Menunggu Konfirmasi' ? 'selected' : ''}>⏳ Menunggu Konfirmasi</option>
                  <option value="Diproses" ${order.status === 'Diproses' ? 'selected' : ''}>🍳 Diproses di Dapur</option>
                  <option value="Dikirim" ${order.status === 'Dikirim' ? 'selected' : ''}>🚚 Dikirim Kurir</option>
                  <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>✅ Selesai</option>
                  <option value="Dibatalkan" ${order.status === 'Dibatalkan' ? 'selected' : ''}>❌ Dibatalkan</option>
                </select>
              </div>

              <!-- Tombol Cetak Label Pengiriman & Slip Dapur -->
              <button type="button" onclick="printShippingLabel('${order.invoiceNumber}')" class="p-1.5 text-on-surface-variant hover:text-[#7C4A27] hover:bg-[#F2E4D5] rounded-lg transition-colors shrink-0" title="Cetak Label Pengiriman & Slip Dapur">
                <span class="material-symbols-outlined text-base">print</span>
              </button>

              <button onclick="openOrderDetailModal('${order.invoiceNumber}')" class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors shrink-0" title="Lihat Detail Pesanan">
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
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-fixed text-primary border border-primary-border">🚚 Dikirim</span>';
      case 'Diproses':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">🍳 Diproses</span>';
      case 'Menunggu Verifikasi':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 animate-pulse">🔍 Menunggu Verifikasi</span>';
      case 'Menunggu Pembayaran':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">💳 Menunggu Bayar</span>';
      case 'Dibatalkan':
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant">❌ Dibatalkan</span>';
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

    // 3. Kirim update ke Admin Backend API (Simpan Status Kolom K & NoResi Kolom L secara bersamaan)
    const adminEndpoint = (window.APP_CONFIG && window.APP_CONFIG.ADMIN_ENDPOINT) || '/api/admin';
    const resiClean = order.trackingNumber || '';
    const adminToken = sessionStorage.getItem('sbk_admin_token') || '';

    if (!adminToken) {
      if (typeof showToast === 'function') {
        showToast('Sesi autentikasi telah habis. Silakan login kembali.', 'error');
      }
      window.adminLogout();
      return;
    }

    const payload = {
      action: 'updateStatus',
      invoice: invoiceNumber,
      status: newStatus,
      noResi: resiClean
    };

    try {
      fetch(adminEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken,
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify(payload)
      }).then(res => {
        if (res.status === 401 || res.status === 403) {
          if (typeof showToast === 'function') {
            showToast('Sesi autentikasi habis saat update. Silakan login kembali.', 'error');
          }
          window.adminLogout();
        }
      }).catch(() => {});

      // Update fingerprint lokal agar polling tidak mendeteksi perubahan ganda
      lastDataFingerprint = computeFingerprint(allOrders);

      // Jadwalkan sinkronisasi verifikasi 2 detik kemudian
      setTimeout(() => {
        if (!isSyncing) loadOrdersData(true);
      }, 2000);

    } catch (err) {
      console.warn('Gagal sync update status ke backend API:', err);
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
              ${escapeHtml(order.items)
                .split(/[\n;]+/)
                .map(i => i.trim())
                .filter(Boolean)
                .map(i => {
                  const label = i.replace(/^[•\-\*]\s*/, '');
                  return `<div class="py-1 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-primary">check_circle</span> <span>${label}</span></div>`;
                }).join('')}
            </div>
            ${order.notes && order.notes !== '-' ? `
              <div class="pt-3 text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-lg mt-2">
                <span class="font-bold">Catatan Khusus:</span> ${escapeHtml(order.notes)}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Bukti Transfer Pembeli (Jika ada) -->
        ${order.buktiBayar && order.buktiBayar !== '-' ? `
          <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-blue-900 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-blue-700">receipt</span>
                <span>Foto Bukti Transfer Pembeli:</span>
              </span>
              <a href="${escapeHtml(order.buktiBayar)}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
                <span>Buka Tab Baru</span>
                <span class="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </div>
            <div class="max-w-xs mx-auto rounded-lg overflow-hidden border border-blue-200 bg-white shadow-2xs">
              <img src="${escapeHtml(order.buktiBayar)}" alt="Bukti Transfer" class="max-h-52 w-auto mx-auto object-contain cursor-pointer" onclick="openProofModal('${escapeHtml(order.buktiBayar)}', '${order.invoiceNumber}')" title="Klik untuk perbesar">
            </div>
            ${(order.status === 'Menunggu Verifikasi' || order.status === 'Menunggu Pembayaran') ? `
              <div class="pt-1 text-center">
                <button type="button" onclick="verifyPayment('${order.invoiceNumber}')" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-xs flex items-center justify-center gap-1.5 mx-auto">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  <span>Verifikasi Lunas → Diteruskan ke Dapur (Diproses)</span>
                </button>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Input No Resi & Status Update Langsung -->
        <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/40 space-y-3">
          <h4 class="font-bold text-xs uppercase tracking-wider text-on-surface">Update Pesanan Cepat</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-1">Ubah Status:</label>
              <select id="modalStatusSelect" class="w-full text-xs font-bold rounded-lg border border-outline-variant/60 py-2 px-3 bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary">
                <option value="Menunggu Pembayaran" ${order.status === 'Menunggu Pembayaran' ? 'selected' : ''}>Menunggu Pembayaran</option>
                <option value="Menunggu Verifikasi" ${order.status === 'Menunggu Verifikasi' ? 'selected' : ''}>Menunggu Verifikasi</option>
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

        <!-- Total Tagihan & Aksi Cetak -->
        <div class="flex items-center justify-between pt-3 border-t border-outline-variant/40">
          <button type="button" onclick="printShippingLabel('${order.invoiceNumber}')" class="px-3.5 py-2 rounded-xl text-xs font-bold text-[#5E361B] bg-[#F2E4D5] hover:bg-[#E6D2BC] border border-[#E6D2BC] transition-all flex items-center gap-1.5 shadow-2xs">
            <span class="material-symbols-outlined text-base text-[#7C4A27]">print</span>
            <span>Cetak Label & Slip Dapur</span>
          </button>
          <div class="text-right">
            <div class="text-xs text-on-surface-variant">Total Tagihan (${escapeHtml(order.paymentMethod)})</div>
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

  function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    return clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('data:image/');
  }

  /**
   * Modal Bukti Transfer & Verifikasi Cepat
   */
  window.openProofModal = function(url, invoice) {
    if (!invoice && typeof url === 'string' && (url.startsWith('#') || !url.includes('/'))) {
      const found = allOrders.find(o => o.invoiceNumber === url);
      if (found) {
        invoice = found.invoiceNumber;
        url = found.buktiBayar;
      }
    }
    if (!url || url === '-' || !isSafeUrl(url)) return;
    const cleanInvoice = String(invoice || '').replace(/[^a-zA-Z0-9_\-#]/g, '');

    const modal = document.getElementById('proofPreviewModal');
    const img = document.getElementById('proofModalImg');
    const invEl = document.getElementById('proofModalInvoice');
    const newTabBtn = document.getElementById('proofModalNewTabBtn');
    const verifyBtn = document.getElementById('proofModalVerifyBtn');

    if (img) img.src = url;
    if (invEl) invEl.textContent = cleanInvoice || '';
    if (newTabBtn) newTabBtn.href = url;
    if (verifyBtn) {
      verifyBtn.onclick = function() { window.verifyPayment(cleanInvoice); };
      const targetOrder = allOrders.find(o => o.invoiceNumber === cleanInvoice);
      if (targetOrder && targetOrder.status !== 'Menunggu Verifikasi' && targetOrder.status !== 'Menunggu Pembayaran') {
        verifyBtn.classList.add('hidden');
      } else {
        verifyBtn.classList.remove('hidden');
      }
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  };

  window.closeProofModal = function() {
    const modal = document.getElementById('proofPreviewModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  window.verifyPayment = function(invoiceNumber) {
    if (!invoiceNumber) return;
    const order = allOrders.find(o => o.invoiceNumber === invoiceNumber);
    const existingResi = order ? (order.trackingNumber || '') : '';

    if (typeof showToast === 'function') {
      showToast(`Memverifikasi pembayaran lunas untuk ${invoiceNumber}...`, 'info');
    }

    window.updateOrderStatus(invoiceNumber, 'Diproses', existingResi);

    window.closeProofModal();
    if (typeof closeOrderDetailModal === 'function') {
      closeOrderDetailModal();
    }
  };

  // ============================================================================
  // GOOGLE SHEETS SPREADSHEET VIEWER & UTILITY LISTENERS
  // ============================================================================

  /**
   * Buka database Google Sheets resmi di tab baru
   */
  window.openGoogleSheets = function() {
    const rawUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SHEET_SPREADSHEET_URL : '';
    let targetUrl = 'https://drive.google.com';

    if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http') && !rawUrl.includes('YOUR_SPREADSHEET_ID')) {
      targetUrl = rawUrl;
    } else {
      // Fallback membuka Google Sheets dashboard jika URL spreadsheet belum diatur
      targetUrl = 'https://docs.google.com/spreadsheets/';
      if (typeof showToast === 'function') {
        showToast('Membuka Google Sheets (URL spreadsheet toko dapat diatur di APP_CONFIG)', 'info');
      }
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  /**
   * Cetak Label Pengiriman & Packing Slip Dapur (Window Print)
   */
  window.printShippingLabel = function(invoiceNumber) {
    const order = allOrders.find(o => o.invoiceNumber === invoiceNumber);
    if (!order) {
      if (typeof showToast === 'function') showToast('Pesanan tidak ditemukan.', 'error');
      return;
    }

    // 1. Kop & Info Invoice
    const slipInv = document.getElementById('slipInvoice');
    if (slipInv) slipInv.textContent = order.invoiceNumber || '#SBK-00000';

    const slipDate = document.getElementById('slipDate');
    if (slipDate) {
      const d = parseOrderDate(order.createdAt);
      slipDate.textContent = formatDateIndo(d);
    }

    // 2. Ekspedisi & Resi
    const slipCourier = document.getElementById('slipCourier');
    if (slipCourier) slipCourier.textContent = order.shippingCourier || 'Paxel / J&T';

    const slipResi = document.getElementById('slipResi');
    if (slipResi) {
      const r = String(order.trackingNumber || '').trim();
      slipResi.textContent = (r && r !== '-') ? r : 'Menunggu nomor resi';
    }

    // 3. Status Tagihan Pembayaran
    const slipBadge = document.getElementById('slipPaymentBadge');
    if (slipBadge) {
      const isCod = /cod|bayar di tempat/i.test(String(order.paymentMethod || ''));
      if (isCod) {
        slipBadge.className = 'inline-block font-black text-xs sm:text-sm px-2.5 py-1 rounded bg-red-600 text-white text-center tracking-wide border border-red-700';
        slipBadge.textContent = `COD - TAGIH ${formatRupiah(order.totalAmount)}`;
      } else {
        slipBadge.className = 'inline-block font-black text-xs sm:text-sm px-2.5 py-1 rounded bg-emerald-700 text-white text-center tracking-wide';
        slipBadge.textContent = `NON-COD / LUNAS`;
      }
    }

    // 4. Data Penerima (Teks Besar & Jelas)
    const slipName = document.getElementById('slipReceiverName');
    if (slipName) slipName.textContent = order.customerName || 'Penerima';

    const slipPhone = document.getElementById('slipReceiverPhone');
    if (slipPhone) slipPhone.textContent = order.customerPhone || '-';

    const slipAddr = document.getElementById('slipReceiverAddress');
    if (slipAddr) slipAddr.textContent = order.address || '-';

    // 5. Checklist Packing Dapur
    const slipItemsList = document.getElementById('slipItemsList');
    if (slipItemsList) {
      const rawItems = order.items;
      let itemsLines = [];
      if (Array.isArray(rawItems)) {
        itemsLines = rawItems.map(item => ({
          name: item.name || 'Menu Sambal',
          size: item.size || '',
          qty: item.qty || 1
        }));
      } else if (typeof rawItems === 'string') {
        const lines = rawItems.split(/[\n;]/).map(l => l.trim()).filter(Boolean);
        itemsLines = lines.map(line => {
          const cleanLine = line.replace(/^[•\-\*]\s*/, '');
          const matchQty = cleanLine.match(/\((\d+)x\)$|\s*x\s*(\d+)$/i);
          let qty = 1;
          let name = cleanLine;
          if (matchQty) {
            qty = matchQty[1] || matchQty[2];
            name = cleanLine.replace(matchQty[0], '').trim();
          }
          return { name, size: '', qty };
        });
      }

      if (itemsLines.length > 0) {
        slipItemsList.innerHTML = itemsLines.map(item => `
          <tr class="border-b border-gray-200">
            <td class="py-1.5 text-left font-mono text-sm text-gray-500 select-none">[ ]</td>
            <td class="py-1.5 text-left font-bold text-gray-900">${escapeHtml(item.name)} ${item.size ? `<span class="text-gray-600 font-normal">(${escapeHtml(item.size)})</span>` : ''}</td>
            <td class="py-1.5 text-right font-black font-mono text-sm text-black">${item.qty}x</td>
          </tr>
        `).join('');
      } else {
        slipItemsList.innerHTML = `
          <tr>
            <td class="py-1.5 text-left font-mono text-sm text-gray-500">[ ]</td>
            <td class="py-1.5 text-left font-bold text-gray-900" colspan="2">${escapeHtml(order.items || 'Menu Sambal')}</td>
          </tr>
        `;
      }
    }

    // 6. Catatan Khusus Dapur (Disorot Tebal)
    const noteContainer = document.getElementById('slipKitchenNoteContainer');
    const noteText = document.getElementById('slipKitchenNoteText');
    const noteStr = String(order.notes || '').trim();
    if (noteStr && noteStr !== '-' && noteContainer && noteText) {
      noteText.textContent = noteStr;
      noteContainer.classList.remove('hidden');
    } else if (noteContainer) {
      noteContainer.classList.add('hidden');
    }

    // Panggil window.print()
    setTimeout(() => {
      window.print();
    }, 150);
  };

  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') {
        showToast(`Tersalin: ${text}`, 'info');
      }
    });
  };

  // ============================================================================
  // TAB SWITCHER, KITCHEN PRODUCTION RECAP, WA TRACKING & CHART.JS ANALYTICS
  // ============================================================================

  let activeAdminTab = 'orders'; // 'orders' | 'analytics'
  let analyticsPeriod = '7days'; // '7days' | '30days' | 'thisMonth' | 'all'
  let compositionMode = 'payment'; // 'payment' | 'courier'
  let chartTrend = null;
  let chartVariants = null;
  let chartComposition = null;

  /**
   * Buka / Tutup Left Sidebar Drawer Navigasi
   */
  window.toggleAdminDrawer = function(open) {
    const backdrop = document.getElementById('adminDrawerBackdrop');
    const panel = document.getElementById('adminDrawerPanel');
    if (!panel || !backdrop) return;

    if (open) {
      backdrop.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      requestAnimationFrame(() => {
        panel.classList.remove('-translate-x-full');
        panel.classList.add('translate-x-0');
      });
    } else {
      panel.classList.remove('translate-x-0');
      panel.classList.add('-translate-x-full');
      document.body.classList.remove('overflow-hidden');
      setTimeout(() => {
        backdrop.classList.add('hidden');
      }, 300);
    }
  };

  /**
   * Navigasi melalui Left Sidebar Drawer
   */
  window.handleDrawerNav = function(tabName) {
    window.switchAdminTab(tabName);
    window.toggleAdminDrawer(false);
  };

  /**
   * Buka Google Sheets melalui Left Sidebar Drawer
   */
  window.handleDrawerOpenGoogleSheets = function() {
    window.openGoogleSheets();
    window.toggleAdminDrawer(false);
  };
  window.handleDrawerExportCSV = window.handleDrawerOpenGoogleSheets;

  /**
   * Switch antara Tab 1 (Daftar Pesanan) dan Tab 2 (Laporan & Analitik)
   */
  window.switchAdminTab = function(tabName) {
    activeAdminTab = tabName;
    const drawerOrders = document.getElementById('drawerTabOrders');
    const drawerAnalytics = document.getElementById('drawerTabAnalytics');
    const tabOrders = document.getElementById('adminTabOrders');
    const tabAnalytics = document.getElementById('adminTabAnalytics');

    if (tabName === 'orders') {
      if (drawerOrders) {
        drawerOrders.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-[#7C4A27] text-white shadow-xs';
      }
      if (drawerAnalytics) {
        drawerAnalytics.className = 'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-[#5E361B] hover:bg-[#F2E4D5]/70';
      }
      if (tabOrders) tabOrders.classList.remove('hidden');
      if (tabAnalytics) tabAnalytics.classList.add('hidden');
    } else {
      if (drawerOrders) {
        drawerOrders.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-[#5E361B] hover:bg-[#F2E4D5]/70';
      }
      if (drawerAnalytics) {
        drawerAnalytics.className = 'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-[#7C4A27] text-white shadow-xs';
      }
      if (tabOrders) tabOrders.classList.add('hidden');
      if (tabAnalytics) tabAnalytics.classList.remove('hidden');

      renderAnalytics();
    }
  };

  /**
   * Kirim Resi via WhatsApp langsung ke Pembeli
   */
  window.sendTrackingToWA = function(invoiceNumber) {
    const order = allOrders.find(o => o.invoiceNumber === invoiceNumber);
    if (!order) return;

    const cleanResi = (order.trackingNumber || '').trim();
    if (!cleanResi) {
      if (typeof showToast === 'function') {
        showToast('Nomor resi belum tersimpan!', 'error');
      }
      return;
    }

    const cleanWa = (order.whatsapp || order.customerPhone || '').replace(/\D/g, '');
    const waNumber = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
    if (!waNumber) {
      if (typeof showToast === 'function') {
        showToast('Nomor WhatsApp pembeli tidak valid.', 'error');
      }
      return;
    }

    const courier = order.shippingCourier || 'Ekspedisi Pengiriman';
    const trackingUrl = `${window.location.origin}/status?invoice=${encodeURIComponent(order.invoiceNumber)}`;

    const message = `Halo Kak ${order.customerName},\n\nPesanan Sambal by Kazel *${order.invoiceNumber}* telah kami kirimkan via kurir *${courier}* dengan nomor resi:\n\n📦 *No. Resi:* ${cleanResi}\n🔍 *Lacak Status Pengiriman:* ${trackingUrl}\n\nTerima kasih banyak telah berbelanja di Sambal by Kazel! Pedasnya Pas, Rasanya Nagih! 🌶️🙏`;

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  /**
   * Parse rincian nama varian & kuantitas dari pesanan
   */
  function parseOrderItemsBreakdown(order) {
    const counts = {};
    if (Array.isArray(order.rawItemsArray) && order.rawItemsArray.length > 0) {
      order.rawItemsArray.forEach(it => {
        let name = (it.name || 'Produk').replace(/\s*\(\d+g\)$/i, '').trim();
        const qty = Number(it.qty || it.quantity || 1) || 1;
        counts[name] = (counts[name] || 0) + qty;
      });
      return counts;
    }

    const text = String(order.items || '');
    if (!text || text === '-') return counts;

    const lines = text.split('\n');
    lines.forEach(line => {
      let clean = line.replace(/^[•\-\*]\s*/, '').trim();
      if (!clean) return;

      let qty = 1;
      const qtyMatch = clean.match(/\(([0-9]+)x\)$/i) || clean.match(/x\s*([0-9]+)$/i) || clean.match(/([0-9]+)\s*pcs/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10) || 1;
        clean = clean.replace(qtyMatch[0], '').trim();
      }
      clean = clean.replace(/\s*\(\d+g\)$/i, '').replace(/\s*\([^\)]+\)$/, '').trim();
      if (clean) {
        counts[clean] = (counts[clean] || 0) + qty;
      }
    });
    return counts;
  }

  /**
   * Rekap Produksi Dapur (Muncul saat filter 'all' atau 'Diproses' aktif)
   */
  function renderKitchenProductionSummary() {
    const summaryBox = document.getElementById('kitchenProductionSummary');
    const badge = document.getElementById('kitchenTotalBottlesBadge');
    const grid = document.getElementById('kitchenItemsGrid');
    if (!summaryBox || !grid) return;

    if (currentFilter !== 'all' && currentFilter !== 'Diproses') {
      summaryBox.classList.add('hidden');
      return;
    }

    const kitchenOrders = allOrders.filter(o => o.status === 'Diproses');
    if (kitchenOrders.length === 0) {
      summaryBox.classList.add('hidden');
      return;
    }

    const aggregated = {};
    let totalBottles = 0;

    kitchenOrders.forEach(order => {
      const breakdown = parseOrderItemsBreakdown(order);
      Object.keys(breakdown).forEach(name => {
        aggregated[name] = (aggregated[name] || 0) + breakdown[name];
        totalBottles += breakdown[name];
      });
    });

    if (totalBottles === 0) {
      summaryBox.classList.add('hidden');
      return;
    }

    summaryBox.classList.remove('hidden');
    if (badge) {
      badge.textContent = `${totalBottles} Botol Perlu Disiapkan (${kitchenOrders.length} Pesanan)`;
    }

    const sortedItems = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
    grid.innerHTML = sortedItems.map(([name, qty]) => `
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-[#E6D2BC] text-[#5E361B] text-xs font-bold shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-[#7C4A27]"></span>
        <span>${escapeHtml(name)}</span>
        <span class="bg-[#F2E4D5] text-[#7C4A27] px-2 py-0.5 rounded-lg font-black text-[11px]">${qty}x</span>
      </div>
    `).join('');
  }

  /**
   * Filter Periode Waktu Analitik
   */
  window.setAnalyticsPeriod = function(period) {
    analyticsPeriod = period;
    const buttons = document.querySelectorAll('.analytics-period-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-analytics-period') === period) {
        btn.className = 'analytics-period-btn px-3.5 py-1.5 rounded-lg font-bold transition-all bg-[#7C4A27] text-white shadow-2xs whitespace-nowrap';
      } else {
        btn.className = 'analytics-period-btn px-3.5 py-1.5 rounded-lg font-bold transition-all text-on-surface-variant hover:text-on-surface hover:bg-surface-container whitespace-nowrap';
      }
    });
    renderAnalytics();
  };

  /**
   * Toggle Grafik Komposisi Transaksi (Metode Pembayaran vs Kurir)
   */
  window.togglePaymentKurirChart = function(mode) {
    compositionMode = mode;
    const btnPay = document.getElementById('btnTogglePayKurir_pay');
    const btnKurir = document.getElementById('btnTogglePayKurir_kurir');
    const subtitle = document.getElementById('compositionSubtitle');

    if (mode === 'payment') {
      if (btnPay) btnPay.className = 'px-3 py-1 rounded-lg bg-[#7C4A27] text-white transition-all';
      if (btnKurir) btnKurir.className = 'px-3 py-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-all';
      if (subtitle) subtitle.textContent = 'Sebaran metode pembayaran';
    } else {
      if (btnPay) btnPay.className = 'px-3 py-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-all';
      if (btnKurir) btnKurir.className = 'px-3 py-1 rounded-lg bg-[#7C4A27] text-white transition-all';
      if (subtitle) subtitle.textContent = 'Sebaran kurir ekspedisi';
    }
    renderCompositionChart();
  };

  function getAnalyticsOrders() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return allOrders.filter(order => {
      if (order.status === 'Dibatalkan') return false;

      if (analyticsPeriod === 'all') return true;

      const orderDate = parseOrderDate(order.createdAt);
      if (analyticsPeriod === '7days') {
        const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        return orderDate >= threshold && orderDate <= startOfToday;
      }
      if (analyticsPeriod === '30days') {
        const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        return orderDate >= threshold && orderDate <= startOfToday;
      }
      if (analyticsPeriod === 'thisMonth') {
        return orderDate.getFullYear() === now.getFullYear() && orderDate.getMonth() === now.getMonth();
      }
      return true;
    });
  }

  function renderAnalytics() {
    if (activeAdminTab !== 'analytics') return;

    const orders = getAnalyticsOrders();

    // 1. Omzet Kotor
    const grossRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const grossCount = orders.length;

    // 2. Omzet Bersih (Selesai)
    const completedOrders = orders.filter(o => o.status === 'Selesai');
    const netRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const netCount = completedOrders.length;

    // 3. Average Order Value (AOV)
    const aov = grossCount > 0 ? Math.round(grossRevenue / grossCount) : 0;

    // 4. Total Botol Terjual & Varian Breakdown
    const variantCounts = {};
    let totalBottles = 0;
    orders.forEach(o => {
      const breakdown = parseOrderItemsBreakdown(o);
      Object.keys(breakdown).forEach(name => {
        variantCounts[name] = (variantCounts[name] || 0) + breakdown[name];
        totalBottles += breakdown[name];
      });
    });

    const elGross = document.getElementById('analyticsGrossRevenue');
    const elGrossSub = document.getElementById('analyticsGrossOrders');
    const elNet = document.getElementById('analyticsNetRevenue');
    const elNetSub = document.getElementById('analyticsNetOrders');
    const elAOV = document.getElementById('analyticsAOV');
    const elBottles = document.getElementById('analyticsTotalBottles');
    const elVarCount = document.getElementById('analyticsVariantsCount');

    if (elGross) elGross.textContent = formatRupiah(grossRevenue);
    if (elGrossSub) elGrossSub.textContent = `${grossCount} transaksi tercatat`;
    if (elNet) elNet.textContent = formatRupiah(netRevenue);
    if (elNetSub) elNetSub.textContent = `${netCount} pesanan selesai`;
    if (elAOV) elAOV.textContent = formatRupiah(aov);
    if (elBottles) elBottles.textContent = `${totalBottles.toLocaleString('id-ID')} Botol`;
    if (elVarCount) elVarCount.textContent = `${Object.keys(variantCounts).length} varian produk`;

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js belum dimuat atau diblokir.');
      return;
    }

    renderTrendChart(orders);
    renderVariantsChart(variantCounts);
    renderCompositionChart(orders);
  }

  function renderTrendChart(orders) {
    const canvas = document.getElementById('chartTrendCanvas');
    if (!canvas) return;

    if (chartTrend) {
      chartTrend.destroy();
      chartTrend = null;
    }

    const now = new Date();
    let daysCount = 7;
    if (analyticsPeriod === '30days') daysCount = 30;
    else if (analyticsPeriod === 'thisMonth') daysCount = now.getDate();
    else if (analyticsPeriod === 'all') daysCount = 14;

    const dateLabels = [];
    const dateKeys = [];
    const revenueMap = {};
    const countMap = {};

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      dateKeys.push(key);
      dateLabels.push(label);
      revenueMap[key] = 0;
      countMap[key] = 0;
    }

    orders.forEach(order => {
      const d = parseOrderDate(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (revenueMap[key] !== undefined) {
        revenueMap[key] += (order.totalAmount || 0);
        countMap[key] += 1;
      }
    });

    const revenueData = dateKeys.map(k => revenueMap[k]);
    const countData = dateKeys.map(k => countMap[k]);

    chartTrend = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dateLabels,
        datasets: [
          {
            label: 'Omzet Penjualan (Rp)',
            data: revenueData,
            backgroundColor: '#7C4A27',
            borderRadius: 6,
            yAxisID: 'y',
            order: 2
          },
          {
            label: 'Jumlah Pesanan',
            data: countData,
            type: 'line',
            borderColor: '#E65100',
            backgroundColor: '#E65100',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#E65100',
            pointBorderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (context.dataset.yAxisID === 'y') {
                  return ` Omzet: ${formatRupiah(context.raw)}`;
                }
                return ` Pesanan: ${context.raw} transaksi`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: 'Plus Jakarta Sans' } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            ticks: {
              callback: function(val) {
                if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
                if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}Rb`;
                return `Rp ${val}`;
              },
              font: { size: 10, family: 'Plus Jakarta Sans' }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
              font: { size: 10, family: 'Plus Jakarta Sans' }
            },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  function renderVariantsChart(variantCounts) {
    const canvas = document.getElementById('chartVariantsCanvas');
    if (!canvas) return;

    if (chartVariants) {
      chartVariants.destroy();
      chartVariants = null;
    }

    const sorted = Object.entries(variantCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const labels = sorted.map(item => item[0]);
    const data = sorted.map(item => item[1]);

    const colors = ['#7C4A27', '#93582E', '#A96836', '#BF783F', '#D58A4A', '#EBB07A'];

    chartVariants = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Belum Ada Data'],
        datasets: [{
          label: 'Botol Terjual',
          data: data.length > 0 ? data : [0],
          backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ` Terjual: ${ctx.raw} Botol`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0, font: { size: 10, family: 'Plus Jakarta Sans' } },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { size: 11, family: 'Plus Jakarta Sans', weight: '600' }
            }
          }
        }
      }
    });
  }

  function renderCompositionChart(ordersParam) {
    const canvas = document.getElementById('chartCompositionCanvas');
    if (!canvas) return;

    if (chartComposition) {
      chartComposition.destroy();
      chartComposition = null;
    }

    const orders = ordersParam || getAnalyticsOrders();
    const map = {};

    if (compositionMode === 'payment') {
      orders.forEach(o => {
        let method = o.paymentMethod || 'Transfer Bank';
        if (/cod|bayar di tempat/i.test(method)) method = 'COD (Bayar di Tempat)';
        else if (/qris/i.test(method)) method = 'QRIS Instant';
        else if (/bca|bni|bri|mandiri|transfer/i.test(method)) method = 'Transfer Bank';
        map[method] = (map[method] || 0) + 1;
      });
    } else {
      orders.forEach(o => {
        let courier = o.shippingCourier || 'J&T Express';
        if (/j&t|jnt/i.test(courier)) courier = 'J&T Express';
        else if (/jne/i.test(courier)) courier = 'JNE Regular';
        else if (/sicepat/i.test(courier)) courier = 'SiCepat';
        else if (/anteraja/i.test(courier)) courier = 'Anteraja';
        else if (/paxel/i.test(courier)) courier = 'Paxel';
        else if (/gosend|grab|instan/i.test(courier)) courier = 'Instant / Same Day';
        map[courier] = (map[courier] || 0) + 1;
      });
    }

    const labels = Object.keys(map);
    const data = Object.values(map);
    const palette = ['#7C4A27', '#E65100', '#2E7D32', '#1565C0', '#D97706', '#6D4C41', '#8E24AA'];

    chartComposition = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Belum Ada Data'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: labels.length > 0 ? palette.slice(0, labels.length) : ['#E0E0E0'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11, family: 'Plus Jakarta Sans', weight: '600' },
              padding: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const val = ctx.raw;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${ctx.label}: ${val} pesanan (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

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
        loadOrdersData(false);
        if (typeof showToast === 'function') {
          showToast('Menyinkronkan data pesanan dengan Google Sheets...', 'info');
        }
      });
    }

    // Auto-sync saat tab aktif kembali
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && sessionStorage.getItem('sbk_admin_auth') === 'true' && !isSyncing) {
        loadOrdersData(true);
      }
    });

    // Auto-sync saat localStorage berubah (misal aksi dari tab lain)
    window.addEventListener('storage', (e) => {
      if (e.key === 'sw_order_history_v1' || e.key === 'sw_last_order') {
        if (sessionStorage.getItem('sbk_admin_auth') === 'true' && !isSyncing) {
          loadOrdersData(true);
        }
      }
    });

    // Close Drawer saat menekan tombol Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.toggleAdminDrawer(false);
      }
    });
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
