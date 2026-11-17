/**
 * Sambal by Kazel - Reusable Web Components (Header, Footer, Mobile Nav)
 * Zero build step, runs natively in any browser & Cloudflare Pages
 */

class AppHeader extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute('active') || '';

    const navItems = [
      { id: 'beranda', label: 'Beranda', href: 'index.html' },
      { id: 'katalog', label: 'Katalog Lengkap', href: 'katalog.html' },
      { id: 'panduan', label: 'Panduan Simpan', href: 'index.html#panduan' },
      { id: 'ulasan', label: 'Ulasan', href: 'index.html#ulasan' },
      { id: 'faq', label: 'FAQ', href: 'index.html#faq' },
      { id: 'pesanan', label: 'Pesanan Saya', href: 'riwayat.html' }
    ];

    const navLinksHtml = navItems.map(item => {
      const isActive = active === item.id;
      const classes = isActive
        ? 'px-3.5 py-1.5 rounded-xl bg-primary-fixed/60 text-primary font-semibold whitespace-nowrap transition-colors'
        : 'px-3.5 py-1.5 rounded-xl hover:text-primary hover:bg-surface-container font-medium whitespace-nowrap transition-colors text-on-surface-variant';
      return `<a href="${item.href}" class="${classes}">${item.label}</a>`;
    }).join('\n          ');

    const cartBtnClasses = active === 'keranjang'
      ? 'relative inline-flex items-center justify-center p-2.5 bg-primary text-white rounded-xl shadow-md transition-all duration-200 tap-target'
      : 'relative inline-flex items-center justify-center p-2.5 bg-surface-container hover:bg-primary-fixed/50 text-on-surface rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary tap-target';

    const cartIconClasses = active === 'keranjang'
      ? 'material-symbols-outlined text-2xl text-white'
      : 'material-symbols-outlined text-2xl text-primary';

    const cartBadgeClasses = active === 'keranjang'
      ? 'cart-badge-count hidden absolute -top-1.5 -right-1.5 bg-white text-primary text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full items-center justify-center shadow-md animate-pulse'
      : 'cart-badge-count hidden absolute -top-1.5 -right-1.5 bg-primary text-white text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full items-center justify-center shadow-md animate-pulse';

    this.className = 'block';
    this.innerHTML = `
      <!-- TOP PROMO TICKER -->
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

      <!-- STICKY TOP NAVIGATION -->
      <header class="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/40 shadow-sm transition-all duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pr-6 lg:pr-8 flex items-center justify-between gap-4 py-2.5">
            
          <!-- Brand Logo (shrink-0) -->
          <a href="index.html" class="flex items-center group focus:outline-none focus:ring-2 focus:ring-primary rounded-xl shrink-0" aria-label="Sambal by Kazel">
            <img src="assets/images/logo.png" alt="Sambal by Kazel" class="h-14 sm:h-16 lg:h-[72px] w-auto object-contain shrink-0 mix-blend-multiply">
          </a>

          <!-- Desktop Navigation Links (hidden lg:flex items-center gap-3.5 xl:gap-6 text-[13px] xl:text-sm font-medium) -->
          <nav class="hidden lg:flex items-center gap-3.5 xl:gap-6 text-[13px] xl:text-sm font-medium text-on-surface-variant">
            ${navLinksHtml}
          </nav>

          <!-- Right Action Buttons -->
          <div class="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            <a href="katalog.html" class="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-xl transition-colors" title="Cari Sambal">
              <span class="material-symbols-outlined text-2xl">search</span>
            </a>

            <!-- Cart Icon with Live Counter -->
            <a href="keranjang.html" class="${cartBtnClasses}" title="Lihat Keranjang">
              <span class="${cartIconClasses}">shopping_bag</span>
              <span class="${cartBadgeClasses}">0</span>
            </a>

            <!-- WhatsApp Quick Contact (Desktop) -->
            <a href="https://wa.me/6281234567890?text=Halo%20Admin%20Sambal%20by%20Kazel,%20saya%20ingin%20tanya%20varian%20sambal" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 whitespace-nowrap transition-colors">
              <span class="material-symbols-outlined text-base text-green-600">chat</span>
              <span class="whitespace-nowrap">WhatsApp</span>
            </a>
          </div>

            <!-- Mobile Action Bar -->
            <div class="flex lg:hidden items-center gap-1 sm:gap-2 shrink-0">
              <a href="katalog.html" class="p-2 text-on-surface-variant hover:text-primary rounded-xl tap-target flex items-center justify-center" aria-label="Cari Produk">
                <span class="material-symbols-outlined text-2xl">search</span>
              </a>

              <a href="keranjang.html" class="relative p-2 text-on-surface-variant hover:text-primary rounded-xl tap-target flex items-center justify-center" aria-label="Keranjang Belanja">
                <span class="material-symbols-outlined text-2xl text-primary">shopping_bag</span>
                <span class="cart-badge-count hidden absolute top-0.5 right-0.5 bg-primary text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full items-center justify-center shadow">0</span>
              </a>

              <button onclick="toggleMobileDrawer(true)" class="p-2 text-on-surface hover:text-primary rounded-xl tap-target flex items-center justify-center focus:outline-none" aria-label="Buka Menu Navigasi">
                <span class="material-symbols-outlined text-2xl">menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    `;

    if (typeof updateCartBadges === 'function') {
      updateCartBadges();
    }
  }
}

