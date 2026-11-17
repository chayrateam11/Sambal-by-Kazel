/**
 * Sambal by Kazel - Master Application Logic & State Architecture
 * Cloudflare Pages Static E-Commerce Edition (Vanilla ES6+)
 * 
 * 1. Global Configuration & Feature Flags
 * 2. Single Source of Truth Product Database & Add-ons
 * 3. LocalStorage State Management (Cart & Order History)
 * 4. Google Sheets & Payment Gateway Integrations
 * 5. Reusable Web Components (Header with Mobile Drawer & 12-Col Footer)
 * 6. Toast Notification & Utility Helpers
 */

// ============================================================================
// 1. GLOBAL CONFIGURATION & FEATURE FLAGS
// ============================================================================
const APP_CONFIG = {
  ADMIN_PIN: '202688',
  ENABLE_PAYMENT_GATEWAY: false, // Dimatikan sementara hingga API Midtrans/Xendit siap
  PAYMENT_ENDPOINT: '/api/payment',
  GOOGLE_SHEET_URL: 'https://script.google.com/macros/s/AKfycbxYKZ5-5tLuU-rhaTE-1fCUZZoKT8ej9piDrcDP2AWAKucJ617cRSxqnygHGRUX5cfD/exec',
  // URL Spreadsheet Google Sheets pesanan untuk dibuka langsung oleh Admin/Owner
  // Ganti link di bawah dengan link URL Google Spreadsheet database toko Anda:
  GOOGLE_SHEET_SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit', // Fallback otomatis ke Google Drive / Sheets jika belum diatur
  WHATSAPP_ADMIN: '6281234567890'
};
window.APP_CONFIG = APP_CONFIG;

const CART_STORAGE_KEY = 'sw_cart_v1';
const LAST_ORDER_KEY = 'sw_last_order';
const ORDER_HISTORY_KEY = 'sw_order_history_v1';
const ACTIVE_COUPON_KEY = 'sw_applied_coupon';
const FREE_SHIPPING_MIN = 150000;

const VALID_COUPONS = {
  'PEDASHEMAT': {
    code: 'PEDASHEMAT',
    discount: 15000,
    description: 'Potongan Diskon Rp 15.000 Spesial Pecinta Pedas'
  }
};

// Fallback SVG Data URI untuk mengantisipasi gambar eksternal gagal dimuat
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23f2ede7'/%3E%3Ccircle cx='300' cy='280' r='100' fill='%23f2e4d5'/%3E%3Cpath d='M300 210 C260 210 240 250 240 290 C240 330 270 350 300 350 C330 350 360 330 360 290 C360 250 340 210 300 210 Z' fill='%237c4a27'/%3E%3Cpath d='M300 210 C300 180 320 160 330 150' stroke='%235e361b' stroke-width='8' stroke-linecap='round' fill='none'/%3E%3Ctext x='50%25' y='72%25' dominant-baseline='middle' text-anchor='middle' font-family='Plus Jakarta Sans, sans-serif' font-size='24' fill='%232d1e14' font-weight='bold'%3ESambal by Kazel%3C/text%3E%3Ctext x='50%25' y='79%25' dominant-baseline='middle' text-anchor='middle' font-family='Plus Jakarta Sans, sans-serif' font-size='15' fill='%237c4a27'%3EPedasnya Pas, Rasanya Nagih!%3C/text%3E%3C/svg%3E";

