/**
 * Sambal by Kazel - Product Detail Page Interactive Logic
 */

let currentProduct = null;
let selectedSpice = 3;
let selectedSize = '150g';
let selectedSizeMultiplier = 1.0;
let quantity = 1;

function initProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const prodId = urlParams.get('id') || 'sambal-cumi-ijo';

  if (typeof PRODUCTS_DATA === 'undefined') return;

  currentProduct = PRODUCTS_DATA.find(p => p.id === prodId) || PRODUCTS_DATA[0];
  selectedSpice = currentProduct.spiceLevel;

  // Populate text details
  document.title = `${currentProduct.name} - Sambal by Kazel`;
  const breadcrumb = document.getElementById('breadcrumbProductName');
  if (breadcrumb) breadcrumb.textContent = currentProduct.name;
  
  const title = document.getElementById('productTitle');
  if (title) title.textContent = currentProduct.name;

  const desc = document.getElementById('productDesc');
  if (desc) desc.textContent = currentProduct.description;

  const catBadge = document.getElementById('productCategoryBadge');
  if (catBadge) catBadge.textContent = currentProduct.categoryLabel;

  const ratingText = document.getElementById('productRatingText');
  if (ratingText) ratingText.textContent = `${currentProduct.rating} (${currentProduct.reviewsCount} ulasan)`;

  const badgeTag = document.getElementById('productBadgeTag');
  if (badgeTag) {
    const lastSpan = badgeTag.querySelector('span:last-child');
    if (lastSpan) lastSpan.textContent = currentProduct.badge;
  }

  const tabIng = document.getElementById('tabIngredientsText');
  if (tabIng) tabIng.textContent = currentProduct.ingredients;

  const tabNut = document.getElementById('tabNutritionText');
  if (tabNut) tabNut.textContent = currentProduct.nutrition;

  const tabStor = document.getElementById('tabStorageText');
  if (tabStor) tabStor.textContent = currentProduct.storage;

  // Populate main image
  const mainImg = document.getElementById('mainGalleryImg');
  if (mainImg) mainImg.src = currentProduct.image;

  // Populate thumbnails
  const thumbsContainer = document.getElementById('thumbnailRow');
  if (thumbsContainer) {
    const gallery = currentProduct.gallery || [currentProduct.image];
    thumbsContainer.innerHTML = gallery.map((imgUrl, idx) => `
      <button type="button" onclick="setMainImage('${imgUrl}', this)" class="thumb-btn ${idx === 0 ? 'ring-2 ring-primary' : 'opacity-70'} rounded-xl overflow-hidden aspect-square bg-surface-container border border-outline-variant/60 focus:outline-none">
        <img src="${imgUrl}" alt="Thumbnail ${idx+1}" onerror="this.onerror=null; this.src=FALLBACK_IMG;" class="w-full h-full object-cover">
      </button>
    `).join('');
  }

  // Populate Sizes
  const sizeContainer = document.getElementById('sizeSelectorContainer');
  const sizes = currentProduct.availableSizes || [{ label: '150g (Reguler)', multiplier: 1.0 }];
  selectedSize = sizes[0].label.split(' ')[0];
  selectedSizeMultiplier = sizes[0].multiplier;

  if (sizeContainer) {
    sizeContainer.innerHTML = sizes.map((s, idx) => {
      const sizeShort = s.label.split(' ')[0];
      const isSelected = idx === 0;
      return `
        <button type="button" onclick="selectSize('${sizeShort}', ${s.multiplier}, '${s.label}', this)" class="size-btn p-3 rounded-xl ${isSelected ? 'border-2 border-secondary bg-secondary-fixed/30' : 'border border-outline-variant/60'} text-xs font-bold text-center transition-all">
          <span class="block text-on-surface">${s.label}</span>
        </button>
      `;
    }).join('');
  }

  const selectedSizeEl = document.getElementById('selectedSizeLabel');
  if (selectedSizeEl) selectedSizeEl.textContent = sizes[0].label;

  selectSpiceLevel(selectedSpice);
  updatePriceDisplay();
  renderRelatedProducts();
}

function setMainImage(imgUrl, btn) {
  const mainImg = document.getElementById('mainGalleryImg');
  if (mainImg) mainImg.src = imgUrl;

  document.querySelectorAll('#thumbnailRow .thumb-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-primary');
    b.classList.add('opacity-70');
  });
  if (btn) {
    btn.classList.add('ring-2', 'ring-primary');
    btn.classList.remove('opacity-70');
  }
}

