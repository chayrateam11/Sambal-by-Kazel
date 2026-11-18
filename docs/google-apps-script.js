/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - SAMBAL BY KAZEL (DATABASE PESANAN & TRACKING RESI REALTIME)
 * ============================================================================
 * 
 * Skrip ini berfungsi sebagai backend API serverless dua arah (Two-Way Sync):
 * 1. Menerima pesanan baru dari Checkout (checkout.html) via POST.
 * 2. Mengambil seluruh daftar pesanan ke Dashboard Admin (admin.html) & Tracking (status.html) via GET.
 * 3. Memperbarui status pesanan (Kolom K) dan nomor resi (Kolom L) secara bersamaan dari Dashboard Admin via POST maupun GET.
 * 4. Mendeteksi perubahan langsung di Google Sheets melalui trigger onEdit(e) sehingga waktu pembaruan (Kolom M) selalu akurat.
 * 
 * ----------------------------------------------------------------------------
 * STRUKTUR KOLOM SPREADSHEET:
 * ----------------------------------------------------------------------------
 * Kolom A (1)  : Waktu
 * Kolom B (2)  : Invoice
 * Kolom C (3)  : Nama
 * Kolom D (4)  : WhatsApp
 * Kolom E (5)  : Alamat
 * Kolom F (6)  : Kurir
 * Kolom G (7)  : MetodeBayar
 * Kolom H (8)  : Items
 * Kolom I (9)  : Total
 * Kolom J (10) : Catatan
 * Kolom K (11) : Status  --> [Status Pesanan: Menunggu Pembayaran / Menunggu Verifikasi / Diproses / Dikirim / Selesai / Dibatalkan]
 * Kolom L (12) : NoResi  --> [Nomor Resi Ekspedisi Realistis]
 * Kolom M (13) : Terakhir Diperbarui
 * Kolom N (14) : BuktiBayar --> [Link URL Google Drive Foto Bukti Transfer]
 * ============================================================================
 */

// Nama tab lembar kerja
var SHEET_NAME = 'Pesanan';

// Daftar kolom header spreadsheet
var HEADERS = [
  'Waktu',
  'Invoice',
  'Nama',
  'WhatsApp',
  'Alamat',
  'Kurir',
  'MetodeBayar',
  'Items',
  'Total',
  'Catatan',
  'Status',
  'NoResi',
  'Terakhir Diperbarui',
  'BuktiBayar'
];

/**
 * Inisialisasi otomatis lembar kerja & header tabel
 */
function initDatabase() {
  var sheet = getOrCreateSheet();
  SpreadsheetApp.flush();
  Logger.log('Inisialisasi database Sambal by Kazel berhasil!');
}

