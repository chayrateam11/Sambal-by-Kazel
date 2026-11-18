/**
 * Sambal by Kazel - Checkout Page Interactive Logic
 */

let selectedCourier = 'paxel';
let selectedCourierName = 'Paxel Next Day Chilled';
let selectedPayment = 'qris';
let selectedPaymentName = 'QRIS Instant (GoPay/BCA/OVO/ShopeePay)';

function initCheckoutPage() {
  const cart = getCart();
  if (!cart || cart.length === 0) {
    showToast('Keranjang Anda kosong! Mengalihkan ke katalog...', 'error');
    setTimeout(() => {
      window.location.href = '/katalog';
    }, 1200);
    return;
  }

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const calcs = getCartCalculations(selectedCourier);

  const itemCountEl = document.getElementById('checkoutItemCount');
  if (itemCountEl) itemCountEl.textContent = `${calcs.totalItems} Item`;

  // Render mini item list
  const miniList = document.getElementById('checkoutMiniList');
  if (miniList) {
    miniList.innerHTML = calcs.cart.map(item => {
      const safeName = typeof escapeHtml === 'function' ? escapeHtml(item.name) : item.name;
      const safeSize = typeof escapeHtml === 'function' ? escapeHtml(item.size) : item.size;
      const safeQty = parseInt(item.qty, 10) || 1;
      const safeSpice = parseInt(item.spiceLevel, 10) || 1;
      const safePrice = Number(item.price) || 0;

      return `
      <div class="pt-2 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-primary">${safeQty}x</span>
          <div>
            <span class="font-bold text-on-surface line-clamp-1">${safeName}</span>
            <span class="text-[10px] text-on-surface-variant">${safeSize} • Lvl ${safeSpice}</span>
          </div>
        </div>
        <span class="font-bold text-on-surface">${formatRupiah(safePrice * safeQty)}</span>
      </div>
    `;
    }).join('');
  }

  // Rates display with free shipping logic
  const paxelDisplay = document.getElementById('paxelRateDisplay');
  const jntDisplay = document.getElementById('jntRateDisplay');
  const grabDisplay = document.getElementById('grabRateDisplay');
  const pill = document.getElementById('freeShippingCourierPill');

  if (calcs.isFreeShipping) {
    if (pill) pill.classList.remove('hidden');
    if (paxelDisplay) paxelDisplay.innerHTML = `<span class="line-through text-outline mr-1 text-xs">Rp 18.000</span><span class="text-green-700 font-bold">GRATIS</span>`;
    if (jntDisplay) jntDisplay.innerHTML = `<span class="line-through text-outline mr-1 text-xs">Rp 12.000</span><span class="text-green-700 font-bold">GRATIS</span>`;
    if (grabDisplay) grabDisplay.innerHTML = `<span class="line-through text-outline mr-1 text-xs">Rp 32.000</span><span class="text-primary font-bold">Rp 14.000</span>`;
  } else {
    if (pill) pill.classList.add('hidden');
    if (paxelDisplay) paxelDisplay.textContent = 'Rp 18.000';
    if (jntDisplay) jntDisplay.textContent = 'Rp 12.000';
    if (grabDisplay) grabDisplay.textContent = 'Rp 32.000';
  }

  // Render calculation values
  const chkSub = document.getElementById('chkSubtotal');
  if (chkSub) chkSub.textContent = formatRupiah(calcs.subtotal);

  const courierLabel = document.getElementById('chkCourierLabel');
  if (courierLabel) courierLabel.textContent = selectedCourier === 'paxel' ? 'Paxel' : (selectedCourier === 'jnt' ? 'J&T' : 'Grab');

  const feeEl = document.getElementById('chkShippingFee');
  if (feeEl) {
    if (calcs.isFreeShipping && (selectedCourier === 'paxel' || selectedCourier === 'jnt')) {
      feeEl.innerHTML = `<span class="text-green-700 font-bold">GRATIS</span>`;
    } else {
      feeEl.textContent = formatRupiah(calcs.shippingFee);
    }
  }

  const chkDisc = document.getElementById('chkDiscount');
  if (chkDisc) chkDisc.textContent = `-${formatRupiah(calcs.discountAmount)}`;

  const chkGrand = document.getElementById('chkGrandTotal');
  if (chkGrand) chkGrand.textContent = formatRupiah(calcs.grandTotal);
}