// ============================================================================
// 2. SINGLE SOURCE OF TRUTH PRODUCTS DATA
// ============================================================================
const PRODUCTS_DATA = [
  {
    id: 'sambal-cumi-ijo',
    name: 'Sambal Cumi Asin Cabe Ijo',
    price: 34000,
    originalPrice: 42000,
    size: '150g',
    availableSizes: [
      { label: '150g (Reguler)', multiplier: 1.0 },
      { label: '250g (Puas)', multiplier: 1.6 },
      { label: '300g (Jumbo)', multiplier: 1.9 }
    ],
    spiceLevel: 3,
    category: 'seafood',
    categoryLabel: 'Seafood Series',
    badge: 'Best Seller #1',
    description: 'Kombinasi potongan cumi asin empuk gurih dengan pedas segarnya cabai hijau pilihan khas Sambal by Kazel. Gurih asin cumi menyatu sempurna tanpa amis, lezat dimakan bersama nasi hangat!',
    stock: 45,
    rating: 4.9,
    reviewsCount: 1420,
    ingredients: 'Cumi asin pilihan, cabai hijau segar, bawang merah Brebes, bawang putih, minyak kelapa murni, daun jeruk purut, serai, garam laut, kaldu jamur alami.',
    nutrition: 'Ukuran Porsi: 20g | Energi Total: 140 kkal | Lemak Total: 9g | Protein: 7g | Karbohidrat: 4g | Natrium: 320mg',
    storage: 'Suhu ruang sejuk bertahan 14 hari (segel utuh). Setelah dibuka, simpan di lemari pendingin (chiller) hingga 30 hari. Selalu gunakan sendok kering dan bersih saat mengambil.',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'sambal-bawang-juara',
    name: 'Sambal Bawang Juara',
    price: 28000,
    originalPrice: 35000,
    size: '150g',
    availableSizes: [
      { label: '150g (Reguler)', multiplier: 1.0 },
      { label: '250g (Puas)', multiplier: 1.6 },
      { label: '300g (Jumbo)', multiplier: 1.9 }
    ],
    spiceLevel: 4,
    category: 'bawang',
    categoryLabel: 'Seri Bawang',
    badge: 'Terlaris',
    description: 'Aroma bawang merah Brebes berpadu cabai rawit merah petik pohon pilihan yang digoreng dadakan dengan minyak berkualitas. Gurih gurih pedas menyengat, bikin nambah nasi terus!',
    stock: 60,
    rating: 4.9,
    reviewsCount: 2150,
    ingredients: 'Bawang merah Brebes super, cabai rawit merah pedas, bawang putih kating, minyak kelapa sawit premium, garam beryodium, penyedap rasa alami.',
    nutrition: 'Ukuran Porsi: 20g | Energi Total: 120 kkal | Lemak Total: 8g | Protein: 2g | Karbohidrat: 5g | Natrium: 280mg',
    storage: 'Suhu ruang 14 hari. Di dalam kulkas bertahan hingga 60 hari. Hindari terkena tetesan air langsung ke dalam kemasan.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'sambal-roa-asap',
    name: 'Sambal Roa Asap Manado',
    price: 38000,
    originalPrice: 45000,
    size: '150g',
    availableSizes: [
      { label: '150g (Reguler)', multiplier: 1.0 },
      { label: '250g (Puas)', multiplier: 1.6 },
      { label: '300g (Jumbo)', multiplier: 1.9 }
    ],
    spiceLevel: 4,
    category: 'daerah',
    categoryLabel: 'Resep Nusantara',
    badge: 'Khas Manado',
    description: 'Dibuat dari ikan roa asap asli perairan Manado yang disuwir lembut dan dimasak bersama bumbu cabai rawit merah pedas membara. Aroma smoky khasnya sangat memikat!',
    stock: 30,
    rating: 5.0,
    reviewsCount: 890,
    ingredients: 'Ikan roa asap Manado asli, cabai rawit merah, bawang merah, tomat buah segar, minyak kelapa murni, rempah khas Sulawesi Utara, garam laut.',
    nutrition: 'Ukuran Porsi: 20g | Energi Total: 160 kkal | Lemak Total: 10g | Protein: 11g | Karbohidrat: 3g | Natrium: 340mg',
    storage: 'Suhu ruang 14 hari. Kulkas bertahan 45 hari. Jangan gunakan sendok basah.',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'sambal-teri-crispy',
    name: 'Sambal Teri Crispy Medan',
    price: 32000,
    originalPrice: 38000,
    size: '150g',
    availableSizes: [
      { label: '150g (Reguler)', multiplier: 1.0 },
      { label: '250g (Puas)', multiplier: 1.6 },
      { label: '300g (Jumbo)', multiplier: 1.9 }
    ],
    spiceLevel: 2,
    category: 'seafood',
    categoryLabel: 'Seafood Series',
    badge: 'Kriuk Gurih',
    description: 'Ikan teri nasi Medan kualitas istimewa digoreng sangat renyah tanpa minyak berlebih, dibalut saus sambal manis pedas gurih. Kriuk garingnya awet renyah!',
    stock: 50,
    rating: 4.8,
    reviewsCount: 760,
    ingredients: 'Teri nasi Medan oven, cabai merah keriting, bawang merah, gula aren organik, minyak kelapa, garam rempah.',
    nutrition: 'Ukuran Porsi: 20g | Energi Total: 150 kkal | Lemak Total: 9g | Protein: 9g | Karbohidrat: 6g | Natrium: 310mg',
    storage: 'Suhu ruang bertahan hingga 25 hari dalam wadah tertutup rapat agar kriuk tetap terjaga prima.',
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'sambal-terasi-bakar',
    name: 'Sambal Terasi Bakar Madura',
    price: 31000,
    originalPrice: 36000,
    size: '150g',
    availableSizes: [
      { label: '150g (Reguler)', multiplier: 1.0 },
      { label: '250g (Puas)', multiplier: 1.6 },
      { label: '300g (Jumbo)', multiplier: 1.9 }
    ],
    spiceLevel: 3,
    category: 'daerah',
    categoryLabel: 'Resep Nusantara',
    badge: 'Klasik',
    description: 'Terasi udang rebon pesisir Madura dibakar harum dengan arang batok kelapa, diuleg bersama cabai rawit pedas dan tomat ceri segar. Cita rasa sambal rumahan tempo dulu!',
    stock: 40,
    rating: 4.9,
    reviewsCount: 1120,
    ingredients: 'Terasi udang rebon Madura panggang arang, cabai rawit & keriting, rampai tomat ceri, bawang merah, gula jawa, garam kristal.',
    nutrition: 'Ukuran Porsi: 20g | Energi Total: 110 kkal | Lemak Total: 7g | Protein: 4g | Karbohidrat: 6g | Natrium: 350mg',
    storage: 'Suhu ruang 14 hari. Di kulkas tahan 30 hari.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'sambal-matah-kecombrang',
    name: 'Sambal Matah Kecombrang Bali',
    price: 35000,
    originalPrice: 39000,
    size: '150g',
    availableSizes: [
      { label: '150g (Reguler)', multiplier: 1.0 },
      { label: '250g (Puas)', multiplier: 1.6 },
      { label: '300g (Jumbo)', multiplier: 1.9 }
    ],
    spiceLevel: 2,
    category: 'daerah',
    categoryLabel: 'Resep Nusantara',
    badge: 'Segar Alami',
    description: 'Irisan segar bunga kecombrang wangi khas nusantara, serai muda, daun jeruk purut, dan cabai rawit disiram minyak kelapa panas mendidih serta kucuran perasan limau segar.',
    stock: 35,
    rating: 4.9,
    reviewsCount: 940,
    ingredients: 'Bunga kecombrang segar, cabai rawit merah, serai muda pilihan, daun jeruk purut, bawang merah Bali, minyak kelapa murni (VCO), perasan jeruk limau segar.',
    nutrition: 'Ukuran Porsi: 20g | Energi Total: 130 kkal | Lemak Total: 11g | Protein: 2g | Karbohidrat: 4g | Natrium: 260mg',
    storage: 'Suhu ruang 7 hari. Wajib disimpan di kulkas setelah dibuka agar kesegaran aromatik kecombrang tetap tahan hingga 20 hari.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'paket-pesta-pedas',
    name: 'Paket Pesta Pedas 3 Jar (Bundling)',
    price: 89000,
    originalPrice: 115000,
    size: '3 x 150g',
    availableSizes: [
      { label: '3 x 150g (Paket Bundling)', multiplier: 1.0 }
    ],
    spiceLevel: 4,
    category: 'bundling',
    categoryLabel: 'Paket Hemat',
    badge: 'Hemat 25%',
    description: 'Paket bundling trio terlaris! Berisi 3 varian favorit nusantara: Sambal Cumi Asin Cabe Ijo, Sambal Bawang Juara, dan Sambal Roa Asap Manado. Dikemas dalam box kado eksklusif, cocok untuk stok keluarga maupun bingkisan kerabat!',
    stock: 25,
    rating: 5.0,
    reviewsCount: 3100,
    ingredients: 'Paket 3 varian lengkap: 1x Cumi Ijo 150g, 1x Bawang Juara 150g, 1x Roa Asap 150g.',
    nutrition: 'Bervariasi per varian (rata-rata 130-160 kkal/porsi). Lengkap nutrisi seafood dan rempah segar.',
    storage: 'Suhu ruang 14 hari. Kulkas setelah dibuka. Segel food grade aluminium foil menjaga kesegaran maksimal.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    ]
  }
];