function selectSpiceLevel(level) {
  selectedSpice = level;
  const labels = {
    2: 'Level 2 (Gurih Sedang)',
    3: 'Level 3 (Mantap Pedas)',
    4: 'Level 4 (Juara Pedas Ekstra)'
  };
  const labelEl = document.getElementById('selectedSpiceLabel');
  if (labelEl) labelEl.textContent = labels[level] || `Level ${level}`;

  document.querySelectorAll('#spiceLevelSelector .spice-btn').forEach(btn => {
    const btnLevel = parseInt(btn.getAttribute('data-level'), 10);
    if (btnLevel === level) {
      btn.className = 'spice-btn p-3 rounded-xl border-2 border-primary bg-primary-fixed/30 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all';
    } else {
      btn.className = 'spice-btn p-3 rounded-xl border border-outline-variant/60 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all';
    }
  });
}

function selectSize(sizeCode, multiplier, label, btn) {
  selectedSize = sizeCode;
  selectedSizeMultiplier = multiplier;
  const labelEl = document.getElementById('selectedSizeLabel');
  if (labelEl) labelEl.textContent = label;

  document.querySelectorAll('#sizeSelectorContainer .size-btn').forEach(b => {
    b.className = 'size-btn p-3 rounded-xl border border-outline-variant/60 text-xs font-bold text-center transition-all';
  });
  if (btn) {
    btn.className = 'size-btn p-3 rounded-xl border-2 border-secondary bg-secondary-fixed/30 text-xs font-bold text-center transition-all';
  }

  updatePriceDisplay();
}

function changeQty(delta) {
  const next = quantity + delta;
  if (next >= 1 && next <= 50) {
    quantity = next;
    const qtyDisplay = document.getElementById('productQtyDisplay');
    if (qtyDisplay) qtyDisplay.textContent = quantity;
    updatePriceDisplay();
  }
}

function getCurrentUnitPrices() {
  if (!currentProduct) return { unitPrice: 0, unitOrigPrice: 0 };
  const unitPrice = Math.round(currentProduct.price * selectedSizeMultiplier);
  const unitOrigPrice = Math.round(currentProduct.originalPrice * selectedSizeMultiplier);
  return { unitPrice, unitOrigPrice };
}

function updatePriceDisplay() {
  const { unitPrice, unitOrigPrice } = getCurrentUnitPrices();
  const curEl = document.getElementById('currentPrice');
  const origEl = document.getElementById('originalPrice');
  const subEl = document.getElementById('calculatedSubtotal');

  if (curEl) curEl.textContent = formatRupiah(unitPrice);
  if (origEl) origEl.textContent = formatRupiah(unitOrigPrice);
  if (subEl) subEl.textContent = formatRupiah(unitPrice * quantity);
}

function handleAddToCartClick() {
  const { unitPrice, unitOrigPrice } = getCurrentUnitPrices();
  const cartItem = {
    id: currentProduct.id,
    name: currentProduct.name,
    price: unitPrice,
    originalPrice: unitOrigPrice,
    size: selectedSize,
    spiceLevel: selectedSpice,
    image: currentProduct.image,
    category: currentProduct.category
  };
  addToCart(cartItem, quantity, true);
}

function handleBuyNowClick() {
  handleAddToCartClick();
  window.location.href = '/keranjang';
}

function switchProductTab(tabId, btn) {
  document.querySelectorAll('.product-tab-btn').forEach(b => {
    b.className = 'product-tab-btn pb-3 text-on-surface-variant hover:text-primary';
  });
  if (btn) {
    btn.className = 'product-tab-btn active pb-3 text-primary border-b-2 border-primary';
  }

  document.querySelectorAll('.product-tab-panel').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove('hidden');
}

function renderRelatedProducts() {
  const container = document.getElementById('relatedProductsGrid');
  if (!container || !currentProduct || typeof PRODUCTS_DATA === 'undefined') return;

  const related = PRODUCTS_DATA.filter(p => p.id !== currentProduct.id).slice(0, 4);
  container.innerHTML = related.map(prod => `
    <div class="product-card bg-surface-container-lowest rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col">
      <div class="img-fallback-wrapper aspect-square relative">
        <img src="${prod.image}" alt="${prod.name}" onerror="this.onerror=null; this.src=FALLBACK_IMG;" class="w-full h-full object-cover">
        <div class="absolute top-2.5 left-2.5 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
          ${prod.badge}
        </div>
      </div>
      <div class="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-[11px] mb-1">
            <span class="text-secondary font-bold">${prod.categoryLabel}</span>
            ${renderChiliRating(prod.spiceLevel)}
          </div>
          <a href="/produk?id=${prod.id}" class="hover:text-primary">
            <h4 class="font-extrabold text-sm text-on-surface line-clamp-1">${prod.name}</h4>
          </a>
        </div>
        <div class="pt-2 flex items-center justify-between mt-2">
          <span class="text-sm font-extrabold text-primary">${formatRupiah(prod.price)}</span>
          <a href="/produk?id=${prod.id}" class="px-2.5 py-1.5 bg-surface-container hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors">
            Detail
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initProductDetail();
});