function handleCourierChange(code, name) {
  selectedCourier = code;
  selectedCourierName = name;

  document.querySelectorAll('#courierOptionsContainer .courier-card').forEach(card => {
    card.classList.remove('border-2', 'border-primary', 'bg-primary-fixed/20');
    card.classList.add('border', 'border-outline-variant/60', 'bg-surface-container-low');
  });

  const radio = document.querySelector(`input[name="courierOption"][value="${code}"]`);
  if (radio) {
    const parentCard = radio.closest('.courier-card');
    if (parentCard) {
      parentCard.classList.remove('border', 'border-outline-variant/60', 'bg-surface-container-low');
      parentCard.classList.add('border-2', 'border-primary', 'bg-primary-fixed/20');
    }
  }

  renderCheckoutSummary();
}

function handlePaymentChange(code, name) {
  selectedPayment = code;
  selectedPaymentName = name;

  document.querySelectorAll('.payment-card').forEach(card => {
    card.classList.remove('border-2', 'border-primary', 'bg-primary-fixed/20');
    card.classList.add('border', 'border-outline-variant/60', 'bg-surface-container-low');
  });

  const radio = document.querySelector(`input[name="paymentOption"][value="${code}"]`);
  if (radio) {
    const parentCard = radio.closest('.payment-card');
    if (parentCard) {
      parentCard.classList.remove('border', 'border-outline-variant/60', 'bg-surface-container-low');
      parentCard.classList.add('border-2', 'border-primary', 'bg-primary-fixed/20');
    }
  }
}

function toggleGiftCard(checked) {
  const section = document.getElementById('giftCardSection');
  if (!section) return;
  if (checked) {
    section.classList.remove('hidden');
  } else {
    section.classList.add('hidden');
  }
}

function handleFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('custName');
  const phoneInput = document.getElementById('custPhone');
  const cityInput = document.getElementById('custCity');
  const postalInput = document.getElementById('custPostal');
  const addressInput = document.getElementById('custAddress');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const city = cityInput ? cityInput.value : '';
  const postal = postalInput ? postalInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';

  if (!name || !phone || !address || !postal) {
    showToast('Mohon lengkapi semua kolom data alamat penerima.', 'error');
    return;
  }

  const giftBox = document.getElementById('giftCardCheckbox');
  const isGift = giftBox ? giftBox.checked : false;
  const noteEl = document.getElementById('giftCardNote');
  const giftNote = isGift && noteEl ? noteEl.value.trim() : '';
  const kitchenNote = sessionStorage.getItem('sw_temp_kitchen_note') || '';

  const calcs = getCartCalculations(selectedCourier);

  // Generate invoice format #SBK-YYMMDD-XXXX (unik & collision-resistant)
  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomFour = Math.floor(1000 + Math.random() * 9000);
  const invoiceNum = `#SBK-${todayStr}-${randomFour}`;

  // Bedakan status awal: COD langsung "Diproses" ke dapur, Non-COD "Menunggu Pembayaran"
  const isCod = selectedPayment === 'cod' || (selectedPaymentName && selectedPaymentName.toLowerCase().includes('cod'));
  const initialStatus = isCod ? 'Diproses' : 'Menunggu Pembayaran';

  // Nomor resi dikosongkan saat baru checkout, akan diisi admin saat pesanan dikirim
  const orderPayload = {
    invoiceNumber: invoiceNum,
    trackingNumber: '',
    noResi: '',
    createdAt: new Date().toISOString(),
    customerName: name,
    customerPhone: phone,
    customerCity: city,
    customerPostal: postal,
    customerAddress: address,
    courierCode: selectedCourier,
    courierName: selectedCourierName,
    shippingFee: calcs.shippingFee,
    paymentCode: selectedPayment,
    paymentMethodName: selectedPaymentName,
    items: calcs.cart,
    subtotal: calcs.subtotal,
    discountAmount: calcs.discountAmount,
    grandTotal: calcs.grandTotal,
    giftCardNote: giftNote,
    kitchenNote: kitchenNote,
    user_website_hp: document.getElementById('userWebsiteAddress')?.value || '',
    status: initialStatus,
    buktiBayar: ''
  };

  // Simpan, sync Google Sheets, dan proses checkout via feature flag
  sessionStorage.removeItem('sw_temp_kitchen_note');
  processOrderCheckout(orderPayload);
}

document.addEventListener('DOMContentLoaded', () => {
  initCheckoutPage();
});