class AppFooter extends HTMLElement {
  connectedCallback() {
    this.className = 'block';
    this.innerHTML = `
      <footer class="bg-surface-container-high border-t border-outline-variant/60 pt-12 pb-24 md:pb-12 text-on-surface">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            
            <!-- Brand Info -->
            <div class="lg:col-span-2 space-y-4">
              <a href="index.html" class="inline-block shrink-0" aria-label="Sambal by Kazel">
                <img src="assets/images/logo.png" alt="Sambal by Kazel" class="h-20 lg:h-24 w-auto object-contain mix-blend-multiply">
              </a>
              <p class="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-sm">
                Pelopor aneka sambal kemasan rumahan otentik khas Sambal by Kazel. Pedasnya Pas, Rasanya Nagih! Dimasak segar tanpa pengawet buatan demi melestarikan kekayaan rasa kuliner Indonesia.
              </p>
              <div class="flex items-center gap-3 pt-1">
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-surface-container-lowest rounded-md border border-outline-variant/50">
                  <span class="material-symbols-outlined text-xs text-green-600">verified</span> 100% Halal
                </span>
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-surface-container-lowest rounded-md border border-outline-variant/50">
                  <span class="material-symbols-outlined text-xs text-primary">eco</span> Fresh Ingredients
                </span>
              </div>
            </div>

            <!-- Quick Links -->
            <div>
              <h4 class="font-bold text-sm text-on-surface mb-3 uppercase tracking-wider">Halaman Utama</h4>
              <ul class="space-y-2 text-xs sm:text-sm text-on-surface-variant">
                <li><a href="index.html" class="hover:text-primary transition-colors">Beranda</a></li>
                <li><a href="katalog.html" class="hover:text-primary transition-colors">Katalog Lengkap</a></li>
                <li><a href="produk.html?id=sambal-cumi-ijo" class="hover:text-primary transition-colors">Detail Produk Favorit</a></li>
                <li><a href="keranjang.html" class="hover:text-primary transition-colors">Keranjang Belanja</a></li>
                <li><a href="checkout.html" class="hover:text-primary transition-colors">Checkout Pesanan</a></li>
                <li><a href="status.html" class="hover:text-primary transition-colors">Lacak Pesanan Real-time</a></li>
              </ul>
            </div>

            <!-- Varian Unggulan -->
            <div>
              <h4 class="font-bold text-sm text-on-surface mb-3 uppercase tracking-wider">Menu Pilihan</h4>
              <ul class="space-y-2 text-xs sm:text-sm text-on-surface-variant">
                <li><a href="produk.html?id=sambal-cumi-ijo" class="hover:text-primary transition-colors">Sambal Cumi Asin Cabe Ijo</a></li>
                <li><a href="produk.html?id=sambal-bawang-juara" class="hover:text-primary transition-colors">Sambal Bawang Juara</a></li>
                <li><a href="produk.html?id=sambal-roa-asap" class="hover:text-primary transition-colors">Sambal Roa Asap Manado</a></li>
                <li><a href="produk.html?id=sambal-teri-crispy" class="hover:text-primary transition-colors">Sambal Teri Crispy Medan</a></li>
                <li><a href="produk.html?id=paket-pesta-pedas" class="hover:text-primary transition-colors">Paket Pesta Pedas 3 Jar</a></li>
              </ul>
            </div>

            <!-- Kontak & Pengiriman -->
            <div>
              <h4 class="font-bold text-sm text-on-surface mb-3 uppercase tracking-wider">Layanan Pelanggan</h4>
              <p class="text-xs text-on-surface-variant mb-2">Dapur Produksi & Hub: Jakarta & Surabaya</p>
              <p class="text-xs text-on-surface-variant mb-3">WhatsApp: +62 812-3456-7890<br>Senin - Minggu: 08.00 - 20.00 WIB</p>
              <a href="https://wa.me/6281234567890?text=Halo%20Admin%20Sambal%20by%20Kazel" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors">
                <span class="material-symbols-outlined text-sm">chat</span>
                <span>Hubungi WhatsApp</span>
              </a>
            </div>

          </div>

          <div class="pt-6 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant gap-3">
            <p>© 2026 Sambal by Kazel. Hak Cipta Dilindungi Undang-Undang. Cloudflare Pages Edition.</p>
            <div class="flex items-center space-x-4">
              <a href="index.html#panduan" class="hover:text-primary transition-colors">Panduan Simpan</a>
              <a href="index.html#ulasan" class="hover:text-primary transition-colors">Ulasan</a>
              <a href="index.html#faq" class="hover:text-primary transition-colors">Bantuan FAQ</a>
              <a href="status.html" class="hover:text-primary transition-colors">Cek Status Pesanan</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  }
}

class AppMobileNav extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute('active') || '';

    const items = [
      { id: 'beranda', label: 'Beranda', icon: 'home', href: 'index.html', fill: true },
      { id: 'katalog', label: 'Katalog', icon: 'restaurant_menu', href: 'katalog.html', fill: false },
      { id: 'keranjang', label: 'Keranjang', icon: 'shopping_cart', href: 'keranjang.html', fill: false, hasBadge: true },
      { id: 'pesanan', label: 'Pesanan', icon: 'local_shipping', href: 'status.html', fill: false },
      { id: 'bantuan', label: 'Bantuan', icon: 'chat', href: 'https://wa.me/6281234567890?text=Halo%20Admin%20Sambal%20by%20Kazel', isWa: true }
    ];

    const navItemsHtml = items.map(item => {
      const isActive = active === item.id;
      let textClass = isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary';
      let fontClass = isActive ? 'font-bold' : 'font-semibold';
      let iconClass = isActive ? (item.fill ? 'fill' : '') : '';

      if (item.isWa) {
        textClass = 'text-green-600';
        fontClass = 'font-bold';
      }

      const badgeHtml = item.hasBadge
        ? `<span class="cart-badge-count hidden absolute top-0 right-4 bg-primary text-white text-[10px] font-black h-4 min-w-[16px] px-1 rounded-full items-center justify-center animate-pulse">0</span>`
        : '';

      const targetAttr = item.isWa ? 'target="_blank" rel="noopener noreferrer"' : '';

      return `
        <a href="${item.href}" ${targetAttr} class="relative flex flex-col items-center justify-center py-1 ${textClass} focus:outline-none">
          <span class="material-symbols-outlined text-2xl ${iconClass}">${item.icon}</span>
          ${badgeHtml}
          <span class="text-[10px] ${fontClass} mt-0.5">${item.label}</span>
        </a>
      `;
    }).join('\n');

    this.className = 'block';
    this.innerHTML = `
      <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant/60 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-2 py-1.5">
        <div class="grid grid-cols-5 items-center text-center">
          ${navItemsHtml}
        </div>
      </div>
    `;

    if (typeof updateCartBadges === 'function') {
      updateCartBadges();
    }
  }
}

// Register Custom Elements
customElements.define('app-header', AppHeader);
customElements.define('app-footer', AppFooter);
customElements.define('app-mobile-nav', AppMobileNav);
