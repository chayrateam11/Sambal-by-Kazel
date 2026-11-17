# 🌶️ Sambal by Kazel — Static E-Commerce Website

Website e-commerce kuliner modern berstandar tinggi untuk brand **"Sambal by Kazel"** dengan tagline resmi **"Pedasnya Pas, Rasanya Nagih!"**, siap di-deploy secara instan ke **Cloudflare Pages (`*.pages.dev`)** menggunakan teknologi murni **HTML5, Tailwind CSS (via CDN dengan custom config), dan Vanilla JavaScript (ES6+)** tanpa ketergantungan framework backend/PHP.

---

## 🎨 Arsitektur Visual & Standar UI/UX Pro Max

Proyek ini dirancang berdasarkan prinsip sistem desain kuliner tingkat tinggi:
- **Appetite-Inducing Warm Palette:** Menggunakan kontras warna merah cabai matang (`#b70011`), jingga rempah (`#a73a00`), dan krem hangat (`#fef9f3`).
- **High-Conversion E-Commerce Hierarchy:** Ticker promo berjalan, call-to-action ganda di hero section, filter kategori interaktif, progress bar bebas ongkir, dan ringkasan transaksi transparan.
- **Micro-Interactions & Tactile Feedback:** Efek tekan tombol `active:scale-95`, transisi hover halus (150–300ms), fallback gambar otomatis jika koneksi lambat, dan animasi toast notifikasi.
- **Mobile First & Accessibility Compliant:** Tap target minimal 44px di perangkat mobile, rasio kontras teks WCAG 4.5:1, sticky top bar di desktop, dan fixed bottom bar di mobile (`md:hidden`).

---

## 📁 Struktur Direktori & File Modular

```text
Sambal_by_Kazel/
├── index.html            # Landing page utama (Hero, 4 pilar, katalog unggulan, panduan simpan, testimoni, FAQ)
├── katalog.html          # Katalog lengkap (Sidebar filter kategori, pedas, harga, sorting, search, modal drawer mobile)
├── produk.html           # Detail produk (Galeri thumbnail, level pedas, pilihan ukuran jar, stepper qty, tabs gizi & ulasan)
├── keranjang.html        # Keranjang belanja (Dynamic render localStorage, progress bar gratis ongkir, kupon PEDASHEMAT, add-on)
├── checkout.html         # Form checkout 4-langkah (Data penerima, ekspedisi Paxel/J&T/Grab, kartu ucapan, pembayaran QRIS/VA/COD)
├── status.html           # Status & pelacakan pesanan (Timeline pengiriman real-time, invoice acak, tombol WhatsApp CS)
├── assets/
│   ├── css/
│   │   └── style.css          # Master stylesheet (Material Symbols, ticker marquee, scrollbar, toast, micro-interactions)
│   └── js/
│       ├── tailwind.config.js # Konfigurasi eksternal Tailwind CSS (Palet warna, font, spacing, border-radius)
│       ├── data/
│       │   └── products.js    # Single source of truth produk, add-on, dan konfigurasi kupon & ongkir
│       ├── core/
│       │   ├── cart.js        # State management keranjang belanja, kalkulasi diskon & WhatsApp order generator
│       │   └── components.js  # Native Web Components (<app-header>, <app-footer>, <app-mobile-nav>)
│       └── pages/
│           ├── home.js        # Logika interaktif Beranda (filter produk & FAQ accordion)
│           ├── catalog.js     # Logika interaktif Katalog (filter URL, sorting, pencarian & mobile drawer)
│           ├── product.js     # Logika interaktif Detail Produk (galeri thumbnail, varian ukuran & stepper qty)
│           ├── cart.js        # Logika interaktif Keranjang (update qty, kupon, add-on & free shipping bar)
│           ├── checkout.js    # Logika interaktif Checkout (multi-step form, opsi kurir, pembayaran & WhatsApp order)
│           └── status.js      # Logika interaktif Status Pesanan (timeline pelacakan & invoice rendering)
└── README.md             # Panduan proyek & petunjuk deploy Cloudflare Pages
```

---

## 🚀 Fitur Unggulan Aplikasi

1. **Single Source of Truth Produk (`assets/js/app.js`):**
   - *Sambal Cumi Asin Cabe Ijo* (`Rp 34.000` / Coret: `Rp 42.000` — Best Seller #1)
   - *Sambal Bawang Juara* (`Rp 28.000` / Coret: `Rp 35.000` — Terlaris)
   - *Sambal Roa Asap Manado* (`Rp 38.000` / Coret: `Rp 45.000` — Khas Manado)
   - *Sambal Teri Crispy Medan* (`Rp 32.000` / Coret: `Rp 38.000` — Kriuk Gurih)
   - *Sambal Terasi Bakar Madura* (`Rp 31.000` / Coret: `Rp 36.000` — Klasik)
   - *Sambal Matah Kecombrang Bali* (`Rp 35.000` / Coret: `Rp 39.000` — Segar Alami)
   - *Paket Pesta Pedas 3 Jar* (`Rp 89.000` / Coret: `Rp 115.000` — Bundling Hemat 25%)

2. **Keranjang Belanja Real-Time (`localStorage`):**
   - Indikator badge keranjang sinkron di semua halaman (desktop & mobile).
   - Stepper jumlah toples (+ / -) dan penghapusan item instan.
   - **Progress Bar Gratis Ongkir:** Target belanja minimum `Rp 150.000`.
   - **Kupon Promo Aktif:** Kode **`PEDASHEMAT`** memberikan potongan diskon langsung `Rp 15.000`.
   - **Quick Add-on Pelengkap:** Sendok Kayu Jati (`Rp 5.000`) dan Kerupuk Putih Renyah (`Rp 8.000`).

3. **Checkout & Ekspedisi Dinamis:**
   - Paxel Next Day Chilled (`Rp 18.000` / *Gratis* jika belanja ≥ Rp 150.000).
   - J&T Express Reguler (`Rp 12.000` / *Gratis* jika belanja ≥ Rp 150.000).
   - Grab Instant / Sameday (`Rp 32.000` / *Subsidi Rp 18.000* menjadi Rp 14.000 jika belanja ≥ Rp 150.000).
   - Opsi tambahan Kartu Ucapan Kado Gratis dan Catatan Dapur.

4. **Pelacakan & Konfirmasi WhatsApp:**
   - Halaman status menampilkan nomor invoice acak (misal `#SW-89421`) dan timeline 4 tahap.
   - Tombol *"Konfirmasi ke CS WhatsApp"* otomatis memformat rekap pesanan ke nomor `+62 812-3456-7890`.

---

## 🌐 Cara Deploy ke Cloudflare Pages

1. Push repositori ini ke GitHub / GitLab:
   ```bash
   git init
   git add .
   git commit -m "feat: Sambal by Kazel e-commerce static site"
   git remote add origin https://github.com/username/sambal-by-kazel.git
   git push -u origin main
   ```
2. Buka dashboard **[Cloudflare Dashboard](https://dash.cloudflare.com/)** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Pilih repositori `sambal-by-kazel`.
4. Konfigurasi build setting:
   - **Framework preset:** `None`
   - **Build command:** *(kosongkan)*
   - **Build output directory:** `/` (atau root direktori)
5. Klik **Save and Deploy**. Website Anda akan langsung aktif di `https://sambal-by-kazel.pages.dev`!

---

© 2026 Sambal by Kazel. Hak Cipta Dilindungi Undang-Undang.
