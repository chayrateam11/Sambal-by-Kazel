/**
 * Sambal by Kazel - Home Page Interactive Logic
 */

function renderHomePageProducts(category = 'all') {
  const container = document.getElementById('products-grid');
  if (!container || typeof PRODUCTS_DATA === 'undefined') return;

  let filtered = PRODUCTS_DATA;
  if (category !== 'all') {
    filtered = PRODUCTS_DATA.filter(p => p.category === category);
  }

  container.innerHTML = filtered.map(product => `
    <div class="product-card bg-surface-container-lowest rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col">
      <!-- Image & Badges -->
      <div class="img-fallback-wrapper aspect-square relative">
        <img src="${product.image}" 
             alt="${product.name}" 
             onerror="this.onerror=null; this.src=FALLBACK_IMG;"
             class="w-full h-full object-cover">
        
        <div class="absolute top-3 left-3 bg-primary text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <span class="material-symbols-outlined text-xs fill">local_fire_department</span>
          <span>${product.badge}</span>
        </div>

        <div class="absolute bottom-3 left-3 bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface px-2 py-0.5 rounded-md text-[11px] font-bold">
          ${product.size}
        </div>
      </div>

      <!-- Content Details -->
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-on-surface-variant mb-1">
            <span class="font-bold text-secondary uppercase tracking-wider text-[10px]">${product.categoryLabel}</span>
            <div class="flex items-center gap-1">
              ${renderChiliRating(product.spiceLevel)}
            </div>
          </div>

          <a href="produk.html?id=${product.id}" class="hover:text-primary transition-colors">
            <h3 class="font-extrabold text-sm sm:text-base text-on-surface line-clamp-1">${product.name}</h3>
          </a>

          <p class="text-xs text-on-surface-variant line-clamp-2 mt-1 mb-3">
            ${product.description}
          </p>
        </div>

        <!-- Price & Add To Cart Button -->
        <div class="pt-2 border-t border-outline-variant/30 flex items-center justify-between gap-2">
          <div>
            <span class="text-[11px] text-outline line-through block leading-none">${formatRupiah(product.originalPrice)}</span>
            <span class="text-base font-extrabold text-primary">${formatRupiah(product.price)}</span>
          </div>
          <button onclick="addToCart(PRODUCTS_DATA.find(p => p.id === '${product.id}'), 1)" class="px-3 py-2 bg-primary-fixed hover:bg-primary hover:text-white text-primary font-bold text-xs rounded-xl transition-all duration-150 flex items-center gap-1 tap-target" title="Tambah ke keranjang">
            <span class="material-symbols-outlined text-base">add_shopping_cart</span>
            <span>+ Beli</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterCatalog(category, buttonEl) {
  document.querySelectorAll('#categoryFilterContainer .category-btn').forEach(btn => {
    btn.classList.remove('bg-primary', 'text-white');
    btn.classList.add('bg-surface-container-high', 'text-on-surface');
  });
  buttonEl.classList.remove('bg-surface-container-high', 'text-on-surface');
  buttonEl.classList.add('bg-primary', 'text-white');

  renderHomePageProducts(category);
}

function toggleFaq(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-icon');
  const isOpen = content.classList.contains('open');

  document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('open'));
  document.querySelectorAll('.faq-icon').forEach(i => i.style.transform = 'rotate(0deg)');

  if (!isOpen) {
    content.classList.add('open');
    icon.style.transform = 'rotate(180deg)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomePageProducts('all');
});