/**
 * Mengambil atau membuat sheet 'Pesanan' dengan format header elegan
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Jika baris pertama kosong, buat header
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#7C4A27'); // Warna Soft Brown utama Sambal by Kazel
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setFontFamily('Arial');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    sheet.setRowHeight(1, 36);
    sheet.setFrozenRows(1);

    // Format lebar kolom optimal
    sheet.setColumnWidth(1, 150); // Waktu
    sheet.setColumnWidth(2, 170); // Invoice
    sheet.setColumnWidth(3, 160); // Nama
    sheet.setColumnWidth(4, 140); // WhatsApp
    sheet.setColumnWidth(5, 240); // Alamat
    sheet.setColumnWidth(6, 140); // Kurir
    sheet.setColumnWidth(7, 140); // MetodeBayar
    sheet.setColumnWidth(8, 260); // Items
    sheet.setColumnWidth(9, 130); // Total
    sheet.setColumnWidth(10, 200); // Catatan
    sheet.setColumnWidth(11, 160); // Status (Kolom K)
    sheet.setColumnWidth(12, 160); // NoResi (Kolom L)
    sheet.setColumnWidth(13, 160); // Terakhir Diperbarui (Kolom M)
    sheet.setColumnWidth(14, 220); // BuktiBayar (Kolom N)
  } else if (sheet.getLastColumn() < HEADERS.length) {
    // Migrasi otomatis jika kolom BuktiBayar belum terdaftar di header sheet lama
    sheet.getRange(1, HEADERS.length).setValue('BuktiBayar');
    var extraHeader = sheet.getRange(1, HEADERS.length);
    extraHeader.setBackground('#7C4A27');
    extraHeader.setFontColor('#ffffff');
    extraHeader.setFontWeight('bold');
    extraHeader.setFontFamily('Arial');
    extraHeader.setHorizontalAlignment('center');
    sheet.setColumnWidth(HEADERS.length, 220);
  }
  
  return sheet;
}

/**
 * TRIGGER OTOMATIS SPREADSHEET (onEdit):
 * Dijalankan ketika Anda atau admin mengedit langsung sel di Spreadsheet Google Sheets.
 * Jika Kolom K (Status) atau Kolom L (NoResi) diedit langsung di Sheet,
 * maka Kolom M (Terakhir Diperbarui) otomatis diperbarui saat itu juga!
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    var row = range.getRow();
    var col = range.getColumn();

    // Abaikan header (baris 1)
    if (row <= 1) return;

    // Kolom K = 11 (Status), Kolom L = 12 (NoResi)
    if (col === 11 || col === 12) {
      var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB';
      sheet.getRange(row, 13).setValue(nowStr);
    }
  } catch (err) {
    Logger.log('onEdit error: ' + err.toString());
  }
}

/**
 * ENDPOINT GET (doGet):
 * 1. Jika ada parameter ?action=updateStatus -> Update Status & Resi dari Admin
 * 2. Default: Mengembalikan seluruh data pesanan terbaru untuk Dashboard Admin & Tracking Pembeli
 */
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || '';

    // ========================================================================
    // AKSI GET: Verifikasi PIN Admin (Dukungan Tambahan CORS)
    // ========================================================================
    if (action === 'verifyAdmin' || action === 'verify_admin') {
      return executeVerifyAdmin(params);
    }

    // ========================================================================
    // AKSI GET: Update Status & Resi (Dukungan Tambahan untuk Web Browser CORS)
    // ========================================================================
    if (action === 'updateStatus' || action === 'update_status') {
      return executeStatusUpdate(sheet, params);
    }

    // ========================================================================
    // AKSI DEFAULT: Ambil Seluruh Data Pesanan Realtime
    // ========================================================================
    var lastRow = sheet.getLastRow();
    
    // Jika hanya ada header atau kosong
    if (lastRow <= 1) {
      return createJsonResponse({
        status: 'success',
        total: 0,
        data: []
      });
    }

    // Ambil seluruh baris data (mulai baris 2, minimal 13 kolom)
    var numCols = Math.max(sheet.getLastColumn(), HEADERS.length);
    var values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    var orders = [];

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rawTime = row[0];
      var formattedTime = rawTime instanceof Date 
        ? Utilities.formatDate(rawTime, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB'
        : (rawTime ? String(rawTime) : '');

      var invoice = String(row[1] || '').trim();
      var nama = String(row[2] || '').trim();
      var wa = String(row[3] || '').trim();
      var alamat = String(row[4] || '').trim();
      var kurir = String(row[5] || '').trim();
      var metodeBayar = String(row[6] || '').trim();
      var items = String(row[7] || '').trim();
      var total = Number(row[8]) || 0;
      var catatan = String(row[9] || '').trim();
      var status = String(row[10] || 'Menunggu Pembayaran').trim(); // Kolom K (11)
      var noResi = String(row[11] || '').trim();                   // Kolom L (12)
      var updatedAt = row[12] ? String(row[12]).trim() : '';
      var buktiBayar = row[13] ? String(row[13]).trim() : '';      // Kolom N (14)

      orders.push({
        // Format Bahasa Indonesia (Sesuai Spreadsheet)
        Waktu: formattedTime,
        Invoice: invoice,
        Nama: nama,
        WhatsApp: wa,
        Alamat: alamat,
        Kurir: kurir,
        MetodeBayar: metodeBayar,
        Items: items,
        Total: total,
        Catatan: catatan,
        Status: status,
        NoResi: noResi,
        BuktiBayar: buktiBayar,

        // Format Standar / CamelCase (Kompatibilitas Frontend)
        createdAt: formattedTime,
        orderId: invoice,
        invoiceNumber: invoice,
        customerName: nama,
        whatsapp: wa,
        customerPhone: wa,
        address: alamat,
        customerAddress: alamat,
        shippingCourier: kurir,
        courierName: kurir,
        paymentMethod: metodeBayar,
        paymentMethodName: metodeBayar,
        items: items,
        totalAmount: total,
        grandTotal: total,
        notes: catatan,
        status: status,
        trackingNumber: noResi,
        noResi: noResi,
        updatedAt: updatedAt,
        buktiBayar: buktiBayar,
        paymentProofUrl: buktiBayar
      });
    }

    // Urutkan dari pesanan terbaru (paling bawah di sheet ditampilkan paling atas)
    orders.reverse();

    return createJsonResponse({
      status: 'success',
      total: orders.length,
      data: orders
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.toString(),
      data: []
    });
  }
}

