/**
 * Sambal by Kazel - Catalog Page Interactive Logic
 * Cloudflare Pages Static E-Commerce Edition
 */

// State Filter & Pagination Katalog
let currentCategory = 'all';
let currentSpice = 'all';
let maxPrice = 120000;
let currentSearch = '';
let currentSort = 'default';
let currentPage = 1;
const itemsPerPage = 6;

// Baca query string parameter (misal: ?category=bundling)
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam) {
    const validCategories = ['all', 'seafood', 'bawang', 'daerah', 'bundling'];
    if (validCategories.includes(catParam)) {
      currentCategory = catParam;
      try {
        const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(catParam) : catParam;
        const radio = document.querySelector(`input[name="categoryFilter"][value="${escaped}"]`);
        if (radio) radio.checked = true;
      } catch (e) {
        console.warn('Invalid selector query for category filter:', e);
      }
    }
  }
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  const emptyState = document.getElementById('emptyCatalogState');
  const counterEl = document.getElementById('resultsCount');
  const paginationEl = document.getElementById('catalogPagination');

  if (!grid || typeof PRODUCTS_DATA === 'undefined') return;

  let list = PRODUCTS_DATA.filter(p => {
    const matchCategory = currentCategory === 'all' || p.category === currentCategory;
    const matchSpice = currentSpice === 'all' || p.spiceLevel.toString() === currentSpice;
    const matchPrice = p.price <= maxPrice;
    const matchSearch = currentSearch === '' || 
      p.name.toLowerCase().includes(currentSearch.toLowerCase()) || 
      p.description.toLowerCase().includes(currentSearch.toLowerCase());

    return matchCategory && matchSpice && matchPrice && matchSearch;
  });

  // Sorting
  if (currentSort === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'spice-desc') {
    list.sort((a, b) => b.spiceLevel - a.spiceLevel);
  } else if (currentSort === 'spice-asc') {
    list.sort((a, b) => a.spiceLevel - b.spiceLevel);
  }

  const totalResults = list.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  if (counterEl) {
    counterEl.textContent = `Menampilkan ${totalResults} varian (Halaman ${currentPage} dari ${totalPages})`;
  }

  if (totalResults === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  // Pagination Slice
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);

  grid.innerHTML = paginatedList.map(product => `
    <div class="product-card bg-surface-container-lowest rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col">
      <!-- Image -->
      <div class="img-fallback-wrapper aspect-square relative">
        <img src="${product.image}" 
             alt="${product.name}" 
             onerror="this.src=FALLBACK_IMG; this.removeAttribute('onerror');"
             class="w-full h-full object-cover">
        
        <div class="absolute top-3 left-3 bg-primary text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <span class="material-symbols-outlined text-xs fill">local_fire_department</span>
          <span>${product.badge}</span>
        </div>

        <div class="absolute bottom-3 left-3 bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface px-2 py-0.5 rounded-md text-[11px] font-bold">
          ${product.size}
        </div>
      </div>

      <!-- Info -->
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

        <!-- Footer Card -->
        <div class="pt-2 border-t border-outline-variant/30 flex items-center justify-between gap-2">
          <div>
            <span class="text-[11px] text-outline line-through block leading-none">${formatRupiah(product.originalPrice)}</span>
            <span class="text-base font-extrabold text-primary">${formatRupiah(product.price)}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <a href="produk.html?id=${product.id}" class="p-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-xl transition-colors" title="Lihat Detail">
              <span class="material-symbols-outlined text-base">visibility</span>
            </a>
            <button onclick="addToCart(PRODUCTS_DATA.find(p => p.id === '${product.id}'), 1)" class="px-3 py-2 bg-primary text-white hover:bg-primary-container font-bold text-xs rounded-xl transition-all duration-150 flex items-center gap-1 tap-target" title="Tambah ke keranjang">
              <span class="material-symbols-outlined text-base">add_shopping_cart</span>
              <span>+ Beli</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Render Pagination Controls
  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById('catalogPagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <nav class="flex items-center gap-1.5" aria-label="Navigasi Halaman Katalog">
      <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-surface-container"'} class="p-2 rounded-xl border border-outline-variant/60 text-on-surface tap-target flex items-center justify-center">
        <span class="material-symbols-outlined text-lg">chevron_left</span>
      </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    html += `
      <button onclick="changePage(${i})" class="w-10 h-10 rounded-xl text-xs font-bold transition-all tap-target flex items-center justify-center ${isActive ? 'bg-primary text-white shadow-sm' : 'border border-outline-variant/60 text-on-surface hover:bg-surface-container'}">
        ${i}
      </button>
    `;
  }

  html += `
      <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-surface-container"'} class="p-2 rounded-xl border border-outline-variant/60 text-on-surface tap-target flex items-center justify-center">
        <span class="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </nav>
  `;

  container.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  renderCatalog();
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

function handleCategoryFilter(val) {
  currentCategory = val;
  currentPage = 1;
  renderCatalog();
}

function handleSpiceFilter(val) {
  currentSpice = val;
  currentPage = 1;
  renderCatalog();
}

function handlePriceRange(val) {
  maxPrice = parseInt(val, 10);
  const display = document.getElementById('priceDisplay');
  if (display) display.textContent = formatRupiah(maxPrice);
  currentPage = 1;
  renderCatalog();
}

function handleSearch(val) {
  currentSearch = val.trim();
  currentPage = 1;
  renderCatalog();
}

function handleSort(val) {
  currentSort = val;
  currentPage = 1;
  renderCatalog();
}

function resetFilters() {
  currentCategory = 'all';
  currentSpice = 'all';
  maxPrice = 120000;
  currentSearch = '';
  currentSort = 'default';
  currentPage = 1;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  const priceRange = document.getElementById('priceRangeInput');
  if (priceRange) priceRange.value = 120000;
  const display = document.getElementById('priceDisplay');
  if (display) display.textContent = formatRupiah(120000);

  const catRadio = document.querySelector('input[name="categoryFilter"][value="all"]');
  if (catRadio) catRadio.checked = true;

  const spiceRadio = document.querySelector('input[name="spiceFilter"][value="all"]');
  if (spiceRadio) spiceRadio.checked = true;

  const sort1 = document.getElementById('desktopSortSelect');
  if (sort1) sort1.value = 'default';
  const sort2 = document.getElementById('mobileSortSelect');
  if (sort2) sort2.value = 'default';

  renderCatalog();
}

function toggleMobileFilter(open) {
  const drawer = document.getElementById('mobileFilterDrawer');
  if (!drawer) return;
  if (open) {
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
  }
}

function applyMobileCategory(cat) {
  handleCategoryFilter(cat);
  const radio = document.querySelector(`input[name="categoryFilter"][value="${cat}"]`);
  if (radio) radio.checked = true;
}

function applyMobileSpice(lvl) {
  handleSpiceFilter(lvl);
  const radio = document.querySelector(`input[name="spiceFilter"][value="${lvl}"]`);
  if (radio) radio.checked = true;
}

document.addEventListener('DOMContentLoaded', () => {
  parseUrlParams();
  renderCatalog();
});