const ADDONS_DATA = [
  {
    id: 'addon-sendok-kayu',
    name: 'Sendok Kayu Jati Dapur Kazel',
    price: 5000,
    originalPrice: 8000,
    size: '1 pcs',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    description: 'Sendok kayu jati alami agar sambal lebih awet dan higienis.'
  },
  {
    id: 'addon-kerupuk-putih',
    name: 'Kerupuk Putih Gurih Renyah',
    price: 8000,
    originalPrice: 12000,
    size: '1 pack (5 pcs)',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
    description: 'Kerupuk kaleng bulat renyah gurih teman makan sambal paling nikmat.'
  }
];

// ============================================================================
// 3. UTILITY FUNCTIONS & HELPERS
// ============================================================================
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

// Toast Notification System
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
  msgSpan.className = 'flex-1 leading-snug';
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
window.showToast = showToast;

// ============================================================================
// 4. LOCALSTORAGE STATE MANAGEMENT (CART & ORDER HISTORY)
// ============================================================================
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
      image: item.image || FALLBACK_IMG,
      category: item.category || 'sambal'
    });
  }

  saveCart(cart);
  if (notify) {
    showToast(`"${item.name}" (${size}) dimasukkan ke keranjang!`, 'success');
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

  const isFreeShipping = subtotal >= FREE_SHIPPING_MIN;
  const freeShippingShortfall = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_MIN) * 100));

  let courierFee = 18000; // Paxel Chilled / Next Day
  if (selectedCourier === 'jnt') {
    courierFee = 12000;
  } else if (selectedCourier === 'grab') {
    courierFee = 32000;
  }

  let shippingFee = courierFee;
  if (isFreeShipping) {
    if (selectedCourier === 'grab') {
      shippingFee = Math.max(0, courierFee - 18000);
    } else {
      shippingFee = 0;
    }
  }

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