/**
 * ENDPOINT POST (doPost):
 * 1. Merekam pesanan baru dari Checkout
 * 2. Memperbarui Status (Kolom K) dan NoResi (Kolom L) secara bersamaan dari Dashboard Admin
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Kunci eksekusi selama maksimal 10 detik agar penulisan baris konkuren tidak bentrok
  lock.tryLock(10000);

  try {
    var rawContent = e && e.postData && e.postData.contents ? e.postData.contents : '';
    var payload = {};

    if (rawContent) {
      try {
        payload = JSON.parse(rawContent);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || '';

    // ========================================================================
    // AKSI 0: Verifikasi PIN Admin & Terbitkan Token Sesi
    // ========================================================================
    if (action === 'verifyAdmin' || action === 'verify_admin') {
      return executeVerifyAdmin(payload);
    }

    var sheet = getOrCreateSheet();

    // ========================================================================
    // AKSI 1: Update Status Pesanan (Kolom K) & Nomor Resi (Kolom L) dari admin.html
    // ========================================================================
    if (action === 'updateStatus' || action === 'update_status') {
      return executeStatusUpdate(sheet, payload);
    }

    // ========================================================================
    // AKSI 2: Upload Bukti Transfer ke Google Drive & Set Status Menunggu Verifikasi
    // ========================================================================
    if (action === 'uploadProof' || action === 'upload_proof') {
      return executeUploadProof(sheet, payload);
    }

    // ========================================================================
    // AKSI 3: Catat Pesanan Baru dari checkout.html
    // ========================================================================
    var orderId = payload.invoice || payload.invoiceNumber || payload.orderId || ('#SBK-' + new Date().getTime());
    var customerName = payload.nama || payload.customerName || '-';
    var whatsapp = payload.whatsapp || payload.customerPhone || '-';
    var address = payload.alamat || payload.address || payload.customerAddress || '-';
    var courier = payload.kurir || payload.shippingCourier || payload.courierName || '-';
    var paymentMethod = payload.metodeBayar || payload.paymentMethod || payload.paymentMethodName || '-';
    
    // Bedakan alur awal COD vs Non-COD
    var isCod = String(paymentMethod).toLowerCase().indexOf('cod') !== -1 || String(paymentMethod).toLowerCase().indexOf('bayar di tempat') !== -1;
    var defaultStatus = isCod ? 'Diproses' : 'Menunggu Pembayaran';
    var status = payload.status || defaultStatus;

    // Format rawItems agar setiap item berada di baris baru diawali bullet (• )
    const rawItems = Array.isArray(payload.items)
      ? payload.items.map(item => `• ${item.name} (${item.qty}x)`).join('\n')
      : String(payload.items || '-')
          .split(/;\s*/)
          .filter(Boolean)
          .map(item => item.startsWith('•') ? item : `• ${item}`)
          .join('\n');
    var items = rawItems;

    var totalAmount = Number(payload.total || payload.totalBayar || payload.totalAmount || payload.grandTotal) || 0;
    var notes = payload.catatan || payload.notes || '-';
    var noResi = payload.noResi || payload.trackingNumber || ''; // Kosong saat baru checkout
    var buktiBayar = payload.buktiBayar || payload.paymentProofUrl || '-';
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB';

    // Tambah baris baru sesuai urutan kolom A sampai N:
    // A: Waktu | B: Invoice | C: Nama | D: WhatsApp | E: Alamat | F: Kurir | G: MetodeBayar | H: Items | I: Total | J: Catatan | K: Status | L: NoResi | M: Diperbarui | N: BuktiBayar
    sheet.appendRow([
      timestamp,
      orderId,
      customerName,
      "'" + whatsapp,
      address,
      courier,
      paymentMethod,
      items,
      totalAmount,
      notes,
      status, // Kolom K (11)
      noResi ? "'" + noResi : '-', // Kolom L (12)
      timestamp, // Kolom M (13)
      buktiBayar // Kolom N (14)
    ]);

    // Format mata uang Rupiah pada kolom Total (Kolom I / 9)
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9).setNumberFormat('"Rp"#,##0');

    // Otomatis aktifkan Text Wrapping dan perataan atas (Vertical Alignment Top) pada baris yang baru ditambahkan
    sheet.getRange(lastRow, 1, 1, sheet.getLastColumn())
      .setWrap(true)
      .setVerticalAlignment('top');

    return createJsonResponse({
      status: 'success',
      message: 'Pesanan baru berhasil dicatat ke Google Sheets.',
      invoice: orderId,
      status: status
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Terjadi kesalahan server Apps Script: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fungsi Upload Bukti Transfer ke Google Drive & Simpan URL ke Kolom N (BuktiBayar)
 */
function executeUploadProof(sheet, payload) {
  var targetOrderId = String(payload.invoice || payload.orderId || payload.invoiceNumber || '').trim();
  var rawBase64 = String(payload.image || payload.proofImage || payload.imageBase64 || payload.file || '').trim();

  if (!targetOrderId || !rawBase64) {
    return createJsonResponse({
      status: 'error',
      message: 'Parameter invoice dan data gambar bukti transfer (base64) wajib disertakan.'
    });
  }

  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  var customerName = String(payload.nama || payload.customerName || '').trim();

  if (lastRow > 1) {
    var invoiceCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    var cleanTarget = targetOrderId.replace(/^#/, '').toUpperCase();

    for (var r = 0; r < invoiceCol.length; r++) {
      var cellVal = String(invoiceCol[r][0] || '').trim().replace(/^#/, '').toUpperCase();
      if (cellVal === cleanTarget) {
        foundRow = r + 2; // Offset header baris 1
        if (!customerName) {
          customerName = String(sheet.getRange(foundRow, 3).getValue() || '').trim();
        }
        break;
      }
    }
  }

  if (foundRow === -1) {
    return createJsonResponse({
      status: 'error',
      message: 'Pesanan dengan nomor invoice ' + targetOrderId + ' tidak ditemukan di Google Sheets.'
    });
  }

  // 1. Ekstrak data base64 dan contentType
  var contentType = 'image/jpeg';
  var base64Data = rawBase64;
  var match = rawBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    contentType = match[1];
    base64Data = match[2];
  }

  var decodedBytes = Utilities.base64Decode(base64Data);
  var cleanInvoice = targetOrderId.replace(/[^a-zA-Z0-9_-]/g, '_');
  var cleanName = customerName ? customerName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Pelanggan';
  var fileName = cleanInvoice + '_' + cleanName + '.jpg';
  var blob = Utilities.newBlob(decodedBytes, contentType, fileName);

  // 2. Simpan gambar ke folder Google Drive "Bukti Transfer - Sambal by Kazel"
  var folderName = 'Bukti Transfer - Sambal by Kazel';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  var file = folder.createFile(blob);
  
  // Atur izin file ANYONE_WITH_LINK agar admin dapat langsung melihat foto bukti transfer
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingErr) {
    Logger.log('Set sharing warning: ' + sharingErr.toString());
  }

  var fileUrl = file.getUrl();

  // 3. Simpan link Google Drive ke Kolom N (14: BuktiBayar), ubah Status ke Kolom K (11: "Menunggu Verifikasi"), dan update Kolom M (13)
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB';
  sheet.getRange(foundRow, 11).setValue('Menunggu Verifikasi');
  sheet.getRange(foundRow, 13).setValue(nowStr);
  sheet.getRange(foundRow, 14).setValue(fileUrl);

  return createJsonResponse({
    status: 'success',
    message: 'Bukti transfer berhasil disimpan. Menunggu verifikasi admin.',
    invoice: targetOrderId,
    status: 'Menunggu Verifikasi',
    fileUrl: fileUrl,
    updatedAt: nowStr
  });
}

/**
 * Fungsi Eksekusi Pembaruan Status & Resi Pesanan
 * Digunakan bersama oleh doGet maupun doPost
 */
function executeStatusUpdate(sheet, payload) {
  // Validasi token autentikasi admin sebelum mengubah data sensitif
  var token = String(payload.token || payload.adminToken || '').trim();
  if (!isValidAdminToken(token)) {
    return createJsonResponse({
      status: 'error',
      message: 'Akses ditolak. Token otentikasi admin tidak valid atau sudah kedaluwarsa. Silakan login kembali.'
    });
  }

  var targetOrderId = String(payload.invoice || payload.orderId || payload.invoiceNumber || '').trim();
  var newStatus = String(payload.status || payload.Status || '').trim();
  
  // Ambil nilai resi dari berbagai alias key
  var newResi = '';
  if (payload.noResi !== undefined && payload.noResi !== null) {
    newResi = String(payload.noResi).trim();
  } else if (payload.NoResi !== undefined && payload.NoResi !== null) {
    newResi = String(payload.NoResi).trim();
  } else if (payload.trackingNumber !== undefined && payload.trackingNumber !== null) {
    newResi = String(payload.trackingNumber).trim();
  } else if (payload.resi !== undefined && payload.resi !== null) {
    newResi = String(payload.resi).trim();
  }

  if (!targetOrderId || !newStatus) {
    return createJsonResponse({
      status: 'error',
      message: 'Parameter invoice dan status wajib diisi.'
    });
  }

  var lastRow = sheet.getLastRow();
  var foundRow = -1;

  if (lastRow > 1) {
    // Cari baris berdasarkan Invoice di Kolom B (2)
    var invoiceCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    var cleanTarget = targetOrderId.replace(/^#/, '').toUpperCase();

    for (var r = 0; r < invoiceCol.length; r++) {
      var cellVal = String(invoiceCol[r][0] || '').trim().replace(/^#/, '').toUpperCase();
      if (cellVal === cleanTarget) {
        foundRow = r + 2; // Offset header (baris 1)
        break;
      }
    }
  }

  if (foundRow === -1) {
    return createJsonResponse({
      status: 'error',
      message: 'Pesanan dengan nomor invoice ' + targetOrderId + ' tidak ditemukan di Google Sheets.'
    });
  }

  // 1. Simpan Status ke Kolom K (11)
  sheet.getRange(foundRow, 11).setValue(newStatus);
  
  // 2. Simpan No. Resi ke Kolom L (12) jika disertakan
  if (newResi !== '') {
    sheet.getRange(foundRow, 12).setValue("'" + newResi);
  }

  // 3. Simpan Waktu Terakhir Diperbarui ke Kolom M (13)
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB';
  sheet.getRange(foundRow, 13).setValue(nowStr);

  return createJsonResponse({
    status: 'success',
    message: 'Status dan No. Resi pesanan ' + targetOrderId + ' berhasil disimpan!',
    invoice: targetOrderId,
    status: newStatus,
    noResi: newResi,
    updatedAt: nowStr
  });
}

/**
 * Helper pembuat JSON output dengan header MIME yang tepat
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// SISTEM AUTENTIKASI ADMIN & KEAMANAN TOKEN (SERVER-SIDE)
// ============================================================================

/**
 * Mengambil PIN Admin dari Script Properties
 * Dapat disetel di Google Apps Script editor: Project Settings > Script Properties > ADMIN_PIN
 */
function getAdminPin() {
  try {
    var props = PropertiesService.getScriptProperties();
    var pin = props.getProperty('ADMIN_PIN');
    if (pin && String(pin).trim()) {
      return String(pin).trim();
    }
  } catch (e) {
    Logger.log('Gagal membaca ScriptProperties: ' + e);
  }
  // Tidak ada hardcoded PIN default; wajib disetel di Script Properties
  return '';
}

/**
 * Menghasilkan Session Token Admin yang Aman (HMAC SHA-256 Signature)
 */
function generateAdminToken() {
  var secret = '';
  try {
    secret = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
  } catch (e) {}
  if (!secret) {
    secret = 'sbk_secret_auth_' + getAdminPin();
  }

  var timestamp = new Date().getTime();
  var payload = timestamp + ':' + Utilities.getUuid();
  var signature = Utilities.base64Encode(Utilities.computeHmacSha256Signature(payload, secret));
  var token = Utilities.base64EncodeWebSafe(payload) + '.' + signature;

  // Simpan token di cache script sementara (valid 6 jam / 21600 detik)
  try {
    var cache = CacheService.getScriptCache();
    cache.put('sbk_token_' + token, 'valid', 21600);
  } catch (e) {}

  return token;
}

/**
 * Memvalidasi apakah token sesi admin masih valid dan belum kedaluwarsa (12 jam)
 */
function isValidAdminToken(token) {
  if (!token || typeof token !== 'string') return false;

  // 1. Cek dari CacheService
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get('sbk_token_' + token) === 'valid') {
      return true;
    }
  } catch (e) {}

  // 2. Verifikasi tanda tangan kriptografi HMAC dan waktu kedaluwarsa
  try {
    var parts = token.split('.');
    if (parts.length !== 2) return false;

    var payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    var secret = '';
    try {
      secret = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
    } catch (e) {}
    if (!secret) {
      secret = 'sbk_secret_auth_' + getAdminPin();
    }

    var expectedSig = Utilities.base64Encode(Utilities.computeHmacSha256Signature(payload, secret));
    if (parts[1] !== expectedSig) return false;

    var timeParts = payload.split(':');
    var createdTime = Number(timeParts[0]);
    var now = new Date().getTime();

    // Kedaluwarsa 12 jam (43.200.000 milidetik)
    if (now - createdTime > 12 * 60 * 60 * 1000) return false;

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Handler Verifikasi PIN Admin untuk aksi verifyAdmin
 */
function executeVerifyAdmin(payload) {
  var enteredPin = String(payload.pin || payload.enteredPin || '').trim();
  var expectedPin = getAdminPin();

  if (!enteredPin) {
    return createJsonResponse({
      status: 'error',
      message: 'PIN wajib diisi.'
    });
  }

  if (enteredPin === expectedPin) {
    var sessionToken = generateAdminToken();
    return createJsonResponse({
      status: 'success',
      message: 'Autentikasi admin berhasil.',
      token: sessionToken
    });
  } else {
    return createJsonResponse({
      status: 'error',
      message: 'PIN tidak valid'
    });
  }
}
