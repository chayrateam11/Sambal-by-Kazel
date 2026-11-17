/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - SAMBAL BY KAZEL (DATABASE PESANAN & TRACKING RESI)
 * ============================================================================
 * 
 * Skrip ini berfungsi sebagai backend API serverless untuk:
 * 1. Menerima pesanan baru dari Checkout (checkout.html) via POST.
 * 2. Mengambil seluruh daftar pesanan ke Dashboard Admin (admin.html) & Tracking (status.html) via GET.
 * 3. Memperbarui status pesanan (Kolom K) dan nomor resi (Kolom L) secara bersamaan dari Dashboard Admin (admin.html) via POST.
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
 * Kolom K (11) : Status  --> [Status Pesanan: Menunggu Konfirmasi / Diproses / Dikirim / Selesai]
 * Kolom L (12) : NoResi  --> [Nomor Resi Ekspedisi Realistis]
 * Kolom M (13) : Terakhir Diperbarui
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
  'Terakhir Diperbarui'
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
    headerRange.setBackground('#b70011'); // Warna merah utama Sambal by Kazel
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
    sheet.setColumnWidth(11, 150); // Status (Kolom K)
    sheet.setColumnWidth(12, 160); // NoResi (Kolom L)
    sheet.setColumnWidth(13, 150); // Terakhir Diperbarui (Kolom M)
  }
  
  return sheet;
}

/**
 * ENDPOINT GET (doGet):
 * Mengembalikan seluruh data pesanan dalam format JSON untuk Dashboard Admin (admin.html)
 * serta pelacakan pesanan real-time di (status.html).
 */
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
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
      var status = String(row[10] || 'Menunggu Konfirmasi').trim(); // Kolom K (11)
      var noResi = String(row[11] || '').trim();                   // Kolom L (12)
      var updatedAt = row[12] ? String(row[12]).trim() : '';

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
        updatedAt: updatedAt
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

    var sheet = getOrCreateSheet();
    var action = payload.action || '';

    // ========================================================================
    // AKSI 1: Update Status Pesanan (Kolom K) & Nomor Resi (Kolom L) dari admin.html
    // ========================================================================
    if (action === 'updateStatus' || action === 'update_status') {
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
        for (var r = 0; r < invoiceCol.length; r++) {
          if (String(invoiceCol[r][0]).trim().toUpperCase() === targetOrderId.toUpperCase()) {
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
      var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(foundRow, 13).setValue(nowStr + ' WIB');

      return createJsonResponse({
        status: 'success',
        message: 'Status dan No. Resi pesanan ' + targetOrderId + ' berhasil disimpan!',
        invoice: targetOrderId,
        status: newStatus,
        noResi: newResi,
        updatedAt: nowStr
      });
    }

    // ========================================================================
    // AKSI 2: Catat Pesanan Baru dari checkout.html
    // ========================================================================
    var orderId = payload.invoice || payload.invoiceNumber || payload.orderId || ('#SBK-' + new Date().getTime());
    var customerName = payload.nama || payload.customerName || '-';
    var whatsapp = payload.whatsapp || payload.customerPhone || '-';
    var address = payload.alamat || payload.address || payload.customerAddress || '-';
    var courier = payload.kurir || payload.shippingCourier || payload.courierName || '-';
    var paymentMethod = payload.metodeBayar || payload.paymentMethod || payload.paymentMethodName || '-';
    var items = payload.items || payload.Items || '-';
    if (Array.isArray(items)) {
      items = items.map(function(item) {
        return (item.name || 'Produk') + ' (' + (item.size || '150gr') + ') x' + (item.qty || 1);
      }).join('; ');
    }
    var totalAmount = Number(payload.total || payload.totalBayar || payload.totalAmount || payload.grandTotal) || 0;
    var notes = payload.catatan || payload.notes || '-';
    var status = payload.status || 'Menunggu Konfirmasi';
    var noResi = payload.noResi || payload.trackingNumber || ''; // Kosong saat baru checkout
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB';

    // Tambah baris baru sesuai urutan kolom A sampai M:
    // A: Waktu | B: Invoice | C: Nama | D: WhatsApp | E: Alamat | F: Kurir | G: MetodeBayar | H: Items | I: Total | J: Catatan | K: Status | L: NoResi | M: Diperbarui
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
      timestamp // Kolom M (13)
    ]);

    // Format mata uang Rupiah pada kolom Total (Kolom I / 9)
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 9).setNumberFormat('"Rp"#,##0');

    return createJsonResponse({
      status: 'success',
      message: 'Pesanan baru berhasil dicatat ke Google Sheets.',
      invoice: orderId
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
 * Helper pembuat JSON output dengan header MIME yang tepat
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
