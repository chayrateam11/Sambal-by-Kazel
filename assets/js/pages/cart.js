/**
 * Sambal by Kazel - Cart Page Interactive Logic
 */

function renderCartPage() {
  const cart = getCart();
  const wrapper = document.getElementById('cartContentWrapper');
  const emptyView = document.getElementById('emptyCartView');
  const freeShipCard = document.getElementById('freeShippingCard');

  if (!cart || cart.length === 0) {
    if (wrapper) wrapper.classList.add('hidden');
    if (freeShipCard) freeShipCard.classList.add('hidden');
    if (emptyView) emptyView.classList.remove('hidden');
    return;
  }

  if (wrapper) wrapper.classList.remove('hidden');
  if (freeShipCard) freeShipCard.classList.remove('hidden');
  if (emptyView) emptyView.classList.add('hidden');

  // Calculations
  const calcs = getCartCalculations('paxel');

  // Render Free Shipping Bar
  const progressBar = document.getElementById('freeShippingProgressBar');
  const progressPercent = document.getElementById('freeShippingPercentage');
  const progressTitle = document.getElementById('freeShippingTitle');
  const progressDesc = document.getElementById('freeShippingDesc');

  if (progressBar) progressBar.style.width = `${calcs.freeShippingProgress}%`;
  if (progressPercent) progressPercent.textContent = `${calcs.freeShippingProgress}%`;

  if (calcs.isFreeShipping) {
    if (progressTitle) progressTitle.innerHTML = '🎉 Selamat! Belanjaan Anda Memenuhi Syarat Bebas Ongkir!';
    if (progressDesc) progressDesc.innerHTML = 'Subsidi Gratis Ongkir hingga Rp 18.000 otomatis aktif saat checkout.';
  } else {
    if (progressTitle) progressTitle.innerHTML = 'Tingkatkan belanjaan Anda untuk Gratis Ongkir!';
    if (progressDesc) progressDesc.innerHTML = `Tambah belanjaan sebesar <strong class="text-primary">${formatRupiah(calcs.freeShippingShortfall)}</strong> lagi untuk mendapatkan <strong>Bebas Ongkir se-Jawa!</strong>`;
  }

  // Render Item Count
  const countText = document.getElementById('cartItemsCountText');
  if (countText) countText.textContent = `Daftar Item (${calcs.totalItems})`;

  // Render Items List
  const itemsListContainer = document.getElementById('cartItemsList');
  if (itemsListContainer) {
    itemsListContainer.innerHTML = cart.map(item => {
      const safeName = typeof escapeHtml === 'function' ? escapeHtml(item.name) : item.name;
      const safeSize = typeof escapeHtml === 'function' ? escapeHtml(item.size) : item.size;
      const safeImage = (typeof item.image === 'string' && item.image.startsWith('http')) ? encodeURI(item.image) : (typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : '');
      const safeCartItemId = typeof escapeHtml === 'function' ? escapeHtml(item.cartItemId) : item.cartItemId;
      const safeQty = parseInt(item.qty, 10) || 1;
      const safePrice = Number(item.price) || 0;
      const safeOrigPrice = Number(item.originalPrice) || 0;
      const safeSpice = parseInt(item.spiceLevel, 10) || 1;

      return `
      <div class="pt-4 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/60">
            <img src="${safeImage}" alt="${safeName}" onerror="this.onerror=null; this.src=FALLBACK_IMG;" class="w-full h-full object-cover">
          </div>
          <div>
            <h4 class="font-bold text-xs sm:text-sm text-on-surface line-clamp-1">${safeName}</h4>
            <div class="text-[11px] text-on-surface-variant flex items-center gap-2 mt-0.5">
              <span>Ukuran: <strong>${safeSize}</strong></span>
              <span>•</span>
              <span>Pedas: <strong>Lvl ${safeSpice}</strong></span>
            </div>
            <div class="text-xs font-extrabold text-primary mt-1">
              ${formatRupiah(safePrice)}
              ${safeOrigPrice ? `<span class="text-[10px] text-outline line-through ml-1">${formatRupiah(safeOrigPrice)}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
          <!-- Stepper -->
          <div class="flex items-center border border-outline-variant/60 rounded-xl bg-surface-container-low p-0.5">
            <button type="button" onclick="handleUpdateQty('${safeCartItemId}', -1)" class="qty-btn text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container" title="Kurangi">
              <span class="material-symbols-outlined text-base">remove</span>
            </button>
            <span class="w-8 text-center text-xs font-bold text-on-surface">${safeQty}</span>
            <button type="button" onclick="handleUpdateQty('${safeCartItemId}', 1)" class="qty-btn text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container" title="Tambah">
              <span class="material-symbols-outlined text-base">add</span>
            </button>
          </div>

          <div class="text-right min-w-[80px]">
            <span class="text-xs sm:text-sm font-black text-on-surface block">${formatRupiah(safePrice * safeQty)}</span>
            <button type="button" onclick="handleRemoveItem('${safeCartItemId}')" class="text-[11px] text-primary hover:text-primary-dark hover:underline font-semibold">Hapus</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
  }

  // Render Add-ons
  renderAddons();

  // Render Summary
  const subEl = document.getElementById('summarySubtotal');
  if (subEl) subEl.textContent = formatRupiah(calcs.subtotal);

  const discEl = document.getElementById('summaryDiscount');
  if (discEl) discEl.textContent = `-${formatRupiah(calcs.discountAmount)}`;
  
  const shipEl = document.getElementById('summaryShipping');
  if (shipEl) {
    if (calcs.isFreeShipping) {
      shipEl.innerHTML = `<span class="line-through text-outline mr-1">${formatRupiah(18000)}</span><span class="text-green-600 font-bold">GRATIS</span>`;
    } else {
      shipEl.textContent = formatRupiah(calcs.shippingFee);
    }
  }

  const grandEl = document.getElementById('summaryGrandTotal');
  if (grandEl) grandEl.textContent = formatRupiah(calcs.grandTotal);

  // Render Coupon Badge
  const couponBadge = document.getElementById('couponAppliedBadge');
  const couponInputGroup = document.getElementById('couponInputGroup');
  if (calcs.coupon) {
    if (couponBadge) {
      couponBadge.classList.remove('hidden');
      couponBadge.classList.add('flex');
    }
    if (couponInputGroup) couponInputGroup.classList.add('hidden');
    const label = document.getElementById('couponCodeLabel');
    if (label) label.textContent = calcs.coupon.code;
  } else {
    if (couponBadge) {
      couponBadge.classList.add('hidden');
      couponBadge.classList.remove('flex');
    }
    if (couponInputGroup) couponInputGroup.classList.remove('hidden');
  }
}

function renderAddons() {
  const container = document.getElementById('addonsGrid');
  if (!container || typeof ADDONS_DATA === 'undefined') return;

  container.innerHTML = ADDONS_DATA.map(addon => `
    <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
          <img src="${addon.image}" alt="${addon.name}" onerror="this.onerror=null; this.src=FALLBACK_IMG;" class="w-full h-full object-cover">
        </div>
        <div>
          <h5 class="font-bold text-xs text-on-surface line-clamp-1">${addon.name}</h5>
          <div class="text-[11px] text-primary font-extrabold">${formatRupiah(addon.price)}</div>
        </div>
      </div>
      <button type="button" onclick="handleAddAddonClick('${addon.id}')" class="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-primary hover:text-white text-on-surface text-[11px] font-bold transition-all tap-target">
        + Tambah
      </button>
    </div>
  `).join('');
}

function handleAddAddonClick(addonId) {
  if (typeof ADDONS_DATA === 'undefined') return;
  const addon = ADDONS_DATA.find(a => a.id === addonId);
  if (!addon) return;
  addToCart({
    id: addon.id,
    name: addon.name,
    price: addon.price,
    originalPrice: addon.originalPrice,
    size: addon.size,
    spiceLevel: 1,
    image: addon.image,
    category: 'addon'
  }, 1, true);
  renderCartPage();
}

function handleUpdateQty(cartItemId, delta) {
  updateCartQty(cartItemId, delta);
  renderCartPage();
}

function handleRemoveItem(cartItemId) {
  removeFromCart(cartItemId);
  renderCartPage();
}

function handleClearAllCart() {
  if (confirm('Yakin ingin mengosongkan semua item di keranjang?')) {
    clearCart();
    renderCartPage();
    showToast('Keranjang telah dikosongkan.', 'info');
  }
}

function handleApplyCoupon() {
  const input = document.getElementById('couponCodeInput');
  const code = input ? input.value.trim().toUpperCase() : '';

  if (!code) {
    showToast('Masukkan kode kupon terlebih dahulu.', 'error');
    return;
  }

  if (typeof VALID_COUPONS !== 'undefined' && VALID_COUPONS[code]) {
    setAppliedCoupon(VALID_COUPONS[code]);
    showToast(`Kupon ${code} berhasil dipasang! Potongan diskon Rp 15.000 diterapkan.`, 'success');
    if (input) input.value = '';
    renderCartPage();
  } else {
    showToast('Kode kupon tidak valid atau telah kedaluwarsa.', 'error');
  }
}

function handleRemoveCoupon() {
  setAppliedCoupon(null);
  showToast('Kupon diskon telah dilepas.', 'info');
  renderCartPage();
}

function handleProceedCheckout() {
  const cart = getCart();
  if (!cart || cart.length === 0) {
    showToast('Keranjang Anda masih kosong!', 'error');
    return;
  }

  // Simpan catatan dapur sementara jika ada
  const noteInput = document.getElementById('kitchenNoteInput');
  if (noteInput && noteInput.value.trim()) {
    sessionStorage.setItem('sw_temp_kitchen_note', noteInput.value.trim());
  } else {
    sessionStorage.removeItem('sw_temp_kitchen_note');
  }

  window.location.href = '/checkout';
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore temporary kitchen note if exists
  const savedNote = sessionStorage.getItem('sw_temp_kitchen_note');
  const noteInput = document.getElementById('kitchenNoteInput');
  if (savedNote && noteInput) {
    noteInput.value = savedNote;
  }

  renderCartPage();
});
