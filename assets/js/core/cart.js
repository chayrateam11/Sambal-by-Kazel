/**
 * Sambal by Kazel - Core Cart, State Management & Utilities
 */

// 1. Utility Functions
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('IDR', 'Rp');
}

function renderChiliRating(level, maxLevel = 5) {
  let html = '<div class="inline-flex items-center gap-0.5" title="Level Pedas ' + level + ' dari ' + maxLevel + '">';
  for (let i = 1; i <= maxLevel; i++) {
    if (i <= level) {
      html += '<span class="material-symbols-outlined fill text-primary text-base leading-none">local_fire_department</span>';
    } else {
      html += '<span class="material-symbols-outlined text-outline-variant text-base leading-none">local_fire_department</span>';
    }
  }
  html += '<span class="ml-1 text-xs font-semibold text-on-surface-variant">Lvl ' + level + '</span></div>';
  return html;
}

// 2. LocalStorage Cart State Management
function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading cart from localStorage', e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadges();
  } catch (e) {
    console.error('Error saving cart to localStorage', e);
  }
}

function getAppliedCoupon() {
  try {
    const raw = localStorage.getItem(ACTIVE_COUPON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setAppliedCoupon(coupon) {
  if (coupon) {
    localStorage.setItem(ACTIVE_COUPON_KEY, JSON.stringify(coupon));
  } else {
    localStorage.removeItem(ACTIVE_COUPON_KEY);
  }
}

function addToCart(item, qty = 1, notify = true) {
  const cart = getCart();
  const spiceLevel = item.spiceLevel || 3;
  const size = item.size || '150g';
  const cartItemId = `${item.id}_${size}_lvl${spiceLevel}`;

  const existingIndex = cart.findIndex(c => c.cartItemId === cartItemId);
  if (existingIndex > -1) {
    cart[existingIndex].qty += qty;
  } else {
    cart.push({
      cartItemId: cartItemId,
      id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice || Math.round(item.price * 1.25),
      size: size,
      spiceLevel: spiceLevel,
      qty: qty,
      image: item.image || (typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : ''),
      category: item.category || 'sambal'
    });
  }

  saveCart(cart);
  if (notify) {
    showToast(`"${item.name}" (${size}) berhasil dimasukkan ke keranjang!`, 'success');
  }
}

function removeFromCart(cartItemId) {
  let cart = getCart();
  const target = cart.find(i => i.cartItemId === cartItemId);
  cart = cart.filter(i => i.cartItemId !== cartItemId);
  saveCart(cart);
  if (target) {
    showToast(`"${target.name}" dihapus dari keranjang.`, 'info');
  }
}

function updateCartQty(cartItemId, delta) {
  let cart = getCart();
  const item = cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(cartItemId);
  } else {
    item.qty = newQty;
    saveCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_COUPON_KEY);
  updateCartBadges();
}

function getCartCalculations(selectedCourier = 'paxel') {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Free shipping check
  const isFreeShipping = subtotal >= FREE_SHIPPING_MIN;
  const freeShippingShortfall = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_MIN) * 100));

  // Courier base rates
  let courierFee = 18000; // Paxel
  if (selectedCourier === 'jnt') {
    courierFee = 12000;
  } else if (selectedCourier === 'grab') {
    courierFee = 32000;
  }

  // Calculate actual shipping after free shipping discount
  let shippingFee = courierFee;
  if (isFreeShipping) {
    if (selectedCourier === 'grab') {
      shippingFee = Math.max(0, courierFee - 18000); // Diskon subsidi 18k untuk grab
    } else {
      shippingFee = 0; // Paxel & J&T gratis total
    }
  }

  // Coupon discount
  const coupon = getAppliedCoupon();
  let discountAmount = 0;
  if (coupon && coupon.discount && subtotal > 0) {
    discountAmount = Math.min(subtotal, coupon.discount);
  }

  const grandTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  return {
    cart,
    subtotal,
    totalItems,
    courierFee,
    shippingFee,
    isFreeShipping,
    freeShippingShortfall,
    freeShippingProgress,
    coupon,
    discountAmount,
    grandTotal
  };
}

// 3. Cart Badges Synchronization (Desktop & Mobile Nav)
function updateCartBadges() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const badgeEls = document.querySelectorAll('.cart-badge-count');

  badgeEls.forEach(el => {
    el.textContent = totalCount;
    if (totalCount > 0) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

// 4. Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconName = 'check_circle';
  let iconColor = 'text-green-400';
  if (type === 'error') {
    iconName = 'error';
    iconColor = 'text-red-400';
  } else if (type === 'info') {
    iconName = 'info';
    iconColor = 'text-orange-300';
  }

  const iconSpan = document.createElement('span');
  iconSpan.className = `material-symbols-outlined fill ${iconColor} text-xl flex-shrink-0`;
  iconSpan.textContent = iconName;

  const msgSpan = document.createElement('span');
  msgSpan.className = 'flex-1';
  msgSpan.textContent = message;

  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

// 5. Order Management
function saveOrder(orderData) {
  try {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(orderData));
    clearCart();
    return true;
  } catch (e) {
    console.error('Error saving last order', e);
    return false;
  }
}

function getLastOrder() {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// 6. WhatsApp Link Generator
function generateWhatsAppOrderLink(order) {
  const phone = '6281234567890';
  if (!order) return `https://wa.me/${phone}?text=Halo%20Sambal%20by%20Kazel,%20saya%20ingin%20bertanya%20seputar%20produk`;

  let text = `Halo Admin Sambal by Kazel! 🔥\n`;
  text += `Saya ingin konfirmasi pesanan baru:\n\n`;
  text += `*No. Pesanan:* ${order.invoiceNumber}\n`;
  text += `*Nama Penerima:* ${order.customerName}\n`;
  text += `*No. Telepon:* ${order.customerPhone}\n`;
  text += `*Alamat Pengiriman:* ${order.customerAddress}, ${order.customerCity}\n`;
  text += `*Kurir:* ${order.courierName}\n`;
  text += `*Metode Pembayaran:* ${order.paymentMethodName}\n\n`;
  text += `*Rincian Menu:*\n`;

  order.items.forEach((item, idx) => {
    text += `${idx + 1}. ${item.name} (${item.size}) x${item.qty} - ${formatRupiah(item.price * item.qty)}\n`;
  });

  if (order.giftCardNote) {
    text += `\n*Kartu Ucapan:* "${order.giftCardNote}"\n`;
  }
  if (order.kitchenNote) {
    text += `*Catatan Dapur:* "${order.kitchenNote}"\n`;
  }

  text += `\n*Total Bayar:* *${formatRupiah(order.grandTotal)}*\n`;
  text += `Mohon segera diproses dan dikirimkan resinya ya Kak. Terima kasih! 🙏`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();
});
