/**
 * Sambal by Kazel - Single Source of Truth Products & Mock Database
 */

// 1. Fallback Image Data URI
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23f2ede7'/%3E%3Ccircle cx='300' cy='280' r='100' fill='%23ffdad6'/%3E%3Cpath d='M300 210 C260 210 240 250 240 290 C240 330 270 350 300 350 C330 350 360 330 360 290 C360 250 340 210 300 210 Z' fill='%23b70011'/%3E%3Cpath d='M300 210 C300 180 320 160 330 150' stroke='%237f4f00' stroke-width='8' stroke-linecap='round' fill='none'/%3E%3Ctext x='50%25' y='72%25' dominant-baseline='middle' text-anchor='middle' font-family='Plus Jakarta Sans, sans-serif' font-size='24' fill='%231d1b18' font-weight='bold'%3ESambal by Kazel%3C/text%3E%3Ctext x='50%25' y='79%25' dominant-baseline='middle' text-anchor='middle' font-family='Plus Jakarta Sans, sans-serif' font-size='15' fill='%23a73a00'%3EPedasnya Pas, Rasanya Nagih!%3C/text%3E%3C/svg%3E";

// 2. Single Source of Truth Products Data
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

// 3. Add-on items catalog
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

// 4. Configuration Constants
const CART_STORAGE_KEY = 'sw_cart_v1';
const LAST_ORDER_KEY = 'sw_last_order';
const ACTIVE_COUPON_KEY = 'sw_applied_coupon';
const FREE_SHIPPING_MIN = 150000;
const VALID_COUPONS = {
  'PEDASHEMAT': {
    code: 'PEDASHEMAT',
    discount: 15000,
    description: 'Potongan Diskon Rp 15.000 Spesial Pecinta Pedas'
  }
};