// Sinkronisasi badge keranjang tanpa bentrok class hidden dan flex
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

// ============================================================================
// 5. ORDER MANAGEMENT & HISTORY (Riwayat Pesanan & Reorder 1-Klik)
// ============================================================================
function saveOrder(orderData) {
  try {
    // Simpan pesanan terakhir
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(orderData));

    // Simpan ke riwayat pesanan (array)
    let history = getOrderHistory();
    // Hindari duplikasi jika ada orderId sama
    history = history.filter(o => o.invoiceNumber !== orderData.invoiceNumber);
    history.unshift(orderData); // Pesanan terbaru di paling atas
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));

    clearCart();
    return true;
  } catch (e) {
    console.error('Error saving order', e);
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

function getOrderHistory() {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
    
    // Fallback jika belum ada array history, cek last order
    const last = getLastOrder();
    return last ? [last] : [];
  } catch (e) {
    return [];
  }
}
window.getOrderHistory = getOrderHistory;
window.saveOrder = saveOrder;
window.ORDER_HISTORY_KEY = ORDER_HISTORY_KEY;

function reorder(invoiceNumber) {
  const history = getOrderHistory();
  const order = history.find(o => o.invoiceNumber === invoiceNumber);
  if (!order || !order.items || !order.items.length) {
    showToast('Pesanan tidak ditemukan untuk dipesan kembali.', 'error');
    return;
  }

  // Masukkan kembali semua item ke keranjang
  order.items.forEach(item => {
    addToCart(item, item.qty, false);
  });

  showToast(`${order.items.length} varian berhasil dimasukkan ke keranjang!`, 'success');
  
  setTimeout(() => {
    window.location.href = '/keranjang';
  }, 400);
}

