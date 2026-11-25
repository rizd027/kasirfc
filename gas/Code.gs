/**
 * Google Apps Script — Backend Database Kasir Fotocopy & Percetakan
 *
 * Cara pasang:
 * 1. Buka Google Sheets baru (https://sheets.new).
 * 2. Klik menu: Ekstensi (Extensions) -> Apps Script.
 * 3. Hapus kode bawaan, tempel seluruh isi file ini, lalu Simpan (Ctrl+S).
 * 4. Klik Terapkan (Deploy) -> Deployment baru (New deployment).
 * 5. Pilih jenis: Aplikasi Web (Web app).
 *    - Jalankan sebagai (Execute as): Saya (Me)
 *    - Yang memiliki akses (Who has access): Siapa saja (Anyone)
 * 6. Klik Terapkan, izinkan akses, lalu salin URL Web App ke menu Atur di Kasir.
 */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'pull';
  if (action === 'ping') {
    return jsonRes({ ok: true, msg: 'GAS Kasir Fotocopy aktif', waktu: new Date().toISOString() });
  }
  if (action === 'pull') {
    return jsonRes({ ok: true, data: bacaSemua_() });
  }
  return jsonRes({ ok: false, error: 'Aksi tidak dikenal' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    var action = body.action || 'sync';
    var d = body.data || {};

    if (action === 'sync') {
      tulisSemua_(d);
      return jsonRes({ ok: true, msg: 'Sinkronisasi penuh berhasil', waktu: new Date().toISOString() });
    }
    if (action === 'add_trx' && body.trx) {
      tambahBarisTrx_(body.trx);
      return jsonRes({ ok: true, msg: 'Transaksi tercatat ke Sheets' });
    }
    return jsonRes({ ok: false, error: 'Aksi POST tidak dikenal' });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) });
  }
}