// WhatsApp Order Link Generator
function generateWhatsAppOrderLink(order) {
  const phone = APP_CONFIG.WHATSAPP_ADMIN || '6281234567890';
  if (!order) return `https://wa.me/${phone}?text=Halo%20Sambal%20by%20Kazel,%20saya%20ingin%20bertanya%20seputar%20produk`;

  let text = `Halo Admin Sambal by Kazel! 🔥\n`;
  text += `Saya ingin konfirmasi pesanan baru:\n\n`;
  text += `*No. Pesanan:* ${order.invoiceNumber}\n`;
  text += `*Nama Penerima:* ${order.customerName}\n`;
  text += `*No. Telepon / WA:* ${order.customerPhone}\n`;
  text += `*Alamat Pengiriman:* ${order.customerAddress}, ${order.customerCity}\n`;
  text += `*Kurir Pengiriman:* ${order.courierName || 'Paxel Chilled'}\n`;
  text += `*Metode Pembayaran:* ${order.paymentMethodName || 'Transfer Bank'}\n\n`;
  text += `*Rincian Menu:*\n`;

  order.items.forEach((item, idx) => {
    text += `${idx + 1}. ${item.name} (${item.size}) x${item.qty} - ${formatRupiah(item.price * item.qty)}\n`;
  });

  if (order.giftCardNote) {
    text += `\n*Kartu Ucapan Kado:* "${order.giftCardNote}"\n`;
  }
  if (order.kitchenNote) {
    text += `*Catatan Dapur:* "${order.kitchenNote}"\n`;
  }

  text += `\n*Total Bayar:* *${formatRupiah(order.grandTotal)}*\n`;
  text += `\nMohon segera diproses dan dikirimkan resi pengirimannya. Terima kasih! 🙏`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// ============================================================================
// 6. GOOGLE SHEETS SYNC & PAYMENT GATEWAY INTEGRATION
// ============================================================================
async function submitOrderToGoogleSheets(orderData) {
  if (!APP_CONFIG.GOOGLE_SHEET_URL || APP_CONFIG.GOOGLE_SHEET_URL === 'PASTE_URL_WEB_APP_APPS_SCRIPT_DISINI') {
    console.info('Integrasi Google Sheets: URL Web App Apps Script belum disetel.');
    return false;
  }

  try {
    const fullAddress = `${orderData.customerAddress}, ${orderData.customerCity} (${orderData.customerPostal || ''})`;
    
    // Siapkan daftar item dalam format array objek [{ name, qty }] dan string tersusun ke bawah (\n)
    const itemsArray = Array.isArray(orderData.items)
      ? orderData.items.map(i => ({
          name: i.size ? `${i.name} (${i.size})` : (i.name || 'Produk'),
          qty: i.qty || 1
        }))
      : [];

    const itemsFormattedText = itemsArray.length > 0
      ? itemsArray.map(item => `• ${item.name} (${item.qty}x)`).join('\n')
      : (typeof orderData.items === 'string' ? orderData.items : '-');

    const notesFormatted = [orderData.kitchenNote, orderData.giftCardNote ? `Kado: ${orderData.giftCardNote}` : ''].filter(Boolean).join(' | ');

    // Bedakan status awal COD vs Non-COD
    const isCod = String(orderData.paymentMethodName || orderData.paymentCode || '').toLowerCase().includes('cod');
    const orderStatus = orderData.status || (isCod ? 'Diproses' : 'Menunggu Pembayaran');
    const buktiBayar = orderData.buktiBayar || orderData.paymentProofUrl || '-';

    const payload = {
      // Keys Standar & Kompatibel (Mendukung skrip EN & ID)
      orderId: orderData.invoiceNumber,
      invoice: orderData.invoiceNumber,
      invoiceNumber: orderData.invoiceNumber,
      customerName: orderData.customerName,
      nama: orderData.customerName,
      whatsapp: orderData.customerPhone,
      address: fullAddress,
      alamat: fullAddress,
      items: itemsArray.length > 0 ? itemsArray : itemsFormattedText,
      itemsText: itemsFormattedText,
      totalAmount: orderData.grandTotal,
      total: orderData.grandTotal,
      totalBayar: orderData.grandTotal,
      grandTotal: orderData.grandTotal,
      shippingCourier: orderData.courierName,
      courier: orderData.courierName,
      kurir: orderData.courierName,
      paymentMethod: orderData.paymentMethodName,
      metodeBayar: orderData.paymentMethodName,
      notes: notesFormatted,
      catatan: notesFormatted,
      status: orderStatus,
      trackingNumber: orderData.trackingNumber || '',
      noResi: orderData.noResi || orderData.trackingNumber || '',
      buktiBayar: buktiBayar,
      paymentProofUrl: buktiBayar,
      createdAt: orderData.createdAt || new Date().toISOString()
    };

    // no-cors fetch sesuai arsitektur Google Apps Script Web App
    await fetch(APP_CONFIG.GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn('Gagal sinkronisasi data pesanan ke Google Sheets:', err);
    return false;
  }
}

/**
 * Mengunggah data foto bukti transfer (Base64) ke Google Apps Script (Drive)
 */
async function submitPaymentProofToGoogleSheets({ invoice, name, imageBase64 }) {
  if (!APP_CONFIG.GOOGLE_SHEET_URL) {
    return { success: false, message: 'Google Sheets URL belum disetel' };
  }

  try {
    const payload = {
      action: 'uploadProof',
      invoice: invoice,
      invoiceNumber: invoice,
      nama: name,
      customerName: name,
      image: imageBase64
    };

    const response = await fetch(APP_CONFIG.GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    try {
      const result = await response.json();
      return { success: result.status === 'success', data: result };
    } catch (parseErr) {
      return { success: true };
    }
  } catch (err) {
    console.error('Error saat upload bukti pembayaran:', err);
    return { success: false, error: err };
  }
}
window.submitPaymentProofToGoogleSheets = submitPaymentProofToGoogleSheets;

async function processOrderCheckout(orderData) {
  // 1. Simpan order ke localStorage
  saveOrder(orderData);

  // 2. Kirim asynchronous ke Google Sheets jika URL diisi
  submitOrderToGoogleSheets(orderData);

  // 3. Feature Flag: Cek apakah Payment Gateway diaktifkan
  if (APP_CONFIG.ENABLE_PAYMENT_GATEWAY) {
    try {
      showToast('Menghubungkan ke gateway pembayaran...', 'info');
      const response = await fetch(APP_CONFIG.PAYMENT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const result = await response.json();
      if (result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
    } catch (err) {
      console.error('Payment gateway error:', err);
      showToast('Gagal memproses pembayaran otomatis, beralih ke WhatsApp...', 'error');
    }
  }

  // 4. Default: Alur WhatsApp & Status Realtime
  const waUrl = generateWhatsAppOrderLink(orderData);
  window.location.href = `/status?id=${encodeURIComponent(orderData.invoiceNumber)}&autoWa=1`;
}

// ============================================================================
// 7. MOBILE DRAWER CONTROLLER
// ============================================================================
window.toggleMobileDrawer = function(open) {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer || !overlay) return;

  if (open) {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('overflow-hidden');
  } else {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('overflow-hidden');
  }
};

// Tutup drawer jika tombol ESC ditekan
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.toggleMobileDrawer(false);
  }
});

// ============================================================================
// 8. REUSABLE WEB COMPONENTS (HEADER, FOOTER)
// ============================================================================
class AppHeader extends HTMLElement {
  connectedCallback() {
    let active = this.getAttribute('active') || '';
    if (!active) {
      const p = (window.location.pathname || '').replace(/\/$/, '') || '/';
      if (p === '' || p === '/' || p.endsWith('/index')) active = 'beranda';
      else if (p === '/katalog') active = 'katalog';
      else if (p === '/riwayat') active = 'pesanan';
      else if (p.startsWith('/admin')) active = 'admin';
    }

    // Menu Navigasi Lengkap Desktop (Ramping & Proporsional)
    const navItems = [
      { id: 'beranda', label: 'Beranda', href: '/' },
      { id: 'katalog', label: 'Katalog Lengkap', href: '/katalog' },
      { id: 'panduan', label: 'Panduan Simpan', href: '/#panduan' },
      { id: 'ulasan', label: 'Ulasan', href: '/#ulasan' },
      { id: 'faq', label: 'FAQ', href: '/#faq' },
      { id: 'pesanan', label: 'Pesanan Saya', href: '/riwayat' }
    ];

    const navLinksHtml = navItems.map(item => {
      const isActive = active === item.id;
      const classes = isActive
        ? 'px-3.5 py-1.5 rounded-xl bg-primary-fixed/60 text-primary font-semibold whitespace-nowrap transition-colors'
        : 'px-3.5 py-1.5 rounded-xl hover:text-primary hover:bg-surface-container font-medium whitespace-nowrap transition-colors text-on-surface-variant';
      return `<a href="${item.href}" class="${classes}">${item.label}</a>`;
    }).join('\n          ');

    const drawerLinksHtml = navItems.map(item => {
      const isActive = active === item.id;
      const icon = item.id === 'beranda' ? 'home'
                 : item.id === 'katalog' ? 'menu_book'
                 : item.id === 'panduan' ? 'kitchen'
                 : item.id === 'ulasan' ? 'reviews'
                 : item.id === 'faq' ? 'help'
                 : 'history';
      const classes = isActive
        ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-fixed/60 text-primary font-semibold whitespace-nowrap transition-all'
        : 'flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container text-on-surface font-medium whitespace-nowrap transition-all';
      return `
        <a href="${item.href}" onclick="toggleMobileDrawer(false)" class="${classes} tap-target">
          <span class="material-symbols-outlined text-xl ${isActive ? 'fill' : ''}">${icon}</span>
          <span class="text-sm whitespace-nowrap">${item.label}</span>
        </a>
      `;
    }).join('\n');

    this.className = 'block';
    this.innerHTML = `
      <!-- TOP PROMO TICKER (MARQUEE) -->
      <div class="bg-primary text-white overflow-hidden py-2 text-xs md:text-sm font-semibold tracking-wide border-b border-primary-container z-40">
        <div class="marquee-track flex items-center space-x-8">
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">local_fire_department</span> GRATIS ONGKIR SE-INDONESIA MIN. BELANJA RP 150.000</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">confirmation_number</span> KODE PROMO 'PEDASHEMAT' POTONGAN RP 15.000</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">verified</span> 100% ALAMI TANPA PENGAWET BUATAN</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">shield</span> GARANSI PENGIRIMAN AMAN DOUBLE SEAL</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">local_fire_department</span> GRATIS ONGKIR SE-INDONESIA MIN. BELANJA RP 150.000</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">confirmation_number</span> KODE PROMO 'PEDASHEMAT' POTONGAN RP 15.000</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">verified</span> 100% ALAMI TANPA PENGAWET BUATAN</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-yellow-300">shield</span> GARANSI PENGIRIMAN AMAN DOUBLE SEAL</span>
          <span>•</span>
        </div>
      </div>

      <!-- STICKY TOP NAVBAR -->
      <header class="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/40 shadow-sm transition-all duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pr-6 lg:pr-8 flex items-center justify-between gap-4 py-2.5">
            
          <!-- Brand Logo (shrink-0) -->
          <a href="/" class="flex items-center group focus:outline-none focus:ring-2 focus:ring-primary rounded-xl shrink-0" aria-label="Sambal by Kazel">
            <img src="/assets/images/logo.png" alt="Sambal by Kazel" class="h-14 sm:h-16 lg:h-[72px] w-auto object-contain shrink-0 mix-blend-multiply">
          </a>

          <!-- Desktop Navigation Links (hidden lg:flex items-center gap-3.5 xl:gap-6 text-[13px] xl:text-sm font-medium) -->
          <nav class="hidden lg:flex items-center gap-3.5 xl:gap-6 text-[13px] xl:text-sm font-medium text-on-surface-variant">
            ${navLinksHtml}
          </nav>

          <!-- Desktop Action Buttons (hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0) -->
          <div class="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            <a href="/katalog" class="p-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-xl transition-colors" title="Cari Sambal">
              <span class="material-symbols-outlined text-2xl">search</span>
            </a>

            <a href="/keranjang" class="relative inline-flex items-center justify-center p-2.5 bg-surface-container hover:bg-primary-fixed/50 text-on-surface rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary tap-target" title="Lihat Keranjang">
              <span class="material-symbols-outlined text-2xl text-primary">shopping_bag</span>
              <span class="cart-badge-count hidden absolute -top-1.5 -right-1.5 bg-primary text-white text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full items-center justify-center shadow-md animate-pulse">0</span>
            </a>

            <a href="https://wa.me/${APP_CONFIG.WHATSAPP_ADMIN}?text=Halo%20Admin%20Sambal%20by%20Kazel,%20saya%20ingin%20tanya%20varian%20sambal" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 whitespace-nowrap transition-colors">
              <span class="material-symbols-outlined text-base text-green-600">chat</span>
              <span class="whitespace-nowrap">WhatsApp</span>
            </a>
          </div>

          <!-- Mobile Action Bar (lg:hidden: search, shopping_bag with badge, hamburger menu) -->
          <div class="flex lg:hidden items-center gap-1 sm:gap-2 shrink-0">
            <a href="/katalog" class="p-2 text-on-surface-variant hover:text-primary rounded-xl tap-target flex items-center justify-center" aria-label="Cari Produk">
              <span class="material-symbols-outlined text-2xl">search</span>
            </a>

            <a href="/keranjang" class="relative p-2 text-on-surface-variant hover:text-primary rounded-xl tap-target flex items-center justify-center" aria-label="Keranjang Belanja">
              <span class="material-symbols-outlined text-2xl text-primary">shopping_bag</span>
              <span class="cart-badge-count hidden absolute top-0.5 right-0.5 bg-primary text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full items-center justify-center shadow">0</span>
            </a>

            <button onclick="toggleMobileDrawer(true)" class="p-2 text-on-surface hover:text-primary rounded-xl tap-target flex items-center justify-center focus:outline-none" aria-label="Buka Menu Navigasi">
              <span class="material-symbols-outlined text-2xl">menu</span>
            </button>
          </div>

        </div>
      </header>

      <!-- MOBILE SLIDE-OUT DRAWER & OVERLAY -->
      <div id="drawer-overlay" onclick="toggleMobileDrawer(false)" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"></div>
      
      <aside id="mobile-drawer" class="fixed top-0 right-0 bottom-0 w-[82vw] max-w-sm bg-surface-container-lowest z-50 shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-outline-variant/40" aria-label="Menu Mobile">
        <div class="p-5">
          <!-- Drawer Header -->
          <div class="flex items-center justify-between pb-4 border-b border-outline-variant/40">
            <a href="/" onclick="toggleMobileDrawer(false)" class="flex items-center shrink-0" aria-label="Sambal by Kazel">
              <img src="/assets/images/logo.png" alt="Sambal by Kazel" class="h-14 sm:h-16 w-auto object-contain shrink-0 mix-blend-multiply">
            </a>
            <button onclick="toggleMobileDrawer(false)" class="p-2 text-on-surface-variant hover:text-primary rounded-lg tap-target flex items-center justify-center" aria-label="Tutup Menu">
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <!-- Drawer Navigation Links -->
          <nav class="space-y-1.5 mt-4">
            ${drawerLinksHtml}
          </nav>
        </div>

        <!-- Drawer Footer Actions -->
        <div class="p-5 border-t border-outline-variant/40 space-y-3 bg-surface-container-low/50">
          <a href="/status" onclick="toggleMobileDrawer(false)" class="w-full py-3 px-4 rounded-xl font-bold text-xs text-center bg-primary text-white hover:bg-primary-container flex items-center justify-center gap-2 shadow-md tap-target">
            <span class="material-symbols-outlined text-lg">local_shipping</span>
            <span>Lacak Pesanan Saya</span>
          </a>

          <a href="https://wa.me/${APP_CONFIG.WHATSAPP_ADMIN}?text=Halo%20Admin%20Sambal%20by%20Kazel" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-center text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 flex items-center justify-center gap-2 tap-target">
            <span class="material-symbols-outlined text-base text-green-600">chat</span>
            <span>Hubungi WhatsApp Admin</span>
          </a>
        </div>
      </aside>
    `;

    updateCartBadges();
  }
}

class AppFooter extends HTMLElement {
  connectedCallback() {
    this.className = 'block';
    this.innerHTML = `
      <footer class="bg-surface-container-high border-t border-outline-variant/60 pt-12 pb-12 text-on-surface">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <!-- FOOTER RAMPING & PROFESIONAL (GRID lg:grid-cols-12) -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 mb-10">
            
            <!-- Kolom 1 (lg:col-span-4): Logo & Deskripsi Singkat 2 Baris + Badges -->
            <div class="lg:col-span-4 space-y-3.5">
              <a href="/" class="inline-block shrink-0" aria-label="Sambal by Kazel">
                <img src="/assets/images/logo.png" alt="Sambal by Kazel" class="h-20 lg:h-24 w-auto object-contain mix-blend-multiply">
              </a>
              
              <p class="text-xs sm:text-sm text-on-surface-variant leading-relaxed line-clamp-2 max-w-sm">
                Pelopor aneka sambal kemasan rumahan otentik khas Sambal by Kazel. Pedasnya Pas, Rasanya Nagih! Dimasak segar tanpa pengawet buatan untuk menjaga cita rasa terbaik kuliner Indonesia.
              </p>

              <div class="flex items-center gap-2.5 pt-1">
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-surface-container-lowest rounded-md border border-outline-variant/50">
                  <span class="material-symbols-outlined text-xs text-green-600">verified</span> 100% Halal
                </span>
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-surface-container-lowest rounded-md border border-outline-variant/50">
                  <span class="material-symbols-outlined text-xs text-primary">eco</span> Fresh Ingredients
                </span>
              </div>
            </div>

            <!-- Kolom 2 (lg:col-span-2): Navigasi 4 Tautan Inti -->
            <div class="lg:col-span-2">
              <h4 class="font-bold text-xs uppercase tracking-wider text-on-surface mb-3.5">Navigasi</h4>
              <ul class="space-y-2 text-xs sm:text-sm text-on-surface-variant">
                <li><a href="/" class="hover:text-primary transition-colors">Beranda</a></li>
                <li><a href="/katalog" class="hover:text-primary transition-colors">Katalog Lengkap</a></li>
                <li><a href="/riwayat" class="hover:text-primary transition-colors">Pesanan Saya</a></li>
                <li><a href="/status" class="hover:text-primary transition-colors">Lacak Pesanan</a></li>
              </ul>
            </div>

            <!-- Kolom 3 (lg:col-span-3): Varian Favorit (4 Menu Terlaris) -->
            <div class="lg:col-span-3">
              <h4 class="font-bold text-xs uppercase tracking-wider text-on-surface mb-3.5">Varian Favorit</h4>
              <ul class="space-y-2 text-xs sm:text-sm text-on-surface-variant">
                <li><a href="/produk?id=sambal-cumi-ijo" class="hover:text-primary transition-colors">Sambal Cumi Cabe Ijo</a></li>
                <li><a href="/produk?id=sambal-bawang-juara" class="hover:text-primary transition-colors">Sambal Bawang Juara</a></li>
                <li><a href="/produk?id=sambal-roa-asap" class="hover:text-primary transition-colors">Sambal Roa Asap Manado</a></li>
                <li><a href="/produk?id=paket-pesta-pedas" class="hover:text-primary transition-colors">Paket Pesta Pedas 3 Jar</a></li>
              </ul>
            </div>

            <!-- Kolom 4 (lg:col-span-3): Layanan Pelanggan & WhatsApp Button -->
            <div class="lg:col-span-3">
              <h4 class="font-bold text-xs uppercase tracking-wider text-on-surface mb-3.5">Layanan Pelanggan</h4>
              <p class="text-xs text-on-surface-variant mb-1 font-medium">Dapur Produksi & Hub: Bogor</p>
              <p class="text-xs text-on-surface-variant mb-3">Senin - Minggu: 08.00 - 20.00 WIB</p>
              <a href="https://wa.me/${APP_CONFIG.WHATSAPP_ADMIN}?text=Halo%20Admin%20Sambal%20by%20Kazel" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm tap-target">
                <span class="material-symbols-outlined text-base">chat</span>
                <span>Hubungi WhatsApp</span>
              </a>
            </div>

          </div>

          <!-- Baris Bawah: Hak Cipta di Tengah -->
          <div class="pt-6 border-t border-outline-variant/40 text-center text-xs text-on-surface-variant">
            <p>© 2026 Sambal by Kazel. Hak Cipta Dilindungi Undang-Undang.</p>
          </div>

        </div>
      </footer>
    `;
  }
}

// Registrasi Custom Elements
customElements.define('app-header', AppHeader);
customElements.define('app-footer', AppFooter);

// Inisialisasi awal saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();
});