function jsonRes(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(nama, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    if (header && header.length) {
      sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function tulisTabel_(nama, header, rows) {
  var sh = getSheet_(nama, header);
  sh.clearContents();
  var all = [header].concat(rows || []);
  if (all.length) {
    sh.getRange(1, 1, all.length, header.length).setValues(all);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

function tulisSemua_(d) {
  // 1. Produk
  var prodRows = (d.produk || []).map(function (p) {
    return [
      p.id || '', p.nama || '', p.kategori || '', p.stok,
      p.modal || 0, p.barcode || '', p.favorit ? '1' : '0',
      p.ikon || '', JSON.stringify(p.varian || []), JSON.stringify(p.grosir || [])
    ];
  });
  tulisTabel_('Produk', ['id', 'nama', 'kategori', 'stok', 'modal', 'barcode', 'favorit', 'ikon', 'varian_json', 'grosir_json'], prodRows);

  // 2. Transaksi
  var trxRows = (d.transaksi || []).map(function (t) {
    return [
      t.id || '', t.waktu || '', t.kasir || '', t.pelanggan || '', t.telp || '',
      t.metode || '', t.subtotal || 0, t.diskon || 0, t.total || 0,
      t.bayar || 0, t.kembali || 0, t.status || 'selesai', t.dp || 0, t.sisa || 0,
      JSON.stringify(t.items || [])
    ];
  });
  tulisTabel_('Transaksi', ['id', 'waktu', 'kasir', 'pelanggan', 'telp', 'metode', 'subtotal', 'diskon', 'total', 'bayar', 'kembali', 'status', 'dp', 'sisa', 'items_json'], trxRows);

  // 3. Pelanggan
  var pelRows = (d.pelanggan || []).map(function (pl) {
    return [pl.id || '', pl.nama || '', pl.telp || '', pl.instansi || ''];
  });
  tulisTabel_('Pelanggan', ['id', 'nama', 'telp', 'instansi'], pelRows);

  // 4. Pengeluaran
  var pengRows = (d.pengeluaran || []).map(function (pg) {
    return [pg.id || '', pg.waktu || '', pg.kategori || '', pg.keterangan || '', pg.jumlah || 0, pg.kasir || ''];
  });
  tulisTabel_('Pengeluaran', ['id', 'waktu', 'kategori', 'keterangan', 'jumlah', 'kasir'], pengRows);

  // 5. Pengaturan (toko, kategori, tarif, aturan, kasir, nomor)
  var cfg = [
    ['toko', JSON.stringify(d.toko || {})],
    ['kategori', JSON.stringify(d.kategori || [])],
    ['tarif', JSON.stringify(d.tarif || {})],
    ['aturan', JSON.stringify(d.aturan || {})],
    ['kasir', JSON.stringify(d.kasir || [])],
    ['nomor', String(d.nomor || 0)]
  ];
  tulisTabel_('Pengaturan', ['kunci', 'nilai_json'], cfg);
}

function tambahBarisTrx_(t) {
  var sh = getSheet_('Transaksi', ['id', 'waktu', 'kasir', 'pelanggan', 'telp', 'metode', 'subtotal', 'diskon', 'total', 'bayar', 'kembali', 'status', 'dp', 'sisa', 'items_json']);
  sh.appendRow([
    t.id || '', t.waktu || '', t.kasir || '', t.pelanggan || '', t.telp || '',
    t.metode || '', t.subtotal || 0, t.diskon || 0, t.total || 0,
    t.bayar || 0, t.kembali || 0, t.status || 'selesai', t.dp || 0, t.sisa || 0,
    JSON.stringify(t.items || [])
  ]);
}

function bacaTabel_(nama) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nama);
  if (!sh) return [];
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  var hdr = vals[0];
  return vals.slice(1).map(function (row) {
    var obj = {};
    for (var i = 0; i < hdr.length; i++) obj[hdr[i]] = row[i];
    return obj;
  });
}

function safeJson_(s, def) {
  try { return s ? JSON.parse(s) : def; } catch (e) { return def; }
}

function bacaSemua_() {
  var res = {};
  bacaTabel_('Pengaturan').forEach(function (r) {
    if (r.kunci === 'nomor') res.nomor = parseInt(r.nilai_json, 10) || 0;
    else if (r.kunci) res[r.kunci] = safeJson_(r.nilai_json, {});
  });
  res.produk = bacaTabel_('Produk').map(function (r) {
    return {
      id: String(r.id), nama: String(r.nama), kategori: String(r.kategori),
      stok: Number(r.stok), modal: Number(r.modal) || 0, barcode: String(r.barcode || ''),
      favorit: String(r.favorit) === '1' || r.favorit === true, ikon: String(r.ikon || ''),
      varian: safeJson_(r.varian_json, []), grosir: safeJson_(r.grosir_json, [])
    };
  });
  res.transaksi = bacaTabel_('Transaksi').map(function (r) {
    return {
      id: String(r.id), waktu: String(r.waktu), kasir: String(r.kasir),
      pelanggan: String(r.pelanggan || ''), telp: String(r.telp || ''),
      metode: String(r.metode || 'tunai'), subtotal: Number(r.subtotal) || 0,
      diskon: Number(r.diskon) || 0, total: Number(r.total) || 0,
      bayar: Number(r.bayar) || 0, kembali: Number(r.kembali) || 0,
      status: String(r.status || 'selesai'), dp: Number(r.dp) || 0, sisa: Number(r.sisa) || 0,
      items: safeJson_(r.items_json, [])
    };
  });
  res.pelanggan = bacaTabel_('Pelanggan').map(function (r) {
    return { id: String(r.id), nama: String(r.nama), telp: String(r.telp || ''), instansi: String(r.instansi || '') };
  });
  res.pengeluaran = bacaTabel_('Pengeluaran').map(function (r) {
    return { id: String(r.id), waktu: String(r.waktu), kategori: String(r.kategori), keterangan: String(r.keterangan), jumlah: Number(r.jumlah) || 0, kasir: String(r.kasir || '') };
  });
  return res;
}
