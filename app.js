(function () {
  'use strict';

  // ---------- KONFIG gambar: ganti logo/foto cukup di sini (atau timpa berkas di img/) ----------
  var KONFIG = {
    logo: 'img/logo.svg',                // logo toko: sidebar, layar masuk, struk. '' = pakai ikon bawaan
    fotoContoh: 'img/produk-contoh.svg', // placeholder foto produk (rasio 1:1)
    fotoProduk: {}                       // foto produk contoh per nama, mis. { 'Mie Goreng': 'img/mie.jpg' }
  };

  // ---------- Penyimpanan (localStorage, offline, terpisah per akun) ----------
  var KUNCI_AKUN = 'kasir-fotocopy-akun-v1';
  var akunAktifId = 'default';
  var KUNCI = 'kasir-fotocopy-v1', KUNCI_PL = 'kasir-fotocopy-pelanggan-v1';
  function hashSandi(teks, garam) {
    var s = (garam || '') + ':' + String(teks || '');
    var h1 = 0x811c9dc5, h2 = 5381;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 0x01000193);
      h2 = Math.imul(h2, 33) ^ c;
    }
    return ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
  }
  function muatAkunReg() {
    var reg = null;
    try { reg = JSON.parse(localStorage.getItem(KUNCI_AKUN)); } catch (e) { reg = null; }
    if (!reg || !Array.isArray(reg.daftar) || !reg.daftar.length) {
      reg = { aktif: 'default', daftar: [{ id: 'default', username: 'utama', nama: NAMA_TEMA || 'Utama', salt: '', hash: '' }] };
      simpanAkunReg(reg);
    }
    return reg;
  }
  function simpanAkunReg(reg) {
    try { localStorage.setItem(KUNCI_AKUN, JSON.stringify(reg)); } catch (e) { }
  }
  function setKunciAkun(id) {
    akunAktifId = id || 'default';
    KUNCI = akunAktifId === 'default' ? 'kasir-fotocopy-v1' : 'kasir-fotocopy-v1-' + akunAktifId;
    KUNCI_PL = akunAktifId === 'default' ? 'kasir-fotocopy-pelanggan-v1' : 'kasir-fotocopy-pelanggan-v1-' + akunAktifId;
  }
  var NAMA_TEMA = (window.TEMA && TEMA.nama) || 'Fotocopy Berkah';

  function dataKosong() {
    return {
      toko: { namaDariTema: true, nama: NAMA_TEMA, alamat: '', telp: '', footer: 'Terima kasih sudah belanja!', rekening: '' },
      kategori: [], produk: [], transaksi: [], tarif: tarifBawaan(),
      kasir: [{ id: 'k1', nama: 'Admin', pin: '1234', peran: 'admin' }],
      nomor: 0
    };
  }

  function dataContoh() {
    var d = dataKosong();
    d.toko = { namaDariTema: true, nama: NAMA_TEMA, alamat: 'Jl. Merdeka No. 12, Bandung', telp: '0812-0000-1234', footer: 'Terima kasih, sampai jumpa lagi!', rekening: 'Bank Contoh 0000000000 a.n. ' + NAMA_TEMA };
    d.kategori = ['Fotocopy', 'Print', 'Scan', 'Jilid', 'Laminasi', 'ATK'];
    // [nama, kategori, stok (-1 = jasa, tanpa stok), [[varian, harga, jenis lembar: 'bw' | 'warna' | '']]]
    var p = [
      ['Fotocopy A4', 'Fotocopy', -1, [['BW 1 sisi', 300, 'bw'], ['BW 2 sisi', 500, 'bw'], ['Warna 1 sisi', 1500, 'warna']]],
      ['Fotocopy F4', 'Fotocopy', -1, [['BW 1 sisi', 350, 'bw'], ['BW 2 sisi', 600, 'bw'], ['Warna 1 sisi', 1750, 'warna']]],
      ['Fotocopy KTP', 'Fotocopy', -1, [['BW', 500, 'bw'], ['Warna', 1500, 'warna']]],
      ['Print Hitam-Putih', 'Print', -1, [['A4 1 sisi', 500, 'bw'], ['A4 2 sisi', 800, 'bw'], ['F4 1 sisi', 600, 'bw']]],
      ['Print Warna', 'Print', -1, [['A4 teks', 1000, 'warna'], ['A4 gambar penuh', 2500, 'warna'], ['F4 teks', 1200, 'warna']]],
      ['Cetak Pas Foto', 'Print', -1, [
        ['2x3 cm (isi 8)', 5000, 'warna'], ['3x4 cm (isi 6)', 5000, 'warna'], ['4x6 cm (isi 4)', 5000, 'warna'],
        ['2R (6x9 cm)', 1500, 'warna'], ['3R (8.9x12.7 cm)', 2000, 'warna'], ['4R (10.2x15.2 cm)', 3000, 'warna'],
        ['5R (12.7x17.8 cm)', 5000, 'warna'], ['6R (15.2x20.3 cm)', 6500, 'warna'], ['8R (20.3x25.4 cm)', 9000, 'warna'],
        ['10R (25.4x30.5 cm)', 10000, 'warna']
      ]],
      ['Scan Dokumen', 'Scan', -1, [['Kirim PDF/WA', 2000, '']]],
      ['Jilid', 'Jilid', -1, [['Staples', 1000, ''], ['Lakban', 4000, ''], ['Mika + lakban', 6000, ''], ['Spiral', 10000, ''], ['Hardcover', 35000, '']]],
      ['Laminasi', 'Laminasi', -1, [['KTP/kartu', 3000, ''], ['A4', 6000, ''], ['F4', 7000, '']]],
      ['Map Plastik', 'ATK', 40, [['Kancing', 2000, ''], ['L', 1500, '']]],
      ['Amplop Cokelat', 'ATK', 60, [['Folio', 1500, ''], ['A4', 1200, '']]],
      ['Materai 10.000', 'ATK', 3, [['Satuan', 12000, '']]]
    ];
    d.produk = p.map(function (x, i) {
      return { id: 'p' + (i + 1), nama: x[0], kategori: x[1], stok: x[2], foto: KONFIG.fotoProduk[x[0]] || '', varian: x[3].map(function (v) { return { nama: v[0], harga: v[1], jenis: v[2] }; }) };
    });
    d.kasir.push({ id: 'k2', nama: 'Sari', pin: '1111', peran: 'kasir' });
    // transaksi contoh 30 hari terakhir
    var acak = semai(7);
    var sekarang = new Date();
    for (var h = 29; h >= 0; h--) {
      var n = 3 + Math.floor(acak() * 7);
      for (var t = 0; t < n; t++) {
        var w = new Date(sekarang); w.setDate(w.getDate() - h);
        w.setHours(8 + Math.floor(acak() * 13), Math.floor(acak() * 60), 0, 0);
        if (w > sekarang) continue;
        var items = [], m = 1 + Math.floor(acak() * 3);
        for (var j = 0; j < m; j++) {
          var pr = d.produk[Math.floor(acak() * d.produk.length)], vr = pr.varian[Math.floor(acak() * pr.varian.length)];
          var q = vr.jenis === 'bw' ? 5 + Math.floor(acak() * 60) : vr.jenis === 'warna' ? 1 + Math.floor(acak() * 12) : 1 + Math.floor(acak() * 2);
          items.push({ pid: pr.id, nama: pr.nama, varian: vr.nama, harga: vr.harga, qty: q, jenis: vr.jenis || '', lembar: vr.jenis ? 1 : 0 });
        }
        var sub = items.reduce(function (s, it) { return s + it.harga * it.qty; }, 0);
        var mt = ['tunai', 'tunai', 'qris', 'transfer'][Math.floor(acak() * 4)];
        var bayar = mt === 'tunai' ? Math.ceil(sub / 10000) * 10000 : sub;
        d.nomor++;
        d.transaksi.push({ id: noTrx(w, d.nomor), waktu: w.toISOString(), kasir: acak() > .5 ? 'Sari' : 'Admin', items: items, subtotal: sub, diskon: 0, total: sub, metode: mt, bayar: bayar, kembali: bayar - sub });
      }
    }
    return d;
  }
  function semai(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // Tarif untuk "Hitung cepat" (harga per lembar). Bisa diubah di menu Atur.
  function tarifBawaan() {
    return {
      fotocopy: { bw1: 300, bw2: 500, warna1: 1500, warna2: 2500 },
      print: { bw1: 500, bw2: 800, warna1: 1000, warna2: 1800 },
      f4: 50,
      jilid: [['Tanpa jilid', 0], ['Staples', 1000], ['Lakban', 4000], ['Mika + lakban', 6000], ['Spiral', 10000], ['Hardcover', 35000]],
      laminasi: 6000
    };
  }
  function tanpaStok(p) { return p.stok < 0; }
  var D;
  function aturanBawaan() {
    return { pembulatan: 0, ukuranStruk: '58mm', batasStok: 5, qrisStatis: '', kertasA4: 2500, kertasF4: 2500, lastBackup: 0, autoLock: 0, gasUrl: '', gasAuto: false, gasLastSync: 0 };
  }
  function simpanPelanggan() {
    try { localStorage.setItem(KUNCI_PL, JSON.stringify(D.pelanggan || [])); }
    catch (e) { toast('Gagal menyimpan pelanggan: memori penuh'); }
  }
  function muat() {
    try { D = JSON.parse(localStorage.getItem(KUNCI)); } catch (e) { D = null; }
    if (!D || !D.produk) { D = dataContoh(); simpan(); }
    // Migrasi data lama: nama bawaan lama dianggap belum diubah pengguna.
    if (D.toko.namaDariTema === undefined) D.toko.namaDariTema = D.toko.nama === 'Kopi Senja' || D.toko.nama === 'Toko Saya';
    if (D.toko.namaDariTema) D.toko.nama = NAMA_TEMA;
    if (!D.tarif) D.tarif = tarifBawaan();
    if (!Array.isArray(D.tahan)) D.tahan = [];
    if (!Array.isArray(D.pengeluaran)) D.pengeluaran = [];
    var plPisah = null;
    try { plPisah = JSON.parse(localStorage.getItem(KUNCI_PL)); } catch (e) { plPisah = null; }
    if (Array.isArray(plPisah)) D.pelanggan = plPisah;
    else {
      if (!Array.isArray(D.pelanggan)) D.pelanggan = [];
      if (D.pelanggan.length) { simpanPelanggan(); simpan(); }
    }
    if (!D.shift || typeof D.shift !== 'object') D.shift = { aktif: null, riwayat: [] };
    if (!Array.isArray(D.counter)) D.counter = [];
    if (!Array.isArray(D.audit)) D.audit = [];
    var gasBelumDiset = !D.aturan || D.aturan.gasUrl === undefined;
    D.aturan = Object.assign(aturanBawaan(), D.aturan || {});
    if (akunAktifId === 'default' && gasBelumDiset) {
      D.aturan.gasUrl = 'https://script.google.com/macros/s/AKfycbzFSs71kkSI8dG4hIWNNFM86wXxYfGw0gWb9-sCVPdhgOaM0oRTm8k_7XFGUnrb56rL/exec';
      D.aturan.gasAuto = true;
    }
    if (!D.aturan.foto10Migrated) {
      var pf = D.produk.find(function (x) { return /cetak (pas )?foto/i.test(x.nama); });
      var baru10 = [
        ['2x3 cm (isi 8)', 5000], ['3x4 cm (isi 6)', 5000], ['4x6 cm (isi 4)', 5000],
        ['2R (6x9 cm)', 1500], ['3R (8.9x12.7 cm)', 2000], ['4R (10.2x15.2 cm)', 3000],
        ['5R (12.7x17.8 cm)', 5000], ['6R (15.2x20.3 cm)', 6500], ['8R (20.3x25.4 cm)', 9000],
        ['10R (25.4x30.5 cm)', 10000]
      ];
      if (pf) {
        if (pf.varian.length <= 4) pf.varian = baru10.map(function (v) { return { nama: v[0], harga: v[1], jenis: 'warna' }; });
      } else {
        D.produk.push({ id: uid(), nama: 'Cetak Pas Foto', kategori: D.kategori[1] || D.kategori[0] || 'Print', stok: -1, foto: '', varian: baru10.map(function (v) { return { nama: v[0], harga: v[1], jenis: 'warna' }; }) });
      }
      D.aturan.foto10Migrated = true; simpan();
    }
    try {
      var m = localStorage.getItem('kasir-mode');
      if (m === 'terang' || m === 'gelap') document.documentElement.setAttribute('data-mode', m);
    } catch (e) { }
  }
  function catatAudit(aksi) {
    if (!D || !pengguna) return;
    D.audit.unshift({ waktu: new Date().toISOString(), kasir: pengguna.nama, aksi: aksi });
    if (D.audit.length > 100) D.audit.length = 100;
  }
  function qrisDinamis(statis, nominal) {
    var s = String(statis || '').trim().replace(/6304[0-9A-Fa-f]{4}$/, '');
    if (!s || nominal <= 0) return statis;
    s = s.replace(/^000201010211/, '000201010212');
    var amt = String(Math.round(nominal));
    var tag54 = '54' + String(amt.length).padStart(2, '0') + amt;
    var idx58 = s.indexOf('5802ID');
    var base = idx58 > -1 ? (s.slice(0, idx58) + tag54 + s.slice(idx58)) : (s + tag54);
    base += '6304';
    var crc = 0xFFFF;
    for (var i = 0; i < base.length; i++) {
      crc ^= base.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
    return base + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }
  function kirimWA(trx) {
    var no = String(trx.telp || '').replace(/\D/g, '');
    if (no.startsWith('0')) no = '62' + no.slice(1);
    var baris = ['*' + D.toko.nama + '*', 'No: ' + trx.id, 'Tgl: ' + fmtWaktu(trx.waktu), ''];
    trx.items.forEach(function (i) { baris.push('• ' + i.nama + (i.varian ? ' (' + i.varian + ')' : '') + ' ×' + i.qty + ' = ' + rp(i.qty * i.harga)); });
    baris.push('', '*Total: ' + rp(trx.total) + '*');
    if (trx.sisa > 0) baris.push('DP: ' + rp(trx.dp || 0), '*Sisa Tagihan: ' + rp(trx.sisa) + '*');
    if (trx.status === 'siap') baris.push('', 'Pesanan Anda sudah *SIAP DIAMBIL*. Terima kasih!');
    else baris.push('', D.toko.footer || 'Terima kasih!');
    var url = 'https://wa.me/' + (no || '') + '?text=' + encodeURIComponent(baris.join('\n'));
    window.open(url, '_blank', 'noopener');
  }
  // Generator QR Code SVG offline murni JS (Byte mode, EC-L, V1..V12)
  function qrSvg(teks) {
    var bytes = unescape(encodeURIComponent(teks)).split('').map(function (c) { return c.charCodeAt(0); });
    var CAPS = [0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367];
    var ECC = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24];
    var BLK = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4];
    var ver = 1; while (ver < 12 && bytes.length > CAPS[ver]) ver++;
    var N = 17 + ver * 4, totCW = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466][ver];
    var eccLen = ECC[ver], nBlk = BLK[ver], dataCW = totCW - eccLen * nBlk;
    var bits = []; function pushBits(v, len) { for (var i = len - 1; i >= 0; i--) bits.push((v >> i) & 1); }
    pushBits(4, 4); pushBits(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { pushBits(b, 8); });
    if (bits.length + 4 <= dataCW * 8) pushBits(0, 4);
    while (bits.length % 8) bits.push(0);
    var cw = []; for (var i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (var pad = 0; cw.length < dataCW; pad++) cw.push(pad % 2 ? 0x11 : 0xEC);
    var EXP = [], LOG = [];
    for (var x = 1, p = 0; p < 255; p++) { EXP[p] = x; LOG[x] = p; x = (x << 1) ^ (x & 128 ? 0x11D : 0); }
    function mul(a, b) { return a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0; }
    var gen = [1];
    for (var i = 0; i < eccLen; i++) {
      var ng = new Array(gen.length + 1).fill(0);
      for (var j = 0; j < gen.length; j++) { ng[j] ^= gen[j]; ng[j + 1] ^= mul(gen[j], EXP[i]); }
      gen = ng;
    }
    var bLen = Math.floor(dataCW / nBlk), rem = dataCW % nBlk, dBlks = [], eBlks = [], pos = 0;
    for (var b = 0; b < nBlk; b++) {
      var sz = bLen + (b >= nBlk - rem ? 1 : 0), blk = cw.slice(pos, pos + sz); pos += sz;
      dBlks.push(blk);
      var msg = blk.concat(new Array(eccLen).fill(0));
      for (var i = 0; i < blk.length; i++) {
        var coef = msg[i]; if (!coef) continue;
        for (var j = 0; j < gen.length; j++) msg[i + j] ^= mul(gen[j], coef);
      }
      eBlks.push(msg.slice(blk.length));
    }
    var stream = [];
    for (var i = 0; i < bLen + (rem ? 1 : 0); i++) for (var b = 0; b < nBlk; b++) if (i < dBlks[b].length) stream.push(dBlks[b][i]);
    for (var i = 0; i < eccLen; i++) for (var b = 0; b < nBlk; b++) stream.push(eBlks[b][i]);
    var M = [], F = []; for (var i = 0; i < N; i++) { M[i] = new Array(N).fill(0); F[i] = new Array(N).fill(0); }
    function setM(r, c, v) { M[r][c] = v ? 1 : 0; F[r][c] = 1; }
    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        if (r0 + r < 0 || r0 + r >= N || c0 + c < 0 || c0 + c >= N) continue;
        var on = (r >= 0 && r <= 6 && c >= 0 && c <= 6) && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        setM(r0 + r, c0 + c, on);
      }
    }
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (var i = 8; i < N - 8; i++) { setM(6, i, i % 2 === 0); setM(i, 6, i % 2 === 0); }
    setM(N - 8, 8, 1);
    var AP = [0, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58]][ver];
    for (var a = 0; a < AP.length; a++) for (var b = 0; b < AP.length; b++) {
      if (F[AP[a]][AP[b]]) continue;
      for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) setM(AP[a] + r, AP[b] + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
    }
    for (var i = 0; i < 9; i++) { if (!F[8][i]) F[8][i] = 1; if (!F[i][8]) F[i][8] = 1; if (i < 8) { F[8][N - 1 - i] = 1; F[N - 1 - i][8] = 1; } }
    if (ver >= 7) {
      var vB = ver; for (var r = 0; r < 18; r++) { F[Math.floor(r / 3)][N - 11 + (r % 3)] = 1; F[N - 11 + (r % 3)][Math.floor(r / 3)] = 1; }
      var vInfo = [0,0,0,0,0,0,0,0x07C94,0x085BC,0x09A99,0x0A4D3,0x0BBF6,0x0C762][ver];
      for (var r = 0; r < 18; r++) { var vb = (vInfo >> r) & 1; M[Math.floor(r / 3)][N - 11 + (r % 3)] = vb; M[N - 11 + (r % 3)][Math.floor(r / 3)] = vb; }
    }
    var sIdx = 0, sBit = 7, up = true;
    for (var col = N - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var k = 0; k < N; k++) {
        var r = up ? N - 1 - k : k;
        for (var d = 0; d < 2; d++) {
          var c = col - d; if (F[r][c]) continue;
          var bit = sIdx < stream.length ? ((stream[sIdx] >> sBit) & 1) : 0;
          if (--sBit < 0) { sIdx++; sBit = 7; }
          if ((r + c) % 2 === 0) bit ^= 1;
          M[r][c] = bit;
        }
      }
      up = !up;
    }
    var fmt = 0x77C4;
    for (var i = 0; i < 15; i++) {
      var fb = (fmt >> i) & 1;
      if (i < 6) M[8][i] = fb; else if (i < 8) M[8][i + 1] = fb; else M[8][N - 15 + i] = fb;
      if (i < 8) M[N - 1 - i][8] = fb; else if (i < 9) M[15 - i][8] = fb; else M[14 - i][8] = fb;
    }
    var rects = '';
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (M[r][c]) rects += '<rect x="' + (c + 2) + '" y="' + (r + 2) + '" width="1" height="1"/>';
    return '<svg viewBox="0 0 ' + (N + 4) + ' ' + (N + 4) + '" shape-rendering="crispEdges" role="img" aria-label="QRIS Dinamis"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">' + rects + '</g></svg>';
  }
  var btChar = null;
  function cetakBluetooth(trx) {
    if (!navigator.bluetooth) return toast('Web Bluetooth tidak didukung di mode/browser ini');
    var br = function (a, b) {
      var sp = Math.max(1, 32 - a.length - b.length);
      return a + new Array(sp + 1).join(' ') + b + '\n';
    };
    var txt = '\x1B@\x1Ba\x01' + D.toko.nama + '\n' + (D.toko.alamat ? D.toko.alamat + '\n' : '') + (D.toko.telp ? D.toko.telp + '\n' : '') +
      '\x1Ba\x00--------------------------------\n' + trx.id + '\n' + fmtWaktu(trx.waktu) + '\nKasir: ' + trx.kasir + '\n' +
      (trx.pelanggan ? 'Pelanggan: ' + trx.pelanggan + '\n' : '') + '--------------------------------\n';
    trx.items.forEach(function (i) { txt += i.nama + (i.varian ? ' (' + i.varian + ')' : '') + '\n' + br(i.qty + ' x ' + rp(i.harga), rp(i.qty * i.harga)); });
    txt += '--------------------------------\n' + br('Subtotal', rp(trx.subtotal));
    if (trx.diskon) txt += br('Diskon', '-' + rp(trx.diskon));
    txt += br('TOTAL', rp(trx.total)) + br(trx.metode.toUpperCase(), rp(trx.bayar));
    if (trx.sisa > 0) txt += br('SISA TAGIHAN', rp(trx.sisa));
    else if (trx.metode === 'tunai') txt += br('Kembali', rp(trx.kembali));
    txt += '--------------------------------\n\x1Ba\x01' + (D.toko.footer || 'Terima kasih!') + '\n\n\n\x1DV\x00';
    var bytes = new TextEncoder().encode(txt);
    function kirim(ch) {
      var p = Promise.resolve();
      for (var i = 0; i < bytes.length; i += 20) (function (sl) { p = p.then(function () { return ch.writeValue(sl); }); })(bytes.slice(i, i + 20));
      p.then(function () { toast('Terkirim ke printer Bluetooth'); }).catch(function () { btChar = null; toast('Gagal kirim ke printer'); });
    }
    if (btChar && btChar.service && btChar.service.device && btChar.service.device.gatt.connected) return kirim(btChar);
    var uuids = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455'];
    navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: uuids })
      .then(function (dev) { return dev.gatt.connect(); })
      .then(function (srv) { return srv.getPrimaryServices(); })
      .then(function (svcs) {
        var found = null;
        return svcs.reduce(function (pr, s) {
          return pr.then(function () {
            if (found) return;
            return s.getCharacteristics().then(function (chs) {
              chs.forEach(function (c) { if (!found && (c.properties.write || c.properties.writeWithoutResponse)) found = c; });
            }).catch(function () {});
          });
        }, Promise.resolve()).then(function () { return found; });
      })
      .then(function (ch) { if (!ch) throw 0; btChar = ch; kirim(ch); })
      .catch(function () { toast('Printer Bluetooth tidak terhubung'); });
  }

  // ---------- Tema (customizer, lihat tema.css & tema.js) ----------
  var FONT_OK = ['Plus Jakarta Sans', 'Inter', 'Poppins', 'DM Sans', 'Space Grotesk', 'Nunito'];
  function terapkanTema(t) {
    var r = document.documentElement, st = r.style;
    if (t.utama) st.setProperty('--tema-utama', t.utama);
    if (t.aksen) st.setProperty('--tema-aksen', t.aksen);
    if (t.radius != null) st.setProperty('--tema-radius', typeof t.radius === 'number' ? t.radius + 'px' : t.radius);
    if (t.font) {
      var f = String(t.font).split(',')[0].replace(/["']/g, '').trim();
      st.setProperty('--tema-font', '"' + f + '", system-ui, sans-serif');
      var l = document.getElementById('fontTema');
      if (l && FONT_OK.indexOf(f) >= 0) l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700;800&display=swap';
    }
    if (t.mode) { var m = t.mode === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang') : t.mode; r.setAttribute('data-mode', m); }
    if (t.bagian) terapkanBagian(t.bagian);
    setTimeout(hitungTeksBagian, 0);
    if (t.nama) {
      NAMA_TEMA = t.nama;
      if (D && D.toko.namaDariTema) { D.toko.nama = t.nama; $$('[data-tema-nama]').forEach(function (e) { e.textContent = t.nama; }); }
    }
  }
  window.addEventListener('message', function (e) { if (e.data && e.data.tipe === 'tema') terapkanTema(e.data); });
  // ---------- Bagian (customizer: warna per bagian, sorot, tap-untuk-pilih) ----------
  var PETA_BAGIAN = {
    nav: '.samping, .bawah, .masuk-merek',
    latar: 'main, .masuk-form, .pos-kiri, .hal',
    panel: '.panel, .kartu-produk, .keranjang, .ker-ringkas, .layar-uang, .numpad button, .tabel-bungkus, .trx, .angka:not(.sorot), dialog, .masuk-kartu',
    utama: '.tombol.utama, .nav.aktif, .chip.aktif, .tambah, .tautan, .angka.sorot, .pilih-kasir .aktif, .fab-keranjang',
    aksen: '.thumb, .di-ker, .masuk-ilus, .grafik .batang, .terlaris li, .stok.tipis',
    teks: 'h1, h2, h3, .total-besar, .kartu-produk b, .baris.total, .merek span'
  };
  var NAMA_BAGIAN = { nav: 'Navigasi', latar: 'Latar', panel: 'Panel', utama: 'Warna utama', aksen: 'Aksen', teks: 'Teks' };
  var VAR_BAGIAN = { latar: '--latar', panel: '--kartu', nav: '--nav', teks: '--teks' };
  function tandaiBagian() {
    var baru = 0;
    Object.keys(PETA_BAGIAN).forEach(function (b) {
      Array.prototype.forEach.call(document.querySelectorAll(PETA_BAGIAN[b]), function (el) { if (!el.hasAttribute('data-bagian')) { el.setAttribute('data-bagian', b); baru++; } });
    });
    if (baru && sorotAktif) sorot(sorotAktif);
  }
  // warna teks otomatis (terang/gelap) dari luminansi warna latar sebenarnya
  function warnaNyata(v) {
    var p = document.createElement('i'); p.style.cssText = 'position:absolute;width:0;height:0;background:var(' + v + ')';
    document.body.appendChild(p); var c = getComputedStyle(p).backgroundColor; p.remove();
    var m = c.match(/[\d.]+/g) || [255, 255, 255];
    if (/^color\(srgb/.test(c)) m = m.map(function (x) { return x * 255; });
    return m.slice(0, 3).map(Number);
  }
  function teksUntuk(v) {
    var l = warnaNyata(v).map(function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
    return L > 0.4 ? '#14171a' : '#ffffff';
  }
  function hitungTeksBagian() {
    if (!document.body) return;
    var st = document.documentElement.style;
    st.setProperty('--tema-nav-teks', teksUntuk('--nav'));
    st.setProperty('--tema-utama-teks', teksUntuk('--utama'));
  }
  function terapkanBagian(bg) {
    var st = document.documentElement.style;
    Object.keys(VAR_BAGIAN).forEach(function (k) {
      if (bg[k] === undefined) return;
      if (bg[k]) { st.setProperty('--tema-' + k, bg[k]); st.setProperty(VAR_BAGIAN[k], bg[k]); }
      else { st.removeProperty('--tema-' + k); st.removeProperty(VAR_BAGIAN[k]); }
    });
  }
  var sorotAktif = null;
  function sorot(b) {
    sorotAktif = b;
    Array.prototype.forEach.call(document.querySelectorAll('[data-sorot]'), function (e) { e.removeAttribute('data-sorot'); });
    Array.prototype.forEach.call(document.querySelectorAll('.label-sorot'), function (e) { e.remove(); });
    if (!b) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-bagian="' + b + '"]'), function (e) {
      e.setAttribute('data-sorot', '');
      var r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      var lb = document.createElement('span'); lb.className = 'label-sorot'; lb.textContent = NAMA_BAGIAN[b] || b;
      lb.style.left = Math.max(2, r.left + 4) + 'px'; lb.style.top = Math.max(2, r.top + 4) + 'px';
      document.body.appendChild(lb);
    });
  }
  var modePilih = false, hoverEl = null;
  function bagianDari(t) { return t && t.closest ? t.closest('[data-bagian]') : null; }
  function setPilih(on) {
    modePilih = !!on; document.documentElement.classList.toggle('mode-pilih', modePilih);
    if (!modePilih && hoverEl) { hoverEl.removeAttribute('data-pilih-hover'); hoverEl = null; }
  }
  ['click', 'pointerdown', 'mousedown', 'touchstart', 'submit', 'keydown'].forEach(function (tipe) {
    document.addEventListener(tipe, function (e) {
      if (!modePilih) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (tipe === 'click') { var el = bagianDari(e.target); if (el) parent.postMessage({ tipe: 'bagian-dipilih', bagian: el.getAttribute('data-bagian') }, '*'); }
    }, { capture: true, passive: false });
  });
  document.addEventListener('mouseover', function (e) {
    if (!modePilih) return; var el = bagianDari(e.target);
    if (hoverEl && hoverEl !== el) hoverEl.removeAttribute('data-pilih-hover');
    hoverEl = el; if (el) el.setAttribute('data-pilih-hover', '');
  }, true);
  window.addEventListener('message', function (e) {
    var d = e.data; if (!d) return;
    if (d.tipe === 'sorot') sorot(d.bagian || null);
    else if (d.tipe === 'mode-pilih') setPilih(d.aktif);
  });
  var _tandaiRaf = 0;
  new MutationObserver(function (ms) {
    var mode = ms.some(function (m) { return m.type === 'attributes'; });
    if (mode) hitungTeksBagian();
    if (!modePilih && !sorotAktif && window.self === window.top) return;
    var dom = ms.some(function (m) { return m.type === 'childList' && Array.prototype.some.call(m.addedNodes, function (n) { return n.nodeType === 1 && n.className !== 'label-sorot'; }); });
    if (dom && !_tandaiRaf) _tandaiRaf = requestAnimationFrame(function () { _tandaiRaf = 0; tandaiBagian(); });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mode'] });
  if (window.self !== window.top) tandaiBagian();
  hitungTeksBagian();

  function simpan() {
    try {
      var salin = Object.assign({}, D, { pelanggan: [] });
      localStorage.setItem(KUNCI, JSON.stringify(salin));
    } catch (e) { toast('Gagal menyimpan: memori penuh'); }
  }

  // ---------- Utilitas ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 120); }; }
  function rp(n) { return 'Rp' + Math.round(n || 0).toLocaleString('id-ID'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function dua(n) { return (n < 10 ? '0' : '') + n; }
  function tglKey(d) { return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate()); }
  function noTrx(d, n) { return 'TRX' + String(d.getFullYear()).slice(2) + dua(d.getMonth() + 1) + dua(d.getDate()) + '-' + String(n).padStart(4, '0'); }
  function fmtWaktu(iso) { var d = new Date(iso); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + dua(d.getHours()) + ':' + dua(d.getMinutes()); }
  // ---------- Ilustrasi produk (SVG buatan sendiri, dipilih dari kata di nama/kategori) ----------
  // Warna makanan tetap; latar kotak diturunkan dari tema (--utama/--aksen) di style.css (.thumb[data-nada]).
  var ILUS = {
    kopi: '<ellipse cx="60" cy="72" rx="34" ry="6" fill="#e9dfd2"/><path d="M38 40h44l-4 26a8 8 0 0 1-8 7H50a8 8 0 0 1-8-7z" fill="#fff" stroke="#d9cbb8" stroke-width="1.5"/><path d="M82 46h4a8 8 0 0 1 0 16h-6" fill="none" stroke="#d9cbb8" stroke-width="4"/><ellipse cx="60" cy="41" rx="22" ry="4.5" fill="#7a4a2b"/><path d="M53 38c2-3 6-3 7 0s5 3 7 0" fill="none" stroke="#e9c79a" stroke-width="1.6" stroke-linecap="round"/><path class="uap" d="M52 30c-3-4 3-6 0-11M61 29c-3-4 3-6 0-11M70 30c-3-4 3-6 0-11" fill="none" stroke="#b9a58e" stroke-width="2" stroke-linecap="round" opacity=".7"/>',
    es: '<path d="M42 22h36l-5 52a6 6 0 0 1-6 5H53a6 6 0 0 1-6-5z" fill="#fff" fill-opacity=".55" stroke="#cfd6d2" stroke-width="1.5"/><path d="M44.5 40h31l-3.4 33a5 5 0 0 1-5 4.5H52.9a5 5 0 0 1-5-4.5z" fill="{c}"/><path d="M44.5 40h31l-.6 6c-6 3-24 3-30 0z" fill="#fff" opacity=".35"/><rect x="50" y="44" width="9" height="9" rx="2" fill="#fff" opacity=".7" transform="rotate(-12 54 48)"/><rect x="61" y="50" width="9" height="9" rx="2" fill="#fff" opacity=".6" transform="rotate(10 65 54)"/><path d="M66 12l-6 52" stroke="{s}" stroke-width="3.5" stroke-linecap="round"/>',
    mug: '<ellipse cx="60" cy="74" rx="30" ry="5" fill="#e9dfd2"/><rect x="38" y="36" width="40" height="38" rx="8" fill="{c}"/><path d="M78 44h3a8 8 0 0 1 0 16h-3" fill="none" stroke="{c}" stroke-width="5"/><path d="M40 37c4-9 14-6 18-10 4 5 12 1 18 10z" fill="#fff8ee"/><circle cx="52" cy="31" r="2" fill="#7a4a2b"/><circle cx="62" cy="29" r="1.6" fill="#7a4a2b"/><rect x="44" y="50" width="28" height="4" rx="2" fill="#fff" opacity=".25"/>',
    nasi: '<ellipse cx="60" cy="58" rx="44" ry="17" fill="#fff" stroke="#e6e0d6" stroke-width="1.5"/><ellipse cx="60" cy="56" rx="34" ry="11" fill="#f2f0ea"/><path d="M34 54c4-16 48-16 52 0-8 6-44 6-52 0z" fill="#d98a3a"/><circle cx="46" cy="47" r="1.6" fill="#b5651d"/><circle cx="58" cy="44" r="1.6" fill="#7aa35a"/><circle cx="70" cy="47" r="1.6" fill="#c0392b"/><ellipse cx="72" cy="42" rx="12" ry="8" fill="#fff"/><circle cx="73" cy="42" r="4.5" fill="#f5b52e"/><circle cx="36" cy="62" r="4" fill="#7fb069"/><circle cx="36" cy="62" r="2.2" fill="#d8ecc8"/><circle cx="45" cy="65" r="4" fill="#7fb069"/><circle cx="45" cy="65" r="2.2" fill="#d8ecc8"/>',
    mie: '<path d="M26 46h68a34 26 0 0 1-68 0z" fill="{c}"/><path d="M26 46h68" stroke="#fff" stroke-width="2" opacity=".4"/><path d="M34 46c4-10 8 4 12-6s8 6 12-4 8 6 12-4 8 6 12-2 6 4 8 0" fill="none" stroke="#e8b34a" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="40" r="3" fill="#7fb069"/><circle cx="72" cy="40" r="3" fill="#c0392b"/><path d="M70 10l18 30M78 8l14 32" stroke="#8b5a32" stroke-width="3" stroke-linecap="round"/><path d="M44 66h32" stroke="#fff" stroke-width="2" opacity=".3"/>',
    roti: '<ellipse cx="60" cy="72" rx="36" ry="6" fill="#e9dfd2"/><g transform="rotate(-8 50 50)"><path d="M30 46c-6-16 30-20 34-4v26H32z" fill="#c9843f"/><path d="M34 47c-3-11 24-14 27-3v21H35z" fill="#f4d9a6"/></g><g transform="rotate(8 72 50)"><path d="M56 46c-6-16 30-20 34-4v26H58z" fill="#c9843f"/><path d="M60 47c-3-11 24-14 27-3v21H61z" fill="#f4d9a6"/><path d="M62 52c4 3 8-3 12 0s8-3 12 0M62 60c4 3 8-3 12 0s8-3 12 0" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round"/></g>',
    kentang: '<g fill="#f2c14e" stroke="#d99a2b" stroke-width="1"><rect x="40" y="14" width="6" height="34" rx="2" transform="rotate(-10 43 30)"/><rect x="49" y="10" width="6" height="36" rx="2"/><rect x="58" y="12" width="6" height="34" rx="2" transform="rotate(6 61 30)"/><rect x="66" y="14" width="6" height="32" rx="2" transform="rotate(14 69 30)"/><rect x="45" y="18" width="6" height="30" rx="2" transform="rotate(4 48 32)"/></g><path d="M36 36h48l-6 40H42z" fill="{c}"/><path d="M36 36c8 8 40 8 48 0" fill="none" stroke="#fff" stroke-width="2.5" opacity=".5"/><circle cx="60" cy="58" r="7" fill="#fff" opacity=".9"/><path d="M57 58h6" stroke="{c}" stroke-width="2" stroke-linecap="round"/>',
    pisang: '<ellipse cx="60" cy="62" rx="42" ry="14" fill="#fff" stroke="#e6e0d6" stroke-width="1.5"/><g fill="#d9902f"><ellipse cx="44" cy="52" rx="14" ry="7" transform="rotate(-18 44 52)"/><ellipse cx="62" cy="48" rx="15" ry="7" transform="rotate(8 62 48)"/><ellipse cx="78" cy="55" rx="13" ry="6.5" transform="rotate(-10 78 55)"/><ellipse cx="56" cy="60" rx="14" ry="6.5" transform="rotate(4 56 60)"/></g><g fill="#f0bd5e" opacity=".8"><circle cx="40" cy="50" r="2"/><circle cx="62" cy="46" r="2"/><circle cx="80" cy="53" r="2"/><circle cx="54" cy="58" r="2"/></g>',
    kertas: '<ellipse cx="60" cy="78" rx="32" ry="5" fill="#e6e1d6"/><rect x="40" y="18" width="40" height="54" rx="3" fill="#fff" stroke="#d8d2c4" stroke-width="1.5" transform="rotate(-8 60 45)"/><rect x="42" y="16" width="40" height="54" rx="3" fill="#fff" stroke="#d8d2c4" stroke-width="1.5"/><rect x="48" y="24" width="20" height="4" rx="2" fill="{c}"/><rect x="48" y="33" width="28" height="3" rx="1.5" fill="#cfcabd"/><rect x="48" y="40" width="28" height="3" rx="1.5" fill="#cfcabd"/><rect x="48" y="47" width="22" height="3" rx="1.5" fill="#cfcabd"/><rect x="48" y="55" width="28" height="9" rx="2" fill="{s}" opacity=".85"/>',
    kertasWarna: '<ellipse cx="60" cy="78" rx="32" ry="5" fill="#e6e1d6"/><rect x="40" y="18" width="40" height="54" rx="3" fill="#fff" stroke="#d8d2c4" stroke-width="1.5" transform="rotate(-6 60 45)"/><rect x="42" y="16" width="40" height="54" rx="3" fill="#fff" stroke="#d8d2c4" stroke-width="1.5"/><rect x="48" y="24" width="28" height="16" rx="2" fill="#e0457b" opacity=".85"/><circle cx="56" cy="32" r="4" fill="#f5c400"/><rect x="48" y="46" width="28" height="3" rx="1.5" fill="#cfcabd"/><rect x="48" y="53" width="20" height="3" rx="1.5" fill="#00a3d9"/>',
    jilid: '<ellipse cx="60" cy="78" rx="34" ry="5" fill="#e6e1d6"/><rect x="34" y="20" width="52" height="54" rx="4" fill="{c}"/><rect x="40" y="20" width="46" height="54" rx="3" fill="#fff" opacity=".18"/><g fill="#fff">' + [26, 34, 42, 50, 58, 66].map(function (y) { return '<circle cx="38" cy="' + y + '" r="2.2"/>'; }).join('') + '</g><rect x="50" y="32" width="26" height="5" rx="2.5" fill="#fff" opacity=".85"/><rect x="50" y="42" width="18" height="3" rx="1.5" fill="#fff" opacity=".6"/>',
    laminasi: '<ellipse cx="60" cy="76" rx="32" ry="5" fill="#e6e1d6"/><rect x="30" y="26" width="60" height="40" rx="6" fill="#fff" fill-opacity=".55" stroke="{c}" stroke-width="2"/><rect x="36" y="32" width="48" height="28" rx="3" fill="#fff" stroke="#d8d2c4"/><circle cx="48" cy="44" r="6" fill="{s}" opacity=".8"/><rect x="58" y="40" width="22" height="3" rx="1.5" fill="#cfcabd"/><rect x="58" y="47" width="16" height="3" rx="1.5" fill="#cfcabd"/><path d="M78 28l8 8" stroke="#fff" stroke-width="3" opacity=".8"/>',
    banner: '<ellipse cx="60" cy="76" rx="36" ry="5" fill="#e6e1d6"/><rect x="24" y="22" width="72" height="42" rx="4" fill="{c}"/><rect x="30" y="28" width="60" height="30" rx="2" fill="#fff" opacity=".2"/><rect x="34" y="34" width="32" height="5" rx="2" fill="#fff"/><rect x="34" y="43" width="46" height="3" rx="1.5" fill="#fff" opacity=".75"/><circle cx="28" cy="26" r="2" fill="#fff"/><circle cx="92" cy="26" r="2" fill="#fff"/><circle cx="28" cy="60" r="2" fill="#fff"/><circle cx="92" cy="60" r="2" fill="#fff"/>',
    scan: '<ellipse cx="60" cy="76" rx="34" ry="5" fill="#e6e1d6"/><rect x="30" y="28" width="60" height="38" rx="4" fill="#3a3f45"/><rect x="36" y="34" width="48" height="24" rx="2" fill="#fff"/><path d="M32 45h56" stroke="#00a3d9" stroke-width="3"/><rect x="44" y="38" width="24" height="3" rx="1.5" fill="#cfcabd"/><rect x="44" y="50" width="32" height="3" rx="1.5" fill="#cfcabd"/>',
    stempel: '<ellipse cx="60" cy="76" rx="30" ry="5" fill="#e6e1d6"/><path d="M52 20c0-6 16-6 16 0l-3 18h-10z" fill="{c}"/><rect x="34" y="42" width="52" height="14" rx="4" fill="{c}"/><rect x="32" y="56" width="56" height="7" rx="2" fill="#3a3f45"/><rect x="36" y="65" width="48" height="4" rx="2" fill="#e0457b" opacity=".8"/>',
    map: '<ellipse cx="60" cy="76" rx="32" ry="5" fill="#e6e1d6"/><path d="M28 28h22l6 6h36v34a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4z" fill="{c}"/><rect x="32" y="38" width="56" height="30" rx="2" fill="#fff" opacity=".2"/><circle cx="60" cy="52" r="4" fill="#fff"/>',
    pulpen: '<ellipse cx="60" cy="76" rx="28" ry="5" fill="#e6e1d6"/><g transform="rotate(-35 60 45)"><rect x="54" y="16" width="12" height="50" rx="3" fill="{c}"/><path d="M54 66l6 10 6-10z" fill="#f2c14e"/><rect x="54" y="24" width="12" height="6" fill="#fff" opacity=".4"/></g>',
    materai: '<ellipse cx="60" cy="76" rx="30" ry="5" fill="#e6e1d6"/><rect x="32" y="22" width="56" height="44" rx="4" fill="#fff" stroke="{c}" stroke-width="2" stroke-dasharray="4 2"/><rect x="38" y="28" width="44" height="32" rx="2" fill="{c}" opacity=".18"/><text x="60" y="48" text-anchor="middle" font-size="13" font-weight="800" fill="{c}">10000</text>',
    cd: '<ellipse cx="60" cy="76" rx="30" ry="5" fill="#e6e1d6"/><circle cx="60" cy="44" r="24" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/><path d="M60 44L44 26a24 24 0 0 1 20-6z" fill="#fff" opacity=".6"/><circle cx="60" cy="44" r="7" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>',
    umum: '<ellipse cx="60" cy="74" rx="30" ry="5" fill="#e9dfd2"/><path d="M36 34l24-12 24 12v30l-24 12-24-12z" fill="{c}"/><path d="M36 34l24 12 24-12M60 46v30" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/><path d="M48 28l24 12" stroke="#fff" stroke-width="3" opacity=".4"/>'
  };
  var IKON_PACK = [
    ['', 'Auto'], ['kertas', 'Kertas'], ['kertasWarna', 'Warna'], ['jilid', 'Jilid'],
    ['laminasi', 'Laminasi'], ['banner', 'Banner'], ['scan', 'Scan'], ['stempel', 'Stempel'],
    ['map', 'Map/Amplop'], ['pulpen', 'ATK'], ['materai', 'Materai'], ['cd', 'CD/DVD'], ['umum', 'Kotak']
  ];
  function jenisIlus(p) {
    var s = (p.nama + ' ' + p.kategori).toLowerCase();
    var aturan = [
      [/print warna|pas foto|warna/, 'kertas', '#d4573b', '#2f80c9'], [/fotocopy|print|scan/, 'kertas', '#3a3f45', '#9aa3ab'],
      [/jilid/, 'jilid', '#2f5d8a'], [/laminasi/, 'laminasi', '#2f80c9', '#d4573b'],
      [/matcha/, 'es', '#8fb35a', '#2f5d3a'], [/teh|lemon|es |jeruk|soda/, 'es', '#e7a83a', '#d4573b'],
      [/cokelat|coklat|susu panas/, 'mug', '#7a4a2b'], [/nasi/, 'nasi'], [/mie|bakso|soto/, 'mie', '#c0392b'],
      [/roti|toast|sandwich/, 'roti', '#6b3a1f'], [/kentang|fries/, 'kentang', '#d64933'], [/pisang|goreng/, 'pisang'],
      [/kopi|americano|cappuccino|latte|espresso|mocha/, 'kopi'], [/minum|non-kopi/, 'es', '#b97a4a', '#2f5d3a']
    ];
    for (var i = 0; i < aturan.length; i++) if (aturan[i][0].test(s)) return aturan[i];
    return [null, 'umum', '#9aa79d'];
  }
  function ilustrasi(p) {
    if (p.foto) return '<img class="ilus foto-produk" src="' + esc(p.foto) + '" alt="" loading="lazy" onerror="this.outerHTML=window.__ilusCadangan(\'' + p.id + '\')">';
    return ilustrasiSvg(p);
  }
  window.__ilusCadangan = function (id) { var p = D.produk.filter(function (x) { return x.id === id; })[0]; return p ? ilustrasiSvg(p) : ''; };
  // Logo: tampil di .merek bila gambar termuat; gagal dimuat -> inisial nama toko
  function pasangLogo(paksa) {
    var src = (D && D.toko && D.toko.logo) || KONFIG.logo;
    if (!src) return;
    $$('.merek').forEach(function (m) {
      if (paksa) $$('.logo-img, .logo-inisial', m).forEach(function (el) { el.remove(); });
      var svg = $('svg.logo', m); if (!svg) return;
      if (!paksa && svg.getAttribute('data-logo-siap')) return;
      svg.setAttribute('data-logo-siap', '1');
      var w = svg.getAttribute('width'), img = new Image(); img.className = 'logo logo-img'; img.alt = ''; img.width = w; img.height = w;
      img.onload = function () { svg.style.display = 'none'; svg.parentNode.insertBefore(img, svg); };
      img.onerror = function () { var sp = document.createElement('span'); sp.className = 'logo logo-inisial'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = inisial((D && D.toko.nama) || NAMA_TEMA); sp.style.width = sp.style.height = w + 'px'; svg.style.display = 'none'; svg.parentNode.insertBefore(sp, svg); };
      img.src = src;
    });
  }
  function kecilkanFoto(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      if (file.type === 'image/svg+xml' && file.size <= 150000) return cb(r.result);
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 400 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        var ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(im, 0, 0, c.width, c.height);
        var trans = /png|webp|gif|svg/i.test(file.type || '');
        cb(trans ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = function () { toast('Berkas bukan gambar'); };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }
  function ilustrasiSvg(p) {
    if (p.ikon && ILUS[p.ikon]) {
      var svgI = ILUS[p.ikon].replace(/\{c\}/g, '#24578f').replace(/\{s\}/g, '#e0457b');
      return '<svg class="ilus" viewBox="0 0 120 90" aria-hidden="true">' + svgI + '</svg>';
    }
    var j = jenisIlus(p), es = /ice|es\b/i.test(p.varian.map(function (v) { return v.nama; }).join(' '));
    var bentuk = j[1] === 'kopi' && /americano/i.test(p.nama) && es ? 'es' : j[1];
    var svg = ILUS[bentuk].replace(/\{c\}/g, j[2] || (bentuk === 'es' ? '#6b4128' : '#7a4a2b')).replace(/\{s\}/g, j[3] || '#2f5d3a');
    return '<svg class="ilus" viewBox="0 0 120 90" aria-hidden="true">' + svg + '</svg>';
  }
  function nadaDari(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 4; }
  function inisial(s) { return s.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  var tTimer;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('tampil'); clearTimeout(tTimer); tTimer = setTimeout(function () { t.classList.remove('tampil'); }, 2200); }
  function unduh(nama, isi, tipe) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([isi], { type: tipe }));
    a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csvSel(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function parseCSV(teks) {
    var baris = [], sel = '', row = [], kutip = false;
    for (var i = 0; i < teks.length; i++) {
      var c = teks[i];
      if (kutip) {
        if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
        else if (c === '"') kutip = false; else sel += c;
      } else if (c === '"') kutip = true;
      else if (c === ',') { row.push(sel); sel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(sel); baris.push(row); row = []; sel = ''; }
      else sel += c;
    }
    if (sel || row.length) { row.push(sel); baris.push(row); }
    return baris.filter(function (r) { return r.join('').trim(); });
  }

  // ---------- Sesi kasir ----------
  var pengguna = null, pinBuffer = '', kasirDipilih = null;
  function isAdmin() { return pengguna && pengguna.peran === 'admin'; }

  function tampilMasuk() {
    $('#aplikasi').hidden = true; $('#layarMasuk').hidden = false;
    $('#masukToko').textContent = D.toko.nama;
    var reg = muatAkunReg();
    var acc = reg.daftar.find(function (a) { return a.id === akunAktifId; }) || reg.daftar[0];
    if ($('#akunLabel') && acc) $('#akunLabel').textContent = acc.nama + ' (@' + acc.username + ')';
    var ph = $('#pinHint');
    if (ph) ph.hidden = akunAktifId !== 'default';
    var mi = $('#masukIlus'); if (mi) mi.innerHTML = D.produk.slice(0, 6).map(function (p, n) { return '<span class="thumb" data-nada="' + nadaDari(p.kategori + p.nama) + '" style="--i:' + n + '">' + ilustrasi(p) + '</span>'; }).join('');
    kasirDipilih = D.kasir[0]; pinBuffer = '';
    $('#daftarKasir').innerHTML = D.kasir.map(function (k) { return '<button data-id="' + k.id + '">' + esc(k.nama) + '</button>'; }).join('');
    $$('#daftarKasir button').forEach(function (b) {
      b.classList.toggle('aktif', b.dataset.id === kasirDipilih.id);
      b.onclick = function () { kasirDipilih = D.kasir.find(function (k) { return k.id === b.dataset.id; }); pinBuffer = ''; tampilMasuk.titik(); $$('#daftarKasir button').forEach(function (x) { x.classList.toggle('aktif', x === b); }); };
    });
    tampilMasuk.titik();
  }
  tampilMasuk.titik = function () { $$('#pinTitik i').forEach(function (i, n) { i.classList.toggle('isi', n < pinBuffer.length); }); };
  function ketikPin(k) {
    if (k === 'hapus') pinBuffer = pinBuffer.slice(0, -1);
    else if (pinBuffer.length < 4) pinBuffer += k;
    tampilMasuk.titik();
    if (pinBuffer.length === 4) {
      if (kasirDipilih && kasirDipilih.pin === pinBuffer) { masuk(kasirDipilih); }
      else { var t = $('#pinTitik'); t.classList.add('salah'); setTimeout(function () { t.classList.remove('salah'); pinBuffer = ''; tampilMasuk.titik(); }, 350); }
    }
  }
  function masuk(k) {
    pengguna = k; try { sessionStorage.setItem('kasir-sesi', k.id); } catch (e) { }
    $('#layarMasuk').hidden = true; $('#aplikasi').hidden = false;
    $('#namaKasir').textContent = k.nama + (k.peran === 'admin' ? ' · admin' : '');
    $('#namaTokoNav').textContent = D.toko.nama;
    $$('[data-hal="produk"],[data-hal="atur"],#btnHapusSemuaTrx,#btnHapusTerpilih').forEach(function (b) { b.hidden = !isAdmin(); });
    var tg = $('#tglHariIni'); if (tg) tg.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var av = $('#avatarKasir'); if (av) av.textContent = inisial(k.nama);
    buka('kasir');
    perbaruiShiftPill(); perbaruiIkonTema();
    if (isAdmin() && D.aturan && (!D.aturan.lastBackup || Date.now() - D.aturan.lastBackup > 7 * 86400000) && D.transaksi.length > 5) {
      setTimeout(function () { toast('Tips: Jangan lupa Backup JSON berkala di menu Atur'); }, 1200);
    }
  }

  // ---------- Navigasi & Dropdown Kustom ----------
  var ddMenuAktif = null, ddBtnAktif = null;
  function tutupDropdown() {
    if (ddMenuAktif) { ddMenuAktif.remove(); ddMenuAktif = null; }
    if (ddBtnAktif) { ddBtnAktif.setAttribute('aria-expanded', 'false'); ddBtnAktif = null; }
  }
  function sinkronDropdown(sel) {
    if (!sel || !sel._ddBtn) return;
    var opt = sel.options[sel.selectedIndex];
    sel._ddBtn.querySelector('span').textContent = opt ? opt.textContent : '';
  }
  function tingkatkanDropdown(akar) {
    $$('select', akar || document).forEach(function (sel) {
      if (sel._ddSiap) { sinkronDropdown(sel); return; }
      sel._ddSiap = true;
      var wrap = document.createElement('div'); wrap.className = 'dd';
      sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
      sel.classList.add('dd-asli'); sel.tabIndex = -1;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'dd-btn';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
      btn.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
      wrap.appendChild(btn); sel._ddBtn = btn;
      sinkronDropdown(sel);
      sel.addEventListener('change', function () { sinkronDropdown(sel); });
      btn.onclick = function (e) {
        e.stopPropagation();
        if (ddBtnAktif === btn) { tutupDropdown(); return; }
        tutupDropdown();
        var r = btn.getBoundingClientRect();
        var menu = document.createElement('div'); menu.className = 'dd-menu'; menu.setAttribute('role', 'listbox');
        var host = btn.closest('dialog[open]') || document.body;
        Array.prototype.forEach.call(sel.options, function (opt, idx) {
          var ob = document.createElement('button');
          ob.type = 'button'; ob.className = 'dd-opt' + (idx === sel.selectedIndex ? ' aktif' : '');
          ob.setAttribute('role', 'option'); ob.setAttribute('aria-selected', idx === sel.selectedIndex ? 'true' : 'false');
          ob.textContent = opt.textContent;
          ob.onclick = function (ev) {
            ev.stopPropagation();
            if (sel.selectedIndex !== idx) {
              sel.selectedIndex = idx;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            sinkronDropdown(sel);
            tutupDropdown();
            btn.focus();
          };
          menu.appendChild(ob);
        });
        host.appendChild(menu);
        var mw = Math.max(r.width, menu.offsetWidth), mh = menu.offsetHeight;
        var left = Math.min(r.left, window.innerWidth - mw - 8);
        var top = (r.bottom + 6 + mh > window.innerHeight - 8 && r.top - 6 - mh > 8) ? (r.top - 6 - mh) : (r.bottom + 6);
        menu.style.left = Math.max(8, left) + 'px';
        menu.style.top = top + 'px';
        menu.style.minWidth = r.width + 'px';
        btn.setAttribute('aria-expanded', 'true');
        ddMenuAktif = menu; ddBtnAktif = btn;
      };
    });
  }
  document.addEventListener('click', function (e) { if (ddMenuAktif && !ddMenuAktif.contains(e.target) && e.target !== ddBtnAktif) tutupDropdown(); });

  function perbaruiShiftPill() {
    var sp = $('#shiftIndikator'); if (!sp) return;
    var akt = D && D.shift && D.shift.aktif;
    sp.classList.toggle('aktif', !!akt);
    sp.textContent = akt ? 'Shift aktif (' + akt.kasir + ')' : 'Shift belum buka';
  }
  function perbaruiIkonTema() {
    var bt = $('#btnTema'); if (!bt) return;
    var gl = document.documentElement.getAttribute('data-mode') === 'gelap';
    bt.innerHTML = gl
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    bt.title = gl ? 'Pindah ke mode terang' : 'Pindah ke mode gelap';
  }
  function buka(hal) {
    tutupDropdown();
    $$('.hal').forEach(function (s) { s.classList.toggle('aktif', s.id === 'hal-' + hal); });
    try { $('main').scrollTop = 0; } catch (e) { }
    $$('.nav').forEach(function (b) { b.classList.toggle('aktif', b.dataset.hal === hal); });
    ({ kasir: renderPOS, produk: renderKelola, riwayat: renderRiwayat, laporan: renderLaporan, atur: renderAtur })[hal]();
  }

  // ---------- POS ----------
  var keranjang = [], katAktif = 'Semua';
  function sisaStok(p) { return tanpaStok(p) ? Infinity : p.stok - stokTerpakai(p.id); }
  function stokTerpakai(pid) { return keranjang.filter(function (i) { return i.pid === pid; }).reduce(function (s, i) { return s + i.qty; }, 0); }

  function segarkanBadgeKartu() {
    $$('#gridProduk .kartu-produk').forEach(function (el) {
      var p = D.produk.find(function (x) { return x.id === el.dataset.id; });
      if (!p) return;
      var sisa = sisaStok(p), diKer = keranjang.filter(function (i) { return i.pid === p.id; }).length;
      el.classList.toggle('dipilih', diKer > 0);
      el.disabled = sisa <= 0;
      var th = $('.thumb', el), dk = $('.di-ker', el);
      if (diKer) {
        if (dk) dk.textContent = diKer;
        else if (th) th.insertAdjacentHTML('beforeend', '<span class="di-ker">' + diKer + '</span>');
      } else if (dk) dk.remove();
      var st = $('.stok', el);
      if (st && !tanpaStok(p)) {
        st.classList.toggle('tipis', sisa <= 5);
        st.textContent = (sisa <= 0 ? 'Stok habis' : (sisa <= 5 ? 'Sisa ' : 'Stok ') + sisa) + (p.varian.length > 1 ? ' · ' + p.varian.length + ' varian' : '');
      }
    });
    renderKeranjang();
  }

  var telpAktif = '';
  function renderPOS() {
    var adaFav = D.produk.some(function (p) { return p.favorit; });
    var kats = ['Semua'].concat(adaFav ? ['Favorit'] : []).concat(D.kategori);
    $('#chipKategori').innerHTML = kats.map(function (k) {
      var n = k === 'Semua' ? D.produk.length : k === 'Favorit' ? D.produk.filter(function (p) { return p.favorit; }).length : D.produk.filter(function (p) { return p.kategori === k; }).length;
      return '<button class="chip' + (k === katAktif ? ' aktif' : '') + '" data-k="' + esc(k) + '" aria-pressed="' + (k === katAktif) + '">' + esc(k) + '<span class="chip-n">' + n + '</span></button>';
    }).join('');
    var q = $('#cariProduk').value.trim().toLowerCase();
    var list = D.produk.filter(function (p) {
      var cocokKat = katAktif === 'Semua' || (katAktif === 'Favorit' ? !!p.favorit : p.kategori === katAktif);
      var cocokCari = p.nama.toLowerCase().indexOf(q) > -1 || (p.barcode && p.barcode.toLowerCase().indexOf(q) > -1);
      return cocokKat && cocokCari;
    });
    var batas = (D.aturan && D.aturan.batasStok) || 5;
    $('#gridProduk').innerHTML = list.length ? list.map(function (p, n) {
      var sisa = sisaStok(p), diKer = keranjang.filter(function (i) { return i.pid === p.id; }).length;
      var min = Math.min.apply(null, p.varian.map(function (v) { return v.harga; }));
      return '<button class="kartu-produk' + (diKer ? ' dipilih' : '') + '" data-id="' + p.id + '" style="--i:' + Math.min(n, 14) + '"' + (sisa <= 0 ? ' disabled' : '') + ' aria-label="' + esc(p.nama) + ', ' + (p.varian.length > 1 ? 'mulai ' : '') + rp(min) + (sisa <= 0 ? ', stok habis' : '') + '">' +
        '<div class="thumb" data-nada="' + nadaDari(p.kategori + p.nama) + '">' + ilustrasi(p) + (diKer ? '<span class="di-ker">' + diKer + '</span>' : '') + (sisa <= 0 ? '<span class="habis">Habis</span>' : '') + '</div>' +
        '<span class="kp-teks"><b>' + esc(p.nama) + '</b><span class="stok' + (sisa <= batas ? ' tipis' : '') + '">' + (tanpaStok(p) ? 'Jasa' : sisa <= 0 ? 'Stok habis' : (sisa <= batas ? 'Sisa ' : 'Stok ') + sisa) + (p.varian.length > 1 ? ' · ' + p.varian.length + ' varian' : '') + '</span></span>' +
        '<span class="kp-bawah"><span class="harga">' + (p.varian.length > 1 ? '<small>mulai</small> ' : '') + rp(min) + '</span><span class="tambah" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span></span></button>';
    }).join('') : '<div class="kosong"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><b>Produk tidak ditemukan</b><span>Coba kata lain atau pilih kategori "Semua".</span></div>';
    renderKeranjang();
  }

  function terapkanGrosir(item) {
    var p = D.produk.find(function (x) { return x.id === item.pid; });
    if (!p) return;
    var base = item.hargaAsli != null ? item.hargaAsli : item.harga;
    item.hargaAsli = base;
    if (!Array.isArray(p.grosir) || !p.grosir.length) { item.harga = base; item.grosirAktif = false; return; }
    var cocok = p.grosir.filter(function (g) { return item.qty >= g.min; }).sort(function (a, b) { return b.min - a.min; })[0];
    if (cocok) { item.harga = cocok.harga; item.grosirAktif = true; }
    else { item.harga = base; item.grosirAktif = false; }
  }
  function tambahKeKeranjang(p, v) {
    if (sisaStok(p) <= 0) return toast('Stok ' + p.nama + ' habis');
    var ada = keranjang.find(function (i) { return i.pid === p.id && i.varian === v.nama; });
    if (ada) ada.qty++; else { ada = { pid: p.id, nama: p.nama, varian: v.nama, harga: v.harga, hargaAsli: v.harga, qty: 1, jenis: v.jenis || '', lembar: v.jenis ? 1 : 0 }; keranjang.push(ada); }
    terapkanGrosir(ada);
    segarkanBadgeKartu();
    var c = $('.kartu-produk[data-id="' + p.id + '"]'); if (c) { c.style.animation = 'none'; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    ['#kerJumlah', '#fabKeranjang'].forEach(function (q) { var e = $(q); if (e) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } });
  }

  function hitung() {
    var sub = keranjang.reduce(function (s, i) { return s + i.harga * i.qty; }, 0);
    var nilai = Math.max(0, parseFloat($('#inDiskon').value) || 0);
    var dis = $('#tipeDiskon').value === 'persen' ? Math.round(sub * Math.min(nilai, 100) / 100) : Math.min(nilai, sub);
    return { subtotal: sub, diskon: dis, total: sub - dis };
  }

  function hitungLembar(items) {
    var r = { bw: 0, warna: 0 };
    items.forEach(function (i) { if (i.jenis === 'bw' || i.jenis === 'warna') r[i.jenis] += i.qty * (i.lembar || 1); });
    return r;
  }
  function renderKeranjang() {
    var h = hitung(), jml = keranjang.reduce(function (s, i) { return s + i.qty; }, 0), lb = hitungLembar(keranjang);
    var rl = $('#kerLembar'); if (rl) rl.innerHTML = (lb.bw || lb.warna) ? '<span><i class="tt bw"></i>Hitam-putih <b>' + lb.bw + '</b> lbr</span><span><i class="tt warna"></i>Warna <b>' + lb.warna + '</b> lbr</span>' : '';
    $('#kerDaftar').innerHTML = keranjang.length ? keranjang.map(function (i, n) {
      var p = D.produk.find(function (x) { return x.id === i.pid; }) || { nama: i.nama, kategori: '', varian: [] };
      return '<li><span class="ker-thumb thumb" data-nada="' + nadaDari(p.kategori + p.nama) + '">' + ilustrasi(p) + '</span><span class="ker-info"><span class="nm">' + esc(i.nama) + (i.grosirAktif ? ' <span class="lencana">Grosir</span>' : '') + '</span><span class="vr">' + esc(i.varian) + ' · <button type="button" class="tautan" data-harga="' + n + '" style="padding:0 3px;min-height:20px;font-size:12px" title="Ubah harga satuan">' + rp(i.harga) + '</button></span></span><span class="jml"><b>' + rp(i.harga * i.qty) + '</b><span class="qty"><button data-n="' + n + '" data-d="-1" aria-label="Kurangi ' + esc(i.nama) + '"><svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button><button class="qty-n" data-ketik="' + n + '" aria-label="Ketik jumlah ' + esc(i.nama) + '">' + i.qty + '</button><button data-n="' + n + '" data-d="1" aria-label="Tambah ' + esc(i.nama) + '"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></button></span></span></li>';
    }).join('') : '<li class="ker-kosong"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="10" width="36" height="46" rx="6"/><path d="M22 22h20M22 30h20M22 38h12"/></svg><b>Belum ada pesanan</b><span>Ketuk menu di kiri untuk menambah.</span></li>';
    $('#kerNomor').textContent = '#' + String((D.nomor || 0) + 1).padStart(4, '0');
    $('#kerJumlah').textContent = jml + ' item';
    $('#kSubtotal').textContent = rp(h.subtotal);
    $('#kTotal').textContent = rp(h.total);
    $('#btnBayar').disabled = !keranjang.length;
    $('#fabJumlah').textContent = jml; $('#fabTotal').textContent = rp(h.total);
    var kd = $('#kDiskonBaris'); if (kd) kd.classList.toggle('ada', h.diskon > 0);
    var bt = $('#badgeTahan'), nt = (D.tahan || []).length;
    if (bt) { bt.textContent = nt; bt.hidden = !nt; }
  }

  function dialog(html, siap) {
    tutupDropdown();
    var d = $('#dlg'), f = $('#dlgIsi');
    f.innerHTML = html;
    // Bungkus otomatis ke .dlg-kepala, .dlg-badan, .dlg-aksi agar semua modal rapi & seragam
    if (!$('.dlg-kepala', f)) {
      var h3 = f.querySelector('h3');
      var aksi = f.querySelector('.dlg-aksi');
      if (aksi && aksi.parentNode !== f) aksi = null;
      var kepala = document.createElement('div'); kepala.className = 'dlg-kepala';
      var judul = h3 ? h3.textContent : 'Informasi';
      if (h3) h3.remove();
      kepala.innerHTML = '<h3>' + esc(judul) + '</h3><button type="button" class="dlg-tutup" aria-label="Tutup"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
      $('.dlg-tutup', kepala).onclick = tutupDialog;
      var badan = document.createElement('div'); badan.className = 'dlg-badan';
      while (f.firstChild) {
        if (f.firstChild === aksi) break;
        badan.appendChild(f.firstChild);
      }
      f.insertBefore(badan, aksi || null);
      f.insertBefore(kepala, badan);
    }
    if (!d.open) d.showModal();
    d._klikLuar = false;
    d.onpointerdown = function (e) { d._klikLuar = (e.target === d); };
    d.onclick = function (e) { if (e.target === d && d._klikLuar) tutupDialog(); d._klikLuar = false; };
    tingkatkanDropdown(f);
    if (siap) siap(f);
    return d;
  }
  function tutupDialog() { tutupDropdown(); var d = $('#dlg'); if (d.open) d.close(); }

  function dialogKonfirm(judul, pesan, labelOk, bahaya, cb) {
    dialog('<h3>' + esc(judul) + '</h3><div class="dlg-konfirm"><p>' + esc(pesan) + '</p></div>' +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol ' + (bahaya ? 'bahaya' : 'utama') + '" type="button" id="dlgOk">' + esc(labelOk || 'Ya, lanjutkan') + '</button></div>', function (f) {
        setTimeout(function () { $('#dlgOk', f).focus(); }, 30);
        $('#dlgOk', f).onclick = function () { tutupDialog(); cb(); };
      });
  }
  function dialogAngka(judul, label, nilai, min, cb) {
    dialog('<h3>' + esc(judul) + '</h3><div class="form"><label>' + esc(label) + '<input id="dlgAngkaIn" type="number" min="' + min + '" inputmode="numeric" value="' + nilai + '" required></label></div>' +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama" type="button" id="dlgAngkaOk">Simpan</button></div>', function (f) {
        var inp = $('#dlgAngkaIn', f);
        setTimeout(function () { inp.focus(); inp.select(); }, 30);
        $('#dlgAngkaOk', f).onclick = function () {
          var v = parseInt(inp.value, 10);
          if (isNaN(v) || v < min) return toast('Masukkan angka minimal ' + min);
          tutupDialog(); cb(v);
        };
      });
  }

  function eksporPelangganCSV() {
    var rows = [['nama', 'telp', 'instansi']].concat((D.pelanggan || []).map(function (p) { return [p.nama, p.telp || '', p.instansi || '']; }));
    unduh('pelanggan.csv', '\uFEFF' + rows.map(function (r) { return r.map(csvSel).join(','); }).join('\n'), 'text/csv');
  }
  function eksporPelangganVCF() {
    var vcf = (D.pelanggan || []).map(function (p) {
      return ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + (p.nama || ''), 'N:;' + (p.nama || '') + ';;;', p.telp ? 'TEL;TYPE=CELL:' + p.telp : '', p.instansi ? 'ORG:' + p.instansi : '', 'END:VCARD'].filter(Boolean).join('\r\n');
    }).join('\r\n');
    unduh('pelanggan.vcf', vcf, 'text/vcard');
  }
  function imporPelangganCSV(teks) {
    var s = teks.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    var n = 0;
    var byNama = {}, byTelp = {};
    D.pelanggan.forEach(function (p) {
      if (p.nama) byNama[p.nama.toLowerCase()] = p;
      if (p.telp) byTelp[p.telp] = p;
    });
    function tambah(nm, tp, ins) {
      nm = (nm || '').replace(/^(N:|FN:)/i, '').replace(/;+/g, ' ').trim();
      tp = (tp || '').split(':::')[0].trim();
      ins = (ins || '').replace(/;+/g, ' ').trim();
      if (!nm && !tp) return;
      if (!nm) nm = tp;
      var kNm = nm.toLowerCase();
      var ada = byNama[kNm] || (tp && byTelp[tp]);
      if (ada) { if (tp) { ada.telp = tp; byTelp[tp] = ada; } if (ins) ada.instansi = ins; }
      else {
        var baru = { id: uid(), nama: nm, telp: tp, instansi: ins };
        D.pelanggan.push(baru);
        byNama[kNm] = baru;
        if (tp) byTelp[tp] = baru;
      }
      n++;
    }
    if (/BEGIN:VCARD/i.test(s)) {
      s.replace(/\n[ \t]/g, '').split(/BEGIN:VCARD/i).forEach(function (card) {
        if (!/END:VCARD/i.test(card)) return;
        var fn = (card.match(/^FN[^:]*:(.*)$/im) || [])[1] || (card.match(/^N[^:]*:(.*)$/im) || [])[1] || '';
        var tel = (card.match(/^TEL[^:]*:(.*)$/im) || [])[1] || '';
        var org = (card.match(/^ORG[^:]*:(.*)$/im) || [])[1] || '';
        tambah(fn, tel, org);
      });
      simpanPelanggan(); return n;
    }
    var baris1 = s.split('\n')[0] || '';
    if (baris1.indexOf(';') > -1 && baris1.indexOf(',') < 0) s = s.replace(/;/g, ',');
    var rows = parseCSV(s);
    if (!rows.length) return 0;
    var hdr = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var idxNama = hdr.findIndex(function (h) { return /^(nama|name|full name|given name|first name|display name)$/.test(h); });
    var idxTelp = hdr.findIndex(function (h) { return /(telp|phone|hp|wa|whatsapp|mobile)/.test(h); });
    var idxInst = hdr.findIndex(function (h) { return /(instansi|company|organization|kampus|kantor)/.test(h); });
    var adaHeader = idxNama >= 0 || idxTelp >= 0 || idxInst >= 0 || /nama|name/.test(hdr[0] || '');
    if (adaHeader) rows.shift();
    if (idxNama < 0) idxNama = 0;
    if (idxTelp < 0) idxTelp = 1;
    if (idxInst < 0) idxInst = 2;
    rows.forEach(function (r) { tambah(r[idxNama], r[idxTelp], r[idxInst]); });
    simpanPelanggan(); return n;
  }

  function dialogPelanggan(tabAwal) {
    var list = D.pelanggan || [];
    var tab = (tabAwal === 'daftar' || tabAwal === 'tambah') ? tabAwal : (list.length ? 'daftar' : 'tambah');
    var terpilihPl = {}, editPlId = null, filSaatIni = [];
    function perbaruiBarPl(f) {
      var ids = Object.keys(terpilihPl).filter(function (id) { return terpilihPl[id]; });
      var n = ids.length;
      if ($('#plAksiBanyak', f)) $('#plAksiBanyak', f).hidden = !n;
      if ($('#plHapusTerpilih', f)) $('#plHapusTerpilih', f).textContent = 'Hapus (' + n + ')';
      if ($('#cekSemuaPl', f)) {
        $('#cekSemuaPl', f).disabled = !filSaatIni.length;
        $('#cekSemuaPl', f).checked = filSaatIni.length > 0 && filSaatIni.every(function (pl) { return !!terpilihPl[pl.id]; });
      }
      var td = $('[data-plt="daftar"]', f);
      if (td) td.textContent = 'Daftar (' + D.pelanggan.length + ')';
    }
    function renderList(f, q) {
      var k = (q || '').trim().toLowerCase();
      list = D.pelanggan || [];
      filSaatIni = [];
      for (var i = 0; i < list.length && filSaatIni.length < 60; i++) {
        var pl = list[i];
        if (!k || (pl.nama + ' ' + (pl.telp || '') + ' ' + (pl.instansi || '')).toLowerCase().indexOf(k) > -1) filSaatIni.push(pl);
      }
      perbaruiBarPl(f);
      $('#plList', f).innerHTML = filSaatIni.length ? '<ul class="trx-detail-list">' + filSaatIni.map(function (pl) {
        var cek = !!terpilihPl[pl.id];
        return '<li><div class="trx-cek-wrap" style="align-items:center"><input type="checkbox" class="trx-cek" data-plcek="' + pl.id + '"' + (cek ? ' checked' : '') + ' aria-label="Pilih ' + esc(pl.nama) + '"><div><b>' + esc(pl.nama) + '</b><div class="redup kecil">' + esc(pl.telp || '-') + (pl.instansi ? ' · ' + esc(pl.instansi) : '') + '</div></div></div>' +
          '<div class="aksi"><button type="button" class="tombol" data-pl="' + pl.id + '">Pilih</button><button type="button" class="tautan" data-pledit="' + pl.id + '">Ubah</button><button type="button" class="tautan" data-hpl="' + pl.id + '">Hapus</button></div></li>';
      }).join('') + '</ul>' : '<p class="redup">Belum ada pelanggan' + (k ? ' yang cocok.' : ' tersimpan.') + '</p>';
    }
    function pindahTab(f, k) {
      $$('[data-plt]', f).forEach(function (x) { x.classList.toggle('aktif', x.dataset.plt === k); });
      $('#plTabDaftar', f).hidden = k !== 'daftar';
      $('#plTabTambah', f).hidden = k !== 'tambah';
    }
    dialog('<h3>Pelanggan / Member</h3>' +
      '<div class="hc-tabs" role="tablist"><button type="button" class="' + (tab === 'daftar' ? 'aktif' : '') + '" data-plt="daftar">Daftar (' + list.length + ')</button><button type="button" class="' + (tab === 'tambah' ? 'aktif' : '') + '" data-plt="tambah">+ Tambah / Impor</button></div>' +
      '<div id="plTabDaftar" class="form"' + (tab === 'daftar' ? '' : ' hidden') + '>' +
      '<input id="plCari" type="search" placeholder="Cari nama, no. WA, atau instansi…">' +
      (list.length ? '<div class="riwayat-bar" style="margin-bottom:0;padding:6px 10px"><label class="cek-semua"><input type="checkbox" id="cekSemuaPl"><span>Pilih semua</span></label><div class="aksi" id="plAksiBanyak" hidden><button type="button" class="tombol" id="plEksporTerpilih">Ekspor</button><button type="button" class="tombol bahaya" id="plHapusTerpilih">Hapus (0)</button></div></div>' : '') +
      '<div id="plList" style="max-height:260px;overflow-y:auto"></div>' +
      '</div>' +
      '<div id="plTabTambah" class="form"' + (tab === 'tambah' ? '' : ' hidden') + '>' +
      '<input id="plNama" placeholder="Nama pelanggan / instansi">' +
      '<input id="plTelp" placeholder="No. WhatsApp (mis. 0812...)" inputmode="tel">' +
      '<input id="plInstansi" placeholder="Instansi / kampus (opsional)">' +
      '<div class="aksi"><button type="button" class="tombol utama" id="plTambah" style="flex:1">+ Simpan &amp; pilih</button><button type="button" class="tombol" id="plBatalEdit" hidden>Batal</button></div>' +
      '<div class="aksi wrap" style="border-top:1px solid var(--garis);padding-top:12px">' +
      '<label class="tombol" style="color:var(--teks)">Impor CSV / VCF<input type="file" id="plImpor" accept=".csv,.vcf,text/csv,text/vcard" hidden></label>' +
      '<button type="button" class="tombol" id="plEkspor">Ekspor CSV</button>' +
      '<button type="button" class="tombol" id="plEksporVCF">Ekspor VCF</button></div>' +
      '<p class="redup kecil" style="margin:0">Mendukung CSV Excel/Google Contacts maupun file kontak <code>.vcf</code> HP.</p></div>' +
      '<div class="dlg-aksi">' + (list.length ? '<button type="button" class="tombol bahaya" id="plHapusSemua" style="margin-right:auto">Reset member</button>' : '') + '<button class="tombol" value="batal">Tutup</button></div>', function (f) {
        renderList(f, '');
        $$('[data-plt]', f).forEach(function (tb) { tb.onclick = function () { pindahTab(f, tb.dataset.plt); }; });
        $('#plList', f).onclick = function (e) {
          var ck = e.target.closest('[data-plcek]');
          if (ck) {
            if (ck.checked) terpilihPl[ck.dataset.plcek] = true; else delete terpilihPl[ck.dataset.plcek];
            perbaruiBarPl(f); return;
          }
          var bPl = e.target.closest('[data-pl]'), bEd = e.target.closest('[data-pledit]'), bHp = e.target.closest('[data-hpl]');
          if (bPl) {
            var pl = D.pelanggan.find(function (x) { return x.id === bPl.dataset.pl; });
            if (!pl) return;
            if ($('#inPelanggan')) $('#inPelanggan').value = pl.nama + (pl.instansi ? ' (' + pl.instansi + ')' : '');
            telpAktif = pl.telp || ''; tutupDialog(); toast('Pelanggan dipilih: ' + pl.nama);
          } else if (bEd) {
            var pe = D.pelanggan.find(function (x) { return x.id === bEd.dataset.pledit; });
            if (!pe) return;
            editPlId = pe.id;
            $('#plNama', f).value = pe.nama || ''; $('#plTelp', f).value = pe.telp || ''; $('#plInstansi', f).value = pe.instansi || '';
            $('#plTambah', f).textContent = 'Simpan perubahan'; $('#plBatalEdit', f).hidden = false;
            pindahTab(f, 'tambah'); $('#plNama', f).focus();
          } else if (bHp) {
            delete terpilihPl[bHp.dataset.hpl];
            D.pelanggan = D.pelanggan.filter(function (x) { return x.id !== bHp.dataset.hpl; });
            simpanPelanggan(); renderList(f, $('#plCari', f).value);
          }
        };
        if ($('#cekSemuaPl', f)) $('#cekSemuaPl', f).onchange = function () {
          var on = this.checked;
          filSaatIni.forEach(function (pl) { if (on) terpilihPl[pl.id] = true; else delete terpilihPl[pl.id]; });
          renderList(f, $('#plCari', f).value);
        };
        if ($('#plEksporTerpilih', f)) $('#plEksporTerpilih', f).onclick = function () {
          var sel = D.pelanggan.filter(function (p) { return terpilihPl[p.id]; });
          if (!sel.length) return;
          var rows = [['nama', 'telp', 'instansi']].concat(sel.map(function (p) { return [p.nama, p.telp || '', p.instansi || '']; }));
          unduh('pelanggan-terpilih.csv', '\uFEFF' + rows.map(function (r) { return r.map(csvSel).join(','); }).join('\n'), 'text/csv');
          toast(sel.length + ' pelanggan diekspor');
        };
        if ($('#plHapusTerpilih', f)) $('#plHapusTerpilih', f).onclick = function () {
          var n = Object.keys(terpilihPl).filter(function (id) { return terpilihPl[id]; }).length;
          if (!n) return;
          D.pelanggan = D.pelanggan.filter(function (p) { return !terpilihPl[p.id]; });
          terpilihPl = {}; simpanPelanggan(); renderList(f, $('#plCari', f).value); toast(n + ' pelanggan dihapus');
        };
        $('#plCari', f).oninput = debounce(function () { renderList(f, this.value); }, 120);
        if ($('#plHapusSemua', f)) $('#plHapusSemua', f).onclick = function () {
          dialogKonfirm('Hapus semua pelanggan', 'Hapus seluruh ' + D.pelanggan.length + ' data pelanggan/member?', 'Hapus semua', true, function () {
            D.pelanggan = []; simpanPelanggan(); dialogPelanggan('daftar'); toast('Daftar pelanggan dikosongkan');
          });
        };
        $('#plEkspor', f).onclick = function () { eksporPelangganCSV(); toast('CSV pelanggan diunduh'); };
        $('#plEksporVCF', f).onclick = function () { eksporPelangganVCF(); toast('VCF kontak diunduh'); };
        $('#plImpor', f).onchange = function () {
          bacaFile(this, function (t) {
            var n = imporPelangganCSV(t);
            toast(n + ' kontak/pelanggan diimpor');
            dialogPelanggan('daftar');
          });
        };
        $('#plBatalEdit', f).onclick = function () {
          editPlId = null; $('#plNama', f).value = ''; $('#plTelp', f).value = ''; $('#plInstansi', f).value = '';
          $('#plTambah', f).textContent = '+ Simpan & pilih'; this.hidden = true;
          pindahTab(f, 'daftar');
        };
        $('#plTambah', f).onclick = function () {
          var nm = $('#plNama', f).value.trim(); if (!nm) return toast('Nama pelanggan wajib diisi');
          var tp = $('#plTelp', f).value.trim(), ins = $('#plInstansi', f).value.trim();
          if (editPlId) {
            var target = D.pelanggan.find(function (x) { return x.id === editPlId; });
            if (target) { target.nama = nm; target.telp = tp; target.instansi = ins; }
            editPlId = null; simpanPelanggan();
            $('#plNama', f).value = ''; $('#plTelp', f).value = ''; $('#plInstansi', f).value = '';
            $('#plTambah', f).textContent = '+ Simpan & pilih'; $('#plBatalEdit', f).hidden = true;
            renderList(f, $('#plCari', f).value); pindahTab(f, 'daftar'); toast('Pelanggan diperbarui');
            return;
          }
          var pl = { id: uid(), nama: nm, telp: tp, instansi: ins };
          D.pelanggan.unshift(pl); simpanPelanggan();
          if ($('#inPelanggan')) $('#inPelanggan').value = pl.nama + (pl.instansi ? ' (' + pl.instansi + ')' : '');
          telpAktif = pl.telp; tutupDialog(); toast('Pelanggan disimpan');
        };
      });
  }

  function dialogBiaya() {
    dialog('<h3>Tambah biaya / jasa khusus</h3><div class="form">' +
      '<label>Nama biaya<input id="byNama" placeholder="Mis. Jasa desain, edit file, ongkir" value="Jasa desain / edit"></label>' +
      '<label>Nominal (Rp)<input id="byHarga" type="number" min="0" inputmode="numeric" value="5000"></label>' +
      '</div><div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama" type="button" id="byOk">Masukkan</button></div>', function (f) {
        $('#byOk', f).onclick = function () {
          var nm = $('#byNama', f).value.trim() || 'Biaya tambahan';
          var hg = Math.max(0, parseInt($('#byHarga', f).value, 10) || 0);
          if (!hg) return toast('Masukkan nominal biaya');
          keranjang.push({ pid: 'biaya', nama: nm, varian: 'Tambahan', harga: hg, qty: 1, jenis: '', lembar: 0 });
          tutupDialog(); renderPOS(); toast('Biaya ditambahkan');
        };
      });
  }

  function dialogTahan() {
    var adaIsi = keranjang.length > 0;
    var list = D.tahan || [];
    function simpanTahan() {
      var pel = ($('#inPelanggan') && $('#inPelanggan').value.trim()) || 'Tanpa nama';
      D.tahan.unshift({
        id: uid(), waktu: new Date().toISOString(), pelanggan: pel,
        items: keranjang.map(function (i) { return Object.assign({}, i); }),
        diskon: $('#inDiskon').value || 0, tipeDiskon: $('#tipeDiskon').value
      });
      keranjang = []; $('#inDiskon').value = 0;
      if ($('#inPelanggan')) $('#inPelanggan').value = '';
      simpan(); tutupDialog(); renderPOS(); toast('Pesanan "' + pel + '" ditahan');
    }
    if (adaIsi && !list.length) return simpanTahan();
    dialog('<h3>Pesanan ditahan</h3>' +
      (adaIsi ? '<button type="button" class="tombol utama" id="tahanSekarang" style="width:100%">+ Tahan pesanan saat ini</button>' : '') +
      (list.length ? '<ul class="trx-detail-list">' + list.map(function (t, idx) {
        var tot = t.items.reduce(function (s, i) { return s + i.harga * i.qty; }, 0);
        return '<li><div><b>' + esc(t.pelanggan) + '</b><div class="redup kecil">' + fmtWaktu(t.waktu) + ' · ' + t.items.length + ' item · ' + rp(tot) + '</div></div>' +
          '<div class="aksi"><button type="button" class="tombol" data-panggil="' + idx + '">Panggil</button><button type="button" class="tautan" data-ht="' + idx + '" aria-label="Hapus">Hapus</button></div></li>';
      }).join('') + '</ul>' : '<p class="redup">Belum ada pesanan yang ditahan.</p>') +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Tutup</button></div>', function (f) {
        var ts = $('#tahanSekarang', f); if (ts) ts.onclick = simpanTahan;
        $$('[data-panggil]', f).forEach(function (b) {
          b.onclick = function () {
            var idx = +b.dataset.panggil, t = D.tahan.splice(idx, 1)[0];
            keranjang = t.items; $('#inDiskon').value = t.diskon || 0;
            $('#tipeDiskon').value = t.tipeDiskon || 'rp'; sinkronDropdown($('#tipeDiskon'));
            if ($('#inPelanggan')) $('#inPelanggan').value = t.pelanggan === 'Tanpa nama' ? '' : t.pelanggan;
            simpan(); tutupDialog(); renderPOS(); toast('Pesanan dipanggil');
          };
        });
        $$('[data-ht]', f).forEach(function (b) {
          b.onclick = function () { D.tahan.splice(+b.dataset.ht, 1); simpan(); dialogTahan(); };
        });
      });
  }

  function pilihVarian(p) {
    if (p.varian.length === 1) return tambahKeKeranjang(p, p.varian[0]);
    dialog('<h3>' + esc(p.nama) + '</h3><div class="pilih-varian">' + p.varian.map(function (v, i) {
      return '<button type="button" data-i="' + i + '"><span>' + esc(v.nama) + '</span><span>' + rp(v.harga) + '</span></button>';
    }).join('') + '</div><div class="dlg-aksi"><button class="tombol" value="batal">Batal</button></div>', function (f) {
      $$('[data-i]', f).forEach(function (b) { b.onclick = function () { tambahKeKeranjang(p, p.varian[+b.dataset.i]); tutupDialog(); }; });
    });
  }

  function dialogBayar() {
    var h = hitung();
    var pbl = (D.aturan && D.aturan.pembulatan) || 0;
    var tagihTunai = pbl > 0 ? Math.round(h.total / pbl) * pbl : h.total;
    var cepat = [tagihTunai, Math.ceil(tagihTunai / 5000) * 5000, Math.ceil(tagihTunai / 10000) * 10000, Math.ceil(tagihTunai / 50000) * 50000, 100000]
      .filter(function (v, i, a) { return v >= tagihTunai && a.indexOf(v) === i; }).slice(0, 4);
    var IK = {
      tunai: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></svg>',
      qris: '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg>',
      transfer: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></svg>',
      campuran: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>'
    };
    var qrisDyn = (D.aturan && D.aturan.qrisStatis) ? qrisDinamis(D.aturan.qrisStatis, h.total) : '';
    var pad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'hapus'];
    dialog('<h3>Pembayaran</h3><div class="bayar"><div class="bayar-kiri"><div class="bayar-kepala"><span class="redup kecil">' + keranjang.reduce(function (s, i) { return s + i.qty; }, 0) + ' item' + (h.diskon ? ' · diskon ' + rp(h.diskon) : '') + '</span></div>' +
      '<div class="total-besar"><small>Total tagihan' + (tagihTunai !== h.total ? ' (Tunai dibulatkan ' + rp(tagihTunai) + ')' : '') + '</small>' + rp(h.total) + '</div>' +
      '<div class="metode" role="radiogroup" aria-label="Metode bayar">' + ['tunai', 'qris', 'transfer', 'campuran'].map(function (m, i) { return '<label><input type="radio" name="metode" value="' + m + '"' + (i ? '' : ' checked') + '>' + IK[m] + '<span>' + { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer', campuran: 'Campuran' }[m] + '</span></label>'; }).join('') + '</div>' +
      '<div id="areaQris" class="qris" hidden>' + (qrisDyn ? qrSvg(qrisDyn) : '<img src="qris.svg" alt="QRIS toko">') + '<p class="redup kecil">' + (qrisDyn ? 'QRIS Dinamis · Nominal ' + rp(h.total) + ' otomatis terisi.' : 'Minta pelanggan memindai, cek notifikasi masuk, lalu selesaikan.') + '</p></div>' +
      '<div id="areaTransfer" hidden class="rek"><small class="redup">Rekening tujuan</small><b>' + esc(D.toko.rekening || 'Atur nomor rekening di Pengaturan') + '</b><p class="redup kecil">Cek mutasi sebelum menyelesaikan.</p></div>' +
      '<div id="areaCampuran" hidden class="rek form"><label>Tunai (Rp)<input id="inCampurTunai" type="number" min="0" inputmode="numeric" value="' + Math.floor(h.total / 2) + '"></label><div class="baris"><span>Sisa non-tunai (QRIS/TF)</span><b id="campurSisa">' + rp(h.total - Math.floor(h.total / 2)) + '</b></div></div>' +
      '<div class="dp-box"><label><input type="checkbox" id="cbDP"><span>Bayar sebagian (DP / antre)</span></label><span class="redup kecil" id="dpInfo"></span></div>' +
      '<div class="kembali" id="kembali"><span>Kembalian</span><span>Rp0</span></div></div>' +
      '<div class="bayar-kanan" id="areaTunai"><label class="layar-uang"><small id="lblUang">Uang diterima</small><span class="rp">Rp</span><input id="inBayar" type="number" inputmode="numeric" min="0" value="' + tagihTunai + '"></label>' +
      '<div class="uang-cepat">' + cepat.map(function (v) { return '<button type="button" data-v="' + v + '">' + (v === tagihTunai ? 'Uang pas' : rp(v)) + '</button>'; }).join('') + '</div>' +
      '<div class="numpad">' + pad.map(function (k) { return '<button type="button" data-np="' + k + '" aria-label="' + (k === 'hapus' ? 'Hapus angka' : k) + '">' + (k === 'hapus' ? '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z"/><path d="M13 9l5 6M18 9l-5 6"/></svg>' : k) + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="dlg-aksi bayar-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama besar" type="button" id="btnSelesai">Selesaikan pembayaran</button></div>', function (f) {
        var inB = $('#inBayar', f), inCT = $('#inCampurTunai', f), cbDP = $('#cbDP', f), baru = true;
        function upd() {
          var m = $('input[name=metode]:checked', f).value;
          var isDP = cbDP.checked;
          $('#areaTunai', f).hidden = (m !== 'tunai' && !isDP);
          $('#areaQris', f).hidden = m !== 'qris';
          $('#areaTransfer', f).hidden = m !== 'transfer';
          $('#areaCampuran', f).hidden = m !== 'campuran';
          $('.bayar', f).classList.toggle('non-tunai', m !== 'tunai' && !isDP);
          $('#lblUang', f).textContent = isDP ? 'Nominal DP diterima' : 'Uang diterima';
          if (m === 'campuran') {
            var ct = Math.min(h.total, Math.max(0, parseFloat(inCT.value) || 0));
            $('#campurSisa', f).textContent = rp(h.total - ct);
          }
          var vIn = parseFloat(inB.value) || 0;
          var target = m === 'tunai' ? tagihTunai : h.total;
          var el = $('#kembali', f);
          el.hidden = (m !== 'tunai' && !isDP);
          if (isDP) {
            var sisaDP = Math.max(0, h.total - vIn);
            el.classList.toggle('kurang', sisaDP > 0);
            el.innerHTML = '<span>Sisa tagihan (DP)</span><b>' + rp(sisaDP) + '</b>';
            $('#dpInfo', f).textContent = 'Status: Antre';
          } else {
            var k = vIn - target;
            el.classList.toggle('kurang', k < 0);
            el.innerHTML = '<span>' + (k < 0 ? 'Kurang' : 'Kembalian') + '</span><b>' + rp(Math.abs(k)) + '</b>';
            $('#dpInfo', f).textContent = '';
          }
        }
        $$('input[name=metode]', f).forEach(function (r) { r.onchange = upd; });
        cbDP.onchange = upd;
        inB.oninput = function () { baru = false; upd(); };
        if (inCT) inCT.oninput = upd;
        $$('[data-v]', f).forEach(function (b) { b.onclick = function () { inB.value = b.dataset.v; baru = true; upd(); }; });
        $('.numpad', f).onclick = function (e) {
          var b = e.target.closest('[data-np]'); if (!b) return;
          var v = baru ? '' : String(inB.value || ''); baru = false;
          if (b.dataset.np === 'hapus') v = v.slice(0, -1); else if (v.length < 10) v = (v + b.dataset.np).replace(/^0+(?=\d)/, '');
          inB.value = v || 0; upd();
        };
        $('#btnSelesai', f).onclick = function () {
          var m = $('input[name=metode]:checked', f).value;
          var isDP = cbDP.checked;
          if (isDP) {
            var dpVal = Math.min(h.total, Math.max(0, parseFloat(inB.value) || 0));
            if (dpVal <= 0) return toast('Masukkan nominal DP lebih dari Rp0');
            selesaikan(m, dpVal, { dp: dpVal, sisa: h.total - dpVal, status: 'antre' });
            return;
          }
          if (m === 'campuran') {
            var ct = Math.min(h.total, Math.max(0, parseFloat(inCT.value) || 0));
            selesaikan('campuran', h.total, { bayarCampuran: { tunai: ct, nonTunai: h.total - ct } });
            return;
          }
          var target = m === 'tunai' ? tagihTunai : h.total;
          var bayar = m === 'tunai' ? (parseFloat(inB.value) || 0) : h.total;
          if (bayar < target) { var k = $('#kembali', f); k.classList.remove('goyang'); void k.offsetWidth; k.classList.add('goyang'); return toast('Uang diterima masih kurang'); }
          selesaikan(m, bayar);
        };
        upd();
      });
  }

  function selesaikan(metode, bayar, ekstra) {
    ekstra = ekstra || {};
    var h = hitung(), w = new Date();
    var pel = ($('#inPelanggan') && $('#inPelanggan').value.trim()) || '';
    D.nomor = (D.nomor || 0) + 1;
    var sisa = ekstra.sisa || 0;
    var trx = {
      id: noTrx(w, D.nomor), waktu: w.toISOString(), kasir: pengguna.nama, pelanggan: pel, telp: telpAktif || '',
      items: keranjang.map(function (i) { return Object.assign({}, i); }),
      subtotal: h.subtotal, diskon: h.diskon, total: h.total, metode: metode, bayar: bayar,
      kembali: sisa > 0 ? 0 : Math.max(0, bayar - h.total),
      status: ekstra.status || 'selesai', dp: ekstra.dp || 0, sisa: sisa,
      bayarCampuran: ekstra.bayarCampuran || null
    };
    trx.items.forEach(function (i) {
      var p = D.produk.find(function (x) { return x.id === i.pid; });
      if (p) { i.modal = p.modal || 0; if (!tanpaStok(p)) p.stok = Math.max(0, p.stok - i.qty); }
      if (i.jenis && D.aturan) {
        var lbr = i.qty * (i.lembar || 1);
        if (/f4|folio/i.test(i.nama + ' ' + i.varian)) D.aturan.kertasF4 = Math.max(0, (D.aturan.kertasF4 || 0) - lbr);
        else D.aturan.kertasA4 = Math.max(0, (D.aturan.kertasA4 || 0) - lbr);
      }
    });
    D.transaksi.push(trx); simpan();
    if (D.aturan && D.aturan.gasUrl && D.aturan.gasAuto) {
      gasKirim({ action: 'add_trx', trx: trx }, function (ok) {
        if (ok) { D.aturan.gasLastSync = Date.now(); simpan(); }
      });
    }
    keranjang = []; telpAktif = ''; $('#inDiskon').value = 0; if ($('#inPelanggan')) $('#inPelanggan').value = '';
    $('#panelKeranjang').classList.remove('buka');
    var lblM = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer', campuran: 'Campuran' }[metode] || metode;
    dialog('<div class="sukses"><svg class="centang" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg><h3>' + (sisa > 0 ? 'DP / Order dicatat' : 'Transaksi berhasil') + '</h3><div class="total-besar"><small>' + lblM + (sisa > 0 ? ' · DP ' + rp(trx.dp) : '') + '</small>' + rp(trx.total) + '</div></div>' +
      (sisa > 0 ? '<div class="kembali kurang"><span>Sisa tagihan</span><b>' + rp(sisa) + '</b></div>' : (metode === 'tunai' ? '<div class="kembali"><span>Kembalian</span><span>' + rp(trx.kembali) + '</span></div>' : '')) +
      '<p class="redup kecil" style="text-align:center;margin:0">' + trx.id + (trx.pelanggan ? ' · ' + esc(trx.pelanggan) : '') + '</p>' +
      '<div class="dlg-aksi" style="flex-wrap:wrap"><button class="tombol" type="button" id="btnWA">Kirim WA</button><button class="tombol" type="button" id="btnCetakBT">Bluetooth</button><button class="tombol" type="button" id="btnCetakA5">Nota A5</button><button class="tombol" type="button" id="btnCetak">Cetak struk</button><button class="tombol utama" value="ok">Transaksi baru</button></div>', function (f) {
        $('#btnWA', f).onclick = function () { kirimWA(trx); };
        $('#btnCetakBT', f).onclick = function () { cetakBluetooth(trx); };
        $('#btnCetakA5', f).onclick = function () { cetak(trx, 'a5'); };
        $('#btnCetak', f).onclick = function () { cetak(trx); };
      });
    renderPOS();
  }

  // ---------- Struk 58mm / 80mm / Nota A5 ----------
  function cetak(trx, mode) {
    var t = D.toko;
    var uk = mode || (D.aturan && D.aturan.ukuranStruk) || '58mm';
    var st = $('#struk');
    st.className = 'struk' + (uk === '80mm' ? ' s80' : uk === 'a5' ? ' a5' : '');
    var logo = t.logo || KONFIG.logo;
    st.innerHTML = '<div class="tengah">' + (logo ? '<img class="struk-logo" src="' + esc(logo) + '" alt="" onerror="this.style.display=\'none\'">' : '') + '<h4>' + esc(t.nama) + '</h4>' + (t.alamat ? '<div>' + esc(t.alamat) + '</div>' : '') + (t.telp ? '<div>' + esc(t.telp) + '</div>' : '') + '</div>' +
      '<div class="gr"></div><div>' + trx.id + (uk === 'a5' ? ' (NOTA PESANAN)' : '') + '</div><div>' + fmtWaktu(trx.waktu) + '</div><div>Kasir: ' + esc(trx.kasir) + '</div>' + (trx.pelanggan ? '<div>Pelanggan: ' + esc(trx.pelanggan) + '</div>' : '') + '<div class="gr"></div>' +
      trx.items.map(function (i) { return '<div>' + esc(i.nama) + (i.varian ? ' (' + esc(i.varian) + ')' : '') + '</div><div class="br"><span>' + i.qty + ' x ' + rp(i.harga) + '</span><span>' + rp(i.qty * i.harga) + '</span></div>'; }).join('') +
      (function () { var l = hitungLembar(trx.items); return (l.bw || l.warna) ? '<div class="gr"></div><div class="br"><span>Lembar hitam-putih</span><span>' + l.bw + '</span></div><div class="br"><span>Lembar warna</span><span>' + l.warna + '</span></div>' : ''; })() +
      '<div class="gr"></div><div class="br"><span>Subtotal</span><span>' + rp(trx.subtotal) + '</span></div>' +
      (trx.diskon ? '<div class="br"><span>Diskon</span><span>-' + rp(trx.diskon) + '</span></div>' : '') +
      '<div class="br"><b>TOTAL</b><b>' + rp(trx.total) + '</b></div>' +
      '<div class="br"><span>' + (trx.sisa > 0 ? 'DP (' + trx.metode.toUpperCase() + ')' : trx.metode.toUpperCase()) + '</span><span>' + rp(trx.bayar) + '</span></div>' +
      (trx.bayarCampuran ? '<div class="br"><span>• Tunai / Non-tunai</span><span>' + rp(trx.bayarCampuran.tunai) + ' / ' + rp(trx.bayarCampuran.nonTunai) + '</span></div>' : '') +
      (trx.sisa > 0 ? '<div class="br"><b>SISA TAGIHAN</b><b>' + rp(trx.sisa) + '</b></div>' : (trx.metode === 'tunai' ? '<div class="br"><span>Kembali</span><span>' + rp(trx.kembali) + '</span></div>' : '')) +
      '<div class="gr"></div><div class="tengah">' + esc(t.footer) + '</div>' +
      (uk === 'a5' ? '<div class="a5-ttd"><div>Penerima,<br><br><br>(______________)</div><div>Hormat kami,<br><br><br>(' + esc(trx.kasir) + ')</div></div>' : '');
    window.print();
  }

  // ---------- Kelola produk ----------
  var sortKol = '', sortArah = 1;
  function renderKelola() {
    var fk = $('#filterKatProduk');
    if (fk) {
      var val = fk.value;
      fk.innerHTML = '<option value="">Semua kategori</option>' + D.kategori.map(function (k) { return '<option value="' + esc(k) + '"' + (k === val ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
      sinkronDropdown(fk);
    }
    var batas = (D.aturan && D.aturan.batasStok) || 5;
    var tipis = D.produk.filter(function (p) { return !tanpaStok(p) && p.stok <= batas; });
    var sb = $('#stokInfoBar');
    if (sb && D.aturan) {
      var a4 = D.aturan.kertasA4 || 0, f4 = D.aturan.kertasF4 || 0;
      sb.innerHTML = '<span class="stok-pill">Kertas A4: <b>' + a4.toLocaleString('id-ID') + ' lbr</b> (' + (a4 / 500).toFixed(1) + ' rim)</span>' +
        '<span class="stok-pill">Kertas F4: <b>' + f4.toLocaleString('id-ID') + ' lbr</b> (' + (f4 / 500).toFixed(1) + ' rim)</span>' +
        (tipis.length ? '<span class="stok-pill peringatan">Stok menipis: <b>' + tipis.length + ' produk</b> (' + tipis.slice(0, 3).map(function (p) { return esc(p.nama); }).join(', ') + (tipis.length > 3 ? '…' : '') + ')</span>' : '');
    }
    var q = $('#cariKelola').value.trim().toLowerCase();
    var kf = fk ? fk.value : '';
    var list = D.produk.filter(function (p) { return (!kf || p.kategori === kf) && (p.nama.toLowerCase().indexOf(q) > -1 || (p.barcode && p.barcode.toLowerCase().indexOf(q) > -1)); });
    if (sortKol) {
      var minH = function (p) { return Math.min.apply(null, p.varian.map(function (v) { return v.harga; })); };
      list.sort(function (a, b) {
        if (sortKol === 'nama') return a.nama.localeCompare(b.nama, 'id') * sortArah;
        if (sortKol === 'kategori') return a.kategori.localeCompare(b.kategori, 'id') * sortArah;
        if (sortKol === 'harga') return (minH(a) - minH(b)) * sortArah;
        if (sortKol === 'stok') return ((a.stok < 0 ? 999999 : a.stok) - (b.stok < 0 ? 999999 : b.stok)) * sortArah;
        return 0;
      });
    }
    var th = function (k, lbl) {
      var akt = sortKol === k;
      return '<th><button type="button" class="th-sort' + (akt ? ' aktif' : '') + '" data-sort="' + k + '">' + lbl + (akt ? (sortArah > 0 ? ' ▲' : ' ▼') : '') + '</button></th>';
    };
    $('#tabelProduk').innerHTML = '<thead><tr>' + th('nama', 'Produk') + th('kategori', 'Kategori') + th('harga', 'Varian &amp; harga') + th('stok', 'Stok') + '<th></th></tr></thead><tbody>' +
      (list.map(function (p) {
        return '<tr><td><div class="tabel-produk-sel"><span class="thumb tabel-thumb" data-nada="' + nadaDari(p.kategori + p.nama) + '">' + ilustrasi(p) + '</span><div><b>' + (p.favorit ? '★ ' : '') + esc(p.nama) + '</b>' + (p.barcode ? '<div class="redup kecil">#' + esc(p.barcode) + '</div>' : '') + '</div></div></td><td>' + esc(p.kategori) + '</td><td>' + p.varian.map(function (v) { return esc(v.nama) + ' ' + rp(v.harga); }).join('<br>') + '</td>' +
          '<td><span class="lencana' + (!tanpaStok(p) && p.stok <= batas ? ' merah' : '') + '"' + (tanpaStok(p) ? ' title="Layanan jasa tanpa batas stok (stok = -1)"' : '') + '>' + (tanpaStok(p) ? 'Jasa' : p.stok) + '</span></td>' +
          '<td style="text-align:right;white-space:nowrap">' + (p.barcode ? '<button class="tautan" data-barcode="' + p.id + '">Label</button> ' : '') + (tanpaStok(p) ? '' : '<button class="tautan" data-stok="' + p.id + '">+Stok</button> ') + '<button class="tautan" data-edit="' + p.id + '">Ubah</button></td></tr>';
      }).join('') || '<tr><td colspan="5" class="kosong">Belum ada produk.</td></tr>') + '</tbody>';
  }
  function barcodeSvg(kode) {
    var C39 = { '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn','A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn','K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn','U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','*':'nwnnwnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn' };
    var str = '*' + String(kode || '').toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '') + '*';
    var x = 4, rects = '';
    for (var i = 0; i < str.length; i++) {
      var pat = C39[str[i]] || C39[' '];
      for (var j = 0; j < 9; j++) {
        var w = pat[j] === 'w' ? 3 : 1;
        if (j % 2 === 0) rects += '<rect x="' + x + '" y="4" width="' + w + '" height="44"/>';
        x += w;
      }
      x += 1;
    }
    return '<svg viewBox="0 0 ' + (x + 3) + ' 52" style="width:100%;max-width:260px;height:68px;background:#fff;padding:4px;border-radius:6px" shape-rendering="crispEdges"><g fill="#111">' + rects + '</g></svg>';
  }
  function dialogBarcode(p) {
    if (!p || !p.barcode) return;
    var min = Math.min.apply(null, p.varian.map(function (v) { return v.harga; }));
    dialog('<h3>Label Barcode</h3><div style="text-align:center;display:grid;gap:8px;justify-items:center">' +
      '<b>' + esc(p.nama) + ' · ' + rp(min) + '</b>' + barcodeSvg(p.barcode) + '<code>' + esc(p.barcode) + '</code></div>' +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Tutup</button><button class="tombol utama" type="button" id="bcCetak">Cetak label</button></div>', function (f) {
        $('#bcCetak', f).onclick = function () {
          var st = $('#struk'); st.className = 'struk';
          st.innerHTML = '<div class="tengah"><b>' + esc(p.nama) + '</b><div>' + rp(min) + '</div>' + barcodeSvg(p.barcode) + '<div>' + esc(p.barcode) + '</div></div>';
          window.print();
        };
      });
  }

  function dialogStokKertas() {
    dialog('<h3>Stok bahan kertas</h3><p class="redup kecil">Otomatis berkurang saat transaksi fotocopy/print diselesaikan. 1 rim = 500 lembar.</p><div class="form">' +
      '<label>Stok Kertas A4 (lembar)<input id="skA4" type="number" min="0" value="' + (D.aturan.kertasA4 || 0) + '"></label>' +
      '<label>Stok Kertas F4 / Folio (lembar)<input id="skF4" type="number" min="0" value="' + (D.aturan.kertasF4 || 0) + '"></label>' +
      '<div class="aksi wrap"><button type="button" class="tombol" id="skRimA4">+1 Rim A4 (500)</button><button type="button" class="tombol" id="skRimF4">+1 Rim F4 (500)</button></div>' +
      '</div><div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama" type="button" id="skSimpan">Simpan</button></div>', function (f) {
        $('#skRimA4', f).onclick = function () { $('#skA4', f).value = (parseInt($('#skA4', f).value, 10) || 0) + 500; };
        $('#skRimF4', f).onclick = function () { $('#skF4', f).value = (parseInt($('#skF4', f).value, 10) || 0) + 500; };
        $('#skSimpan', f).onclick = function () {
          D.aturan.kertasA4 = Math.max(0, parseInt($('#skA4', f).value, 10) || 0);
          D.aturan.kertasF4 = Math.max(0, parseInt($('#skF4', f).value, 10) || 0);
          catatAudit('Update stok kertas A4=' + D.aturan.kertasA4 + ', F4=' + D.aturan.kertasF4);
          simpan(); tutupDialog(); renderKelola(); toast('Stok kertas diperbarui');
        };
      });
  }

  function dialogOpname() {
    var fisik = D.produk.filter(function (p) { return !tanpaStok(p); });
    dialog('<h3>Stock opname cepat</h3>' +
      (fisik.length ? '<div class="form">' + fisik.map(function (p) {
        return '<div class="opname-row"><span><b>' + esc(p.nama) + '</b> <small class="redup">(sistem: ' + p.stok + ')</small></span><input type="number" min="0" data-op="' + p.id + '" value="' + p.stok + '"></div>';
      }).join('') + '</div>' : '<p class="redup">Tidak ada barang ATK dengan stok fisik.</p>') +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Batal</button>' + (fisik.length ? '<button class="tombol utama" type="button" id="opOk">Simpan opname</button>' : '') + '</div>', function (f) {
        var btn = $('#opOk', f);
        if (btn) btn.onclick = function () {
          $$('[data-op]', f).forEach(function (inp) {
            var p = D.produk.find(function (x) { return x.id === inp.dataset.op; });
            if (p) p.stok = Math.max(0, parseInt(inp.value, 10) || 0);
          });
          catatAudit('Stock opname ' + fisik.length + ' barang');
          simpan(); tutupDialog(); renderKelola(); toast('Stock opname disimpan');
        };
      });
  }

  function formProduk(p) {
    var baru = !p; p = p || { nama: '', kategori: D.kategori[0] || '', stok: 0, modal: 0, barcode: '', favorit: false, varian: [{ nama: 'Reguler', harga: 0 }] };
    function barisV(v) { return '<div class="varian-baris"><input placeholder="Nama varian" value="' + esc(v.nama) + '" required><input type="number" min="0" placeholder="Harga" value="' + v.harga + '" required><select aria-label="Jenis lembar">' + [['', 'Jasa/barang'], ['bw', 'Lembar BW'], ['warna', 'Lembar warna']].map(function (j) { return '<option value="' + j[0] + '"' + ((v.jenis || '') === j[0] ? ' selected' : '') + '>' + j[1] + '</option>'; }).join('') + '</select><button type="button" aria-label="Hapus varian">×</button></div>'; }
    dialog('<h3>' + (baru ? 'Tambah' : 'Ubah') + ' produk</h3>' +
      '<div class="hc-tabs" role="tablist"><button type="button" class="aktif" data-fpt="1">Info &amp; Varian</button><button type="button" data-fpt="2">Foto &amp; Ikon</button><button type="button" data-fpt="3">Lanjutan</button></div>' +
      '<div id="fpTab1" class="form">' +
      '<label>Nama<input id="fNama" required value="' + esc(p.nama) + '"></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<label>Kategori<select id="fKat">' + D.kategori.map(function (k) { return '<option' + (k === p.kategori ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></label>' +
      '<label>Stok <small class="redup">(-1 = jasa)</small><input id="fStok" type="number" min="-1" value="' + p.stok + '"></label></div>' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="fFav" type="checkbox"' + (p.favorit ? ' checked' : '') + ' style="width:18px;height:18px;min-height:18px;accent-color:var(--utama)"><span>Tandai sebagai layanan favorit</span></label>' +
      '<div><b class="kecil">Varian &amp; harga</b><div id="fVarian" class="form" style="margin-top:6px">' + p.varian.map(barisV).join('') + '</div>' +
      '<button type="button" class="tautan" id="fTambahV">+ varian</button></div></div>' +
      '<div id="fpTab2" class="form" hidden>' +
      '<div class="foto-baris"><span class="thumb foto-pratinjau" id="fFotoPra" data-nada="' + nadaDari(p.kategori + p.nama) + '">' + (p.foto ? '<img class="ilus foto-produk" src="' + esc(p.foto) + '" alt="">' : ilustrasiSvg(p)) + '</span>' +
      '<div class="aksi wrap"><label class="tombol" style="color:var(--teks)">Upload foto<input id="fFoto" type="file" accept="image/*" hidden></label><button type="button" class="tautan" id="fFotoHapus">Hapus foto</button></div></div>' +
      '<div><b class="kecil">Pilih Icon Pack</b><div class="ikon-grid" id="fIkonGrid">' + IKON_PACK.map(function (ik) {
        var akt = !p.foto && (p.ikon || '') === ik[0];
        var ico = ik[0] ? '<svg class="ilus" viewBox="0 0 120 90">' + ILUS[ik[0]].replace(/\{c\}/g, '#24578f').replace(/\{s\}/g, '#e0457b') + '</svg>' : '<span style="font-size:11px;font-weight:800">AUTO</span>';
        return '<button type="button" class="ikon-btn' + (akt ? ' aktif' : '') + '" data-ik="' + ik[0] + '" title="' + ik[1] + '">' + ico + '<span>' + ik[1] + '</span></button>';
      }).join('') + '</div></div></div>' +
      '<div id="fpTab3" class="form" hidden>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<label>Harga modal / HPP (opsional)<input id="fModal" type="number" min="0" value="' + (p.modal || 0) + '"></label>' +
      '<label>Kode / Barcode (opsional)<div style="display:flex;gap:6px"><input id="fBarcode" style="flex:1" value="' + esc(p.barcode || '') + '"><button type="button" class="tombol" id="fBarcodeAcak" style="padding:0 12px" title="Buat kode barcode acak dari nama produk">Acak</button></div></label></div>' +
      '<label>Harga grosir otomatis <small class="redup">(opsional, format min:harga|min:harga, mis. 100:250|500:200)</small><input id="fGrosir" placeholder="100:250|500:200" value="' + esc((p.grosir || []).map(function (g) { return g.min + ':' + g.harga; }).join('|')) + '"></label>' +
      '</div>' +
      '<div class="dlg-aksi">' + (baru ? '' : '<button type="button" class="tombol bahaya" id="fHapus" style="margin-right:auto">Hapus</button>') +
      '<button class="tombol" value="batal" formnovalidate>Batal</button><button class="tombol utama" type="button" id="fSimpan">Simpan</button></div>', function (f) {
        $$('[data-fpt]', f).forEach(function (tb) {
          tb.onclick = function () {
            var k = tb.dataset.fpt;
            $$('[data-fpt]', f).forEach(function (x) { x.classList.toggle('aktif', x === tb); });
            ['1', '2', '3'].forEach(function (n) { $('#fpTab' + n, f).hidden = n !== k; });
          };
        });
        function ikatHapus() { $$('.varian-baris > button', f).forEach(function (b) { b.onclick = function () { if ($$('.varian-baris', f).length > 1) b.parentNode.remove(); }; }); }
        ikatHapus();
        var fotoBaru = p.foto || '', ikonBaru = p.ikon || '';
        $('#fFoto', f).onchange = function () { var fl = this.files[0]; if (fl) kecilkanFoto(fl, function (u) { fotoBaru = u; $('#fFotoPra', f).innerHTML = '<img class="ilus foto-produk" src="' + u + '" alt="">'; $$('.ikon-btn', f).forEach(function (b) { b.classList.remove('aktif'); }); }); };
        $('#fFotoHapus', f).onclick = function () { fotoBaru = ''; $('#fFoto', f).value = ''; $('#fFotoPra', f).innerHTML = ilustrasiSvg(Object.assign({}, p, { foto: '', ikon: ikonBaru })); };
        $$('.ikon-btn', f).forEach(function (b) {
          b.onclick = function () {
            ikonBaru = b.dataset.ik; fotoBaru = ''; $('#fFoto', f).value = '';
            $$('.ikon-btn', f).forEach(function (x) { x.classList.toggle('aktif', x === b); });
            $('#fFotoPra', f).innerHTML = ilustrasiSvg(Object.assign({}, p, { foto: '', ikon: ikonBaru }));
          };
        });
        $('#fTambahV', f).onclick = function () { $('#fVarian', f).insertAdjacentHTML('beforeend', barisV({ nama: '', harga: 0 })); ikatHapus(); tingkatkanDropdown(f); };
        $('#fBarcodeAcak', f).onclick = function () {
          var nm = ($('#fNama', f).value || 'PRD').trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
          var kata = nm.split(/\s+/).filter(Boolean);
          var pref = kata.length > 1 ? kata.map(function (w) { return w[0]; }).join('').slice(0, 4) : (kata[0] || 'PRD').slice(0, 3);
          if (pref.length < 2) pref = (pref + 'PRD').slice(0, 3);
          var kode;
          do { kode = pref + '-' + String(1000 + Math.floor(Math.random() * 9000)); }
          while (D.produk.some(function (x) { return x.id !== p.id && x.barcode === kode; }));
          $('#fBarcode', f).value = kode;
        };
        if (!baru) $('#fHapus', f).onclick = function () {
          dialogKonfirm('Hapus layanan', 'Hapus "' + p.nama + '" dari daftar layanan?', 'Hapus', true, function () {
            D.produk = D.produk.filter(function (x) { return x.id !== p.id; }); catatAudit('Hapus produk: ' + p.nama); simpan(); renderKelola(); toast('Layanan dihapus');
          });
        };
        $('#fSimpan', f).onclick = function () {
          var nama = $('#fNama', f).value.trim();
          var varian = $$('.varian-baris', f).map(function (r) { var i = $$('input', r); return { nama: i[0].value.trim() || 'Reguler', harga: Math.max(0, +i[1].value || 0), jenis: $('select', r).value }; });
          if (!nama) return toast('Nama produk wajib diisi');
          if (!D.kategori.length) return toast('Buat kategori dulu');
          var grosir = ($('#fGrosir', f).value || '').split('|').map(function (s) { var a = s.split(':'); return { min: parseInt(a[0], 10) || 0, harga: parseInt(a[1], 10) || 0 }; }).filter(function (g) { return g.min > 0 && g.harga >= 0; });
          var data = { nama: nama, kategori: $('#fKat', f).value, stok: Math.max(-1, parseInt($('#fStok', f).value, 10) || 0), modal: Math.max(0, parseInt($('#fModal', f).value, 10) || 0), barcode: $('#fBarcode', f).value.trim(), grosir: grosir, favorit: $('#fFav', f).checked, foto: fotoBaru, ikon: ikonBaru, varian: varian };
          if (baru) { D.produk.push(Object.assign({ id: uid() }, data)); catatAudit('Tambah produk: ' + nama); }
          else { Object.assign(p, data); catatAudit('Ubah produk: ' + nama); }
          simpan(); tutupDialog(); renderKelola(); toast('Produk disimpan');
        };
      });
  }

  function formKategori() {
    function isi() {
      return '<h3>Kategori</h3><ul class="daftar-kasir">' + D.kategori.map(function (k, i) {
        var n = D.produk.filter(function (p) { return p.kategori === k; }).length;
        return '<li><span>' + esc(k) + ' <span class="redup kecil">(' + n + ' produk)</span></span><button type="button" class="tautan" data-h="' + i + '"' + (n ? ' disabled title="Masih dipakai"' : '') + '>Hapus</button></li>';
      }).join('') + '</ul><div class="form sebaris" style="grid-template-columns:1fr auto"><input id="kBaru" placeholder="Kategori baru"><button type="button" class="tombol" id="kTambah">Tambah</button></div><div class="dlg-aksi"><button class="tombol utama" value="ok">Selesai</button></div>';
    }
    function ikat(f) {
      $('#kTambah', f).onclick = function () { var v = $('#kBaru', f).value.trim(); if (v && D.kategori.indexOf(v) < 0) { D.kategori.push(v); simpan(); dialog(isi(), ikat); } };
      $$('[data-h]', f).forEach(function (b) { b.onclick = function () { D.kategori.splice(+b.dataset.h, 1); simpan(); dialog(isi(), ikat); }; });
    }
    dialog(isi(), ikat);
  }

  // ---------- Riwayat ----------
  var terpilihTrx = {};
  function trxFilter() {
    var t = $('#filterTanggal').value;
    var q = ($('#cariRiwayat') && $('#cariRiwayat').value.trim().toLowerCase()) || '';
    var m = ($('#filterMetode') && $('#filterMetode').value) || '';
    var st = ($('#filterStatus') && $('#filterStatus').value) || '';
    return D.transaksi.filter(function (x) {
      if (t && tglKey(new Date(x.waktu)) !== t) return false;
      if (m && x.metode !== m) return false;
      if (st === 'dp' && !(x.sisa > 0)) return false;
      if (st && st !== 'dp' && (x.status || 'selesai') !== st) return false;
      if (q) {
        var hay = (x.id + ' ' + x.kasir + ' ' + (x.pelanggan || '') + ' ' + x.items.map(function (i) { return i.nama; }).join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).slice().reverse();
  }
  function perbaruiBarRiwayat(list) {
    var tampil = list.slice(0, 200);
    var totalOmzet = list.reduce(function (s, x) { return s + x.total; }, 0);
    var rk = $('#riwayatRingkas');
    if (rk) rk.textContent = list.length + ' transaksi · Total ' + rp(totalOmzet);
    var ids = Object.keys(terpilihTrx).filter(function (id) { return terpilihTrx[id] && D.transaksi.some(function (x) { return x.id === id; }); });
    var n = ids.length;
    var ab = $('#riwayatAksiBanyak'), nt = $('#nTerpilih'), cs = $('#cekSemuaTrx');
    if (ab) ab.hidden = !n;
    if (nt) nt.textContent = n;
    if (cs) {
      cs.disabled = !tampil.length;
      cs.checked = tampil.length > 0 && tampil.every(function (x) { return !!terpilihTrx[x.id]; });
    }
    var hs = $('#btnHapusSemuaTrx');
    if (hs) hs.disabled = !list.length;
  }
  function lencanaStatus(x) {
    var s = x.status || 'selesai';
    var h = '';
    if (s === 'antre') h += ' <span class="lencana kuning">Antre</span>';
    else if (s === 'proses') h += ' <span class="lencana biru">Proses</span>';
    else if (s === 'siap') h += ' <span class="lencana">Siap ambil</span>';
    if (x.sisa > 0) h += ' <span class="lencana merah">Sisa ' + rp(x.sisa) + '</span>';
    return h;
  }
  var batasRiwayat = 50;
  function renderRiwayat() {
    var list = trxFilter();
    perbaruiBarRiwayat(list);
    var potong = list.slice(0, batasRiwayat);
    $('#daftarTrx').innerHTML = (potong.length ? potong.map(function (x) {
      var cek = !!terpilihTrx[x.id];
      return '<div class="trx' + (cek ? ' dipilih' : '') + '"><div class="trx-cek-wrap"><input type="checkbox" class="trx-cek" data-cek="' + x.id + '"' + (cek ? ' checked' : '') + ' aria-label="Pilih ' + x.id + '"><div><b>' + x.id + '</b>' + (x.pelanggan ? ' <span class="lencana">' + esc(x.pelanggan) + '</span>' : '') + lencanaStatus(x) +
        '<div class="meta">' + fmtWaktu(x.waktu) + ' · ' + esc(x.kasir) + ' · ' + x.metode.toUpperCase() + ' · ' + x.items.reduce(function (s, i) { return s + i.qty; }, 0) + ' item</div>' +
        '<div class="meta">' + x.items.map(function (i) { return esc(i.nama) + ' ×' + i.qty; }).join(', ') + '</div></div></div><div class="tot">' + rp(x.total) + '</div>' +
        '<div class="aksi">' +
        (x.sisa > 0 ? '<button class="tombol utama" data-lunas="' + x.id + '">Lunasi</button>' : '') +
        '<button class="tombol" data-detail="' + x.id + '">Detail</button><button class="tombol" data-cetak="' + x.id + '">Cetak</button></div></div>';
    }).join('') + (list.length > batasRiwayat ? '<button type="button" class="tombol" id="btnLebihTrx" style="justify-self:center">Tampilkan lebih banyak (' + (list.length - batasRiwayat) + ' lagi)</button>' : '') : '<p class="kosong">Belum ada transaksi yang sesuai.</p>');
    var lb = $('#btnLebihTrx'); if (lb) lb.onclick = function () { batasRiwayat += 50; renderRiwayat(); };
  }
  function hapusDaftarTrx(ids) {
    var set = {}; ids.forEach(function (id) { set[id] = true; });
    D.transaksi.forEach(function (x) {
      if (!set[x.id]) return;
      x.items.forEach(function (i) { var p = D.produk.find(function (q) { return q.id === i.pid; }); if (p && !tanpaStok(p)) p.stok += i.qty; });
    });
    D.transaksi = D.transaksi.filter(function (t) { return !set[t.id]; });
    terpilihTrx = {};
    simpan(); renderRiwayat();
  }
  function ulangiTrx(x) {
    if (!x) return;
    keranjang = x.items.map(function (i) { return Object.assign({}, i); });
    if ($('#inPelanggan')) $('#inPelanggan').value = x.pelanggan || '';
    buka('kasir');
    perbaruiShiftPill(); perbaruiIkonTema(); toast('Pesanan ' + x.id + ' dimuat ke kasir');
  }
  function dialogDetailTrx(x) {
    if (!x) return;
    dialog('<h3>Detail ' + esc(x.id) + '</h3>' +
      '<div class="meta redup kecil">' + fmtWaktu(x.waktu) + ' · Kasir: ' + esc(x.kasir) + (x.pelanggan ? ' · Pelanggan: ' + esc(x.pelanggan) : '') + '</div>' +
      '<ul class="trx-detail-list">' + x.items.map(function (i) {
        return '<li><span><b>' + esc(i.nama) + '</b> <span class="redup">' + esc(i.varian) + ' (' + i.qty + ' × ' + rp(i.harga) + ')</span></span><b>' + rp(i.qty * i.harga) + '</b></li>';
      }).join('') + '</ul>' +
      '<div class="trx-ringkas"><div><span>Subtotal</span><span>' + rp(x.subtotal) + '</span></div>' +
      (x.diskon ? '<div><span>Diskon</span><span>-' + rp(x.diskon) + '</span></div>' : '') +
      '<div class="tot"><span>Total (' + x.metode.toUpperCase() + ')</span><span>' + rp(x.total) + '</span></div>' +
      (x.metode === 'tunai' ? '<div><span>Dibayar</span><span>' + rp(x.bayar) + '</span></div><div><span>Kembalian</span><span>' + rp(x.kembali) + '</span></div>' : '') +
      '</div><div class="dlg-aksi" style="flex-wrap:wrap">' +
      (isAdmin() ? '<button class="tombol bahaya" type="button" id="dtHapus" style="margin-right:auto">Batalkan</button>' : '') +
      ((x.status && x.status !== 'selesai') ? '<button class="tombol" type="button" id="dtStatus">Naikkan status</button>' : '') +
      '<button class="tombol" type="button" id="dtWA">Kirim WA</button><button class="tombol" type="button" id="dtBT">Bluetooth</button><button class="tombol" type="button" id="dtUlangi">Ulangi</button><button class="tombol" type="button" id="dtA5">Nota A5</button><button class="tombol utama" type="button" id="dtCetak">Cetak struk</button></div>', function (f) {
        if ($('#dtHapus', f)) $('#dtHapus', f).onclick = function () {
          dialogKonfirm('Batalkan transaksi', 'Batalkan transaksi ' + x.id + '? Stok produk akan dikembalikan.', 'Ya, batalkan', true, function () {
            hapusDaftarTrx([x.id]); toast('Transaksi dibatalkan');
          });
        };
        if ($('#dtStatus', f)) $('#dtStatus', f).onclick = function () {
          var urut = ['antre', 'proses', 'siap', 'selesai'];
          var nx = urut[(urut.indexOf(x.status || 'selesai') + 1) % urut.length];
          if (nx === 'selesai' && x.sisa > 0) return toast('Lunasi DP dulu sebelum menyelesaikan');
          x.status = nx; simpan(); tutupDialog(); renderRiwayat(); toast('Status: ' + nx);
        };
        $('#dtWA', f).onclick = function () { kirimWA(x); };
        $('#dtBT', f).onclick = function () { cetakBluetooth(x); };
        $('#dtUlangi', f).onclick = function () { tutupDialog(); ulangiTrx(x); };
        $('#dtA5', f).onclick = function () { cetak(x, 'a5'); };
        $('#dtCetak', f).onclick = function () { cetak(x); };
      });
  }

  function eksporTrx(daftar) {
    var list = Array.isArray(daftar) ? daftar : trxFilter().reverse();
    var rows = [['id', 'waktu', 'kasir', 'pelanggan', 'produk', 'varian', 'qty', 'harga', 'subtotal_item', 'diskon_trx', 'total_trx', 'metode', 'jenis_lembar', 'status', 'dp', 'sisa']];
    list.forEach(function (x) { x.items.forEach(function (i) { rows.push([x.id, x.waktu, x.kasir, x.pelanggan || '', i.nama, i.varian, i.qty, i.harga, i.qty * i.harga, x.diskon, x.total, x.metode, i.jenis || '', x.status || 'selesai', x.dp || 0, x.sisa || 0]); }); });
    unduh('transaksi-' + ($('#filterTanggal').value || 'semua') + '.csv', '\uFEFF' + rows.map(function (r) { return r.map(csvSel).join(','); }).join('\n'), 'text/csv');
  }

  // ---------- Laporan ----------
  var modeLap = 'hari';
  function ringkasan(list) {
    var omzet = 0, hpp = 0, item = 0, perProduk = {}, metode = { tunai: 0, qris: 0, transfer: 0, campuran: 0 };
    list.forEach(function (x) {
      omzet += x.total; metode[x.metode] = (metode[x.metode] || 0) + x.total;
      x.items.forEach(function (i) { item += i.qty; hpp += (i.modal || 0) * i.qty; var k = i.nama; perProduk[k] = perProduk[k] || { nama: k, qty: 0, nilai: 0 }; perProduk[k].qty += i.qty; perProduk[k].nilai += i.qty * i.harga; });
    });
    var top = Object.keys(perProduk).map(function (k) { return perProduk[k]; }).sort(function (a, b) { return b.qty - a.qty || b.nilai - a.nilai; });
    var lb = { bw: 0, warna: 0, nbw: 0, nwarna: 0 };
    list.forEach(function (x) { x.items.forEach(function (i) { if (i.jenis === 'bw' || i.jenis === 'warna') { lb[i.jenis] += i.qty * (i.lembar || 1); lb['n' + i.jenis] += i.qty * i.harga; } }); });
    return { omzet: omzet, hpp: hpp, labaKotor: omzet - hpp, trx: list.length, item: item, rata: list.length ? omzet / list.length : 0, top: top, metode: metode, lembar: lb };
  }
  function renderLaporan() {
    var inp = $('#tglLaporan'); if (!inp.value) inp.value = tglKey(new Date());
    var t = new Date(inp.value + 'T00:00:00');
    var cocokTgl = function (iso) { var d = new Date(iso); return modeLap === 'hari' ? tglKey(d) === inp.value : d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth(); };
    var list = D.transaksi.filter(function (x) { return cocokTgl(x.waktu); });
    var peng = (D.pengeluaran || []).filter(function (p) { return cocokTgl(p.waktu); });
    var totPeng = peng.reduce(function (s, p) { return s + p.jumlah; }, 0);
    var r = ringkasan(list);
    var laba = r.omzet - r.hpp - totPeng;
    $('#kartuAngka').innerHTML = '<div class="angka sorot"><small>Omzet</small><b>' + rp(r.omzet) + '</b></div>' +
      '<div class="angka"><small>HPP + Pengeluaran</small><b>' + rp(r.hpp + totPeng) + '</b></div>' +
      '<div class="angka"><small>Laba bersih</small><b>' + rp(laba) + '</b></div>' +
      '<div class="angka"><small>' + r.trx + ' trx · Rata-rata</small><b>' + rp(r.rata) + '</b></div>';
    var batang = [];
    if (modeLap === 'hari') {
      $('#judulGrafik').textContent = 'Penjualan per jam';
      for (var j = 7; j <= 22; j++) batang.push({ l: j, v: 0 });
      list.forEach(function (x) { var h = new Date(x.waktu).getHours(); var b = batang.find(function (z) { return z.l === h; }); if (b) b.v += x.total; });
    } else {
      $('#judulGrafik').textContent = 'Penjualan per tanggal';
      var hari = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= hari; d++) batang.push({ l: d, v: 0 });
      list.forEach(function (x) { batang[new Date(x.waktu).getDate() - 1].v += x.total; });
    }
    var maks = Math.max.apply(null, batang.map(function (b) { return b.v; }).concat([1]));
    $('#grafik').innerHTML = batang.map(function (b, i) {
      var lbl = modeLap === 'bulan' && i % 5 !== 0 && b.l !== batang.length ? '&nbsp;' : b.l;
      return '<div class="kol" title="' + b.l + ': ' + rp(b.v) + '"><div class="batang' + (b.v ? '' : ' nol') + '" style="height:' + (b.v / maks * 100) + '%"></div><small>' + lbl + '</small></div>';
    }).join('');
    var tl = r.lembar.bw + r.lembar.warna, pw = tl ? Math.round(r.lembar.warna / tl * 100) : 0;
    $('#rekapLembar').innerHTML = '<div class="lembar-angka"><div><small class="redup">Hitam-putih</small><b>' + r.lembar.bw.toLocaleString('id-ID') + ' <small>lbr</small></b><span class="redup kecil">' + rp(r.lembar.nbw) + '</span></div><div><small class="redup">Warna</small><b>' + r.lembar.warna.toLocaleString('id-ID') + ' <small>lbr</small></b><span class="redup kecil">' + rp(r.lembar.nwarna) + '</span></div></div>' +
      '<div class="lembar-bar" role="img" aria-label="' + (100 - pw) + ' persen hitam-putih, ' + pw + ' persen warna"><i class="bw" style="width:' + (tl ? 100 - pw : 50) + '%"></i><i class="warna" style="width:' + (tl ? pw : 50) + '%"></i></div><p class="redup kecil">' + (tl ? 'Total ' + tl.toLocaleString('id-ID') + ' lembar · ' + pw + '% warna. Pakai angka ini untuk cek toner & kertas.' : 'Belum ada lembar tercatat.') + '</p>';
    $('#terlaris').innerHTML = r.top.slice(0, 7).map(function (p) { return '<li><span>' + esc(p.nama) + '</span><b>' + p.qty + '×</b></li>'; }).join('') || '<li style="display:block" class="redup">Belum ada penjualan.</li>';
    $('#metodeRingkas').innerHTML = ['tunai', 'qris', 'transfer', 'campuran'].map(function (m) { return '<div><small class="redup">' + m.toUpperCase() + '</small><b>' + rp(r.metode[m] || 0) + '</b></div>'; }).join('');
    var rk = $('#rekapKasir');
    if (rk) {
      var perK = {};
      list.forEach(function (x) { perK[x.kasir] = perK[x.kasir] || { n: 0, v: 0 }; perK[x.kasir].n++; perK[x.kasir].v += x.total; });
      var ks = Object.keys(perK);
      rk.innerHTML = ks.length ? ks.map(function (k) { return '<li><span><b>' + esc(k) + '</b> <span class="redup kecil">(' + perK[k].n + ' trx)</span></span><b>' + rp(perK[k].v) + '</b></li>'; }).join('') : '<li class="redup">Belum ada transaksi.</li>';
    }
    var dp = $('#daftarPengeluaran');
    if (dp) {
      dp.innerHTML = peng.length ? peng.slice().reverse().map(function (p) {
        return '<li><span><b>' + esc(p.kategori) + '</b>: ' + esc(p.keterangan) + '<div class="redup kecil">' + fmtWaktu(p.waktu) + ' · ' + esc(p.kasir) + '</div></span><span class="aksi"><b>-' + rp(p.jumlah) + '</b>' + (isAdmin() ? '<button class="tautan" data-hpeng="' + p.id + '">Hapus</button>' : '') + '</span></li>';
      }).join('') : '<li class="redup">Belum ada pengeluaran pada periode ini.</li>';
    }
  }

  function dialogPengeluaran() {
    dialog('<h3>Catat pengeluaran</h3><div class="form">' +
      '<label>Kategori<select id="pgKat"><option>Kertas &amp; Bahan</option><option>Tinta / Toner</option><option>Listrik / Internet</option><option>Gaji / Konsumsi</option><option>Servis Mesin</option><option>Lainnya</option></select></label>' +
      '<label>Keterangan<input id="pgKet" placeholder="Mis. Beli 5 rim HVS A4" required></label>' +
      '<label>Jumlah (Rp)<input id="pgJml" type="number" min="0" inputmode="numeric" value="50000" required></label>' +
      '</div><div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama" type="button" id="pgSimpan">Simpan</button></div>', function (f) {
        $('#pgSimpan', f).onclick = function () {
          var ket = $('#pgKet', f).value.trim(), jml = Math.max(0, parseInt($('#pgJml', f).value, 10) || 0);
          if (!ket || !jml) return toast('Isi keterangan & nominal');
          D.pengeluaran.push({ id: uid(), waktu: new Date().toISOString(), kategori: $('#pgKat', f).value, keterangan: ket, jumlah: jml, kasir: pengguna.nama });
          catatAudit('Pengeluaran ' + rp(jml) + ': ' + ket);
          simpan(); tutupDialog(); renderLaporan(); toast('Pengeluaran dicatat');
        };
      });
  }

  function cetakShift(sh) {
    var t = D.toko, st = $('#struk');
    st.className = 'struk';
    st.innerHTML = '<div class="tengah"><h4>' + esc(t.nama) + '</h4><div>LAPORAN TUTUP SHIFT</div></div>' +
      '<div class="gr"></div><div>Kasir: ' + esc(sh.kasir) + '</div><div>Buka: ' + fmtWaktu(sh.buka) + '</div><div>Tutup: ' + fmtWaktu(sh.tutup) + '</div><div class="gr"></div>' +
      '<div class="br"><span>Modal awal</span><span>' + rp(sh.modalAwal) + '</span></div>' +
      '<div class="br"><span>Seharusnya</span><span>' + rp(sh.ekspektasi) + '</span></div>' +
      '<div class="br"><span>Uang fisik</span><span>' + rp(sh.kasAktual) + '</span></div>' +
      '<div class="br"><b>Selisih</b><b>' + rp(sh.selisih) + '</b></div>' +
      (sh.catatan ? '<div class="gr"></div><div>Cat: ' + esc(sh.catatan) + '</div>' : '') +
      '<div class="gr"></div><div class="tengah">' + fmtWaktu(new Date().toISOString()) + '</div>';
    window.print();
  }
  function dialogShift() {
    var sh = D.shift && D.shift.aktif;
    var riw = (D.shift && D.shift.riwayat) || [];
    var riwHtml = riw.length ? '<div style="border-top:1px solid var(--garis);padding-top:10px"><b class="kecil">Riwayat tutup shift</b><ul class="trx-detail-list">' + riw.slice(0, 8).map(function (r, idx) {
      return '<li><span><b>' + esc(r.kasir) + '</b> · ' + fmtWaktu(r.tutup) + '<div class="redup kecil">Fisik ' + rp(r.kasAktual) + ' · Selisih ' + rp(r.selisih) + '</div></span><button type="button" class="tombol" data-cs="' + idx + '">Cetak</button></li>';
    }).join('') + '</ul></div>' : '';
    if (!sh) {
      dialog('<h3>Shift kasir</h3><p class="redup kecil">Catat modal awal di laci kas sebelum mulai berjualan.</p><div class="form">' +
        '<label>Modal awal laci (Rp)<input id="shModal" type="number" min="0" inputmode="numeric" value="200000"></label>' +
        '</div>' + riwHtml + '<div class="dlg-aksi"><button class="tombol" value="batal">Tutup</button><button class="tombol utama" type="button" id="shBuka">Buka shift</button></div>', function (f) {
          $$('[data-cs]', f).forEach(function (b) { b.onclick = function () { cetakShift(riw[+b.dataset.cs]); }; });
          $('#shBuka', f).onclick = function () {
            var m = Math.max(0, parseInt($('#shModal', f).value, 10) || 0);
            D.shift.aktif = { id: uid(), kasir: pengguna.nama, buka: new Date().toISOString(), modalAwal: m };
            simpan(); perbaruiShiftPill(); tutupDialog(); toast('Shift dibuka dengan modal ' + rp(m));
          };
        });
      return;
    }
    var tunaiShift = D.transaksi.filter(function (x) { return x.waktu >= sh.buka && x.metode === 'tunai'; }).reduce(function (s, x) { return s + x.total; }, 0);
    var pengShift = (D.pengeluaran || []).filter(function (p) { return p.waktu >= sh.buka; }).reduce(function (s, p) { return s + p.jumlah; }, 0);
    var ekspektasi = sh.modalAwal + tunaiShift - pengShift;
    dialog('<h3>Tutup shift kasir</h3>' +
      '<div class="trx-ringkas">' +
      '<div><span>Kasir &amp; buka</span><b>' + esc(sh.kasir) + ' · ' + fmtWaktu(sh.buka) + '</b></div>' +
      '<div><span>Modal awal</span><span>' + rp(sh.modalAwal) + '</span></div>' +
      '<div><span>Penjualan tunai</span><span>+' + rp(tunaiShift) + '</span></div>' +
      '<div><span>Pengeluaran</span><span>-' + rp(pengShift) + '</span></div>' +
      '<div class="tot"><span>Uang laci seharusnya</span><span>' + rp(ekspektasi) + '</span></div>' +
      '</div><div class="form"><label>Uang fisik di laci saat ini (Rp)<input id="shAktual" type="number" min="0" inputmode="numeric" value="' + ekspektasi + '"></label>' +
      '<label>Catatan tutup shift<input id="shCat" placeholder="Opsional"></label></div>' + riwHtml +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama" type="button" id="shTutup">Tutup shift</button></div>', function (f) {
        $$('[data-cs]', f).forEach(function (b) { b.onclick = function () { cetakShift(riw[+b.dataset.cs]); }; });
        $('#shTutup', f).onclick = function () {
          var akt = Math.max(0, parseInt($('#shAktual', f).value, 10) || 0);
          sh.tutup = new Date().toISOString(); sh.kasAktual = akt; sh.ekspektasi = ekspektasi; sh.selisih = akt - ekspektasi; sh.catatan = $('#shCat', f).value.trim();
          D.shift.riwayat.unshift(sh); D.shift.aktif = null;
          catatAudit('Tutup shift ' + sh.kasir + ' (selisih ' + rp(sh.selisih) + ')');
          simpan(); perbaruiShiftPill(); tutupDialog(); toast('Shift ditutup. Selisih: ' + rp(sh.selisih));
        };
      });
  }

  function dialogCounter() {
    var log = D.counter || [];
    var awalDef = log.length ? log[0].akhir : 0;
    dialog('<h3>Log counter mesin fotocopy</h3><p class="redup kecil">Cocokkan meteran fisik mesin dengan lembar yang tercatat di kasir.</p><div class="form">' +
      '<label>Nama mesin<input id="ctMesin" value="Mesin Utama 1"></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<label>Counter awal<input id="ctAwal" type="number" min="0" value="' + awalDef + '"></label>' +
      '<label>Counter akhir<input id="ctAkhir" type="number" min="0" value="' + awalDef + '"></label></div>' +
      '<button type="button" class="tombol" id="ctSimpan">+ Catat counter</button></div>' +
      (log.length ? '<ul class="trx-detail-list">' + log.slice(0, 8).map(function (c) {
        return '<li><span><b>' + esc(c.mesin) + '</b> (' + c.awal.toLocaleString('id-ID') + ' → ' + c.akhir.toLocaleString('id-ID') + ')<div class="redup kecil">' + fmtWaktu(c.waktu) + ' · ' + esc(c.kasir) + '</div></span><b>' + c.selisih.toLocaleString('id-ID') + ' lbr</b></li>';
      }).join('') + '</ul>' : '') +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Tutup</button></div>', function (f) {
        $('#ctSimpan', f).onclick = function () {
          var aw = Math.max(0, parseInt($('#ctAwal', f).value, 10) || 0), ak = Math.max(0, parseInt($('#ctAkhir', f).value, 10) || 0);
          if (ak < aw) return toast('Counter akhir tidak boleh lebih kecil dari awal');
          D.counter.unshift({ id: uid(), waktu: new Date().toISOString(), mesin: $('#ctMesin', f).value.trim() || 'Mesin 1', awal: aw, akhir: ak, selisih: ak - aw, kasir: pengguna.nama });
          simpan(); dialogCounter(); toast('Counter dicatat (+' + (ak - aw) + ' lbr)');
        };
      });
  }

  // ---------- Pengaturan ----------
  function renderAtur() {
    var f = $('#formToko');
    ['nama', 'alamat', 'telp', 'footer', 'rekening'].forEach(function (k) { f.elements[k].value = D.toko[k] || ''; });
    var lp = $('#logoTokoPra');
    if (lp) {
      var lsrc = D.toko.logo || KONFIG.logo;
      lp.innerHTML = lsrc ? '<img class="ilus foto-produk" src="' + esc(lsrc) + '" alt="" style="object-fit:contain;padding:4px">' : '';
    }
    var fa = $('#formAturan');
    if (fa && D.aturan) {
      fa.elements.pembulatan.value = String(D.aturan.pembulatan || 0); sinkronDropdown(fa.elements.pembulatan);
      fa.elements.ukuranStruk.value = D.aturan.ukuranStruk || '58mm'; sinkronDropdown(fa.elements.ukuranStruk);
      fa.elements.batasStok.value = D.aturan.batasStok || 5;
      if (fa.elements.autoLock) { fa.elements.autoLock.value = String(D.aturan.autoLock || 0); sinkronDropdown(fa.elements.autoLock); }
      fa.elements.qrisStatis.value = D.aturan.qrisStatis || '';
    }
    var fg = $('#formGas');
    if (fg && D.aturan) {
      if ($('#gasUrl')) $('#gasUrl').value = D.aturan.gasUrl || '';
      if ($('#gasAuto')) $('#gasAuto').checked = !!D.aturan.gasAuto;
      var gs = $('#gasStatus');
      if (gs) gs.textContent = D.aturan.gasUrl ? ('Terhubung ke GAS' + (D.aturan.gasLastSync ? ' · Sinkron terakhir: ' + fmtWaktu(new Date(D.aturan.gasLastSync).toISOString()) : '')) : 'Belum ada URL Web App GAS yang disimpan.';
    }
    var sm = $('#storageMeter');
    if (sm) {
      var bytes = ((localStorage.getItem(KUNCI) || '').length + (localStorage.getItem(KUNCI_PL) || '').length) * 2;
      var kb = (bytes / 1024).toFixed(1), pct = Math.min(100, Math.round(bytes / (5 * 1024 * 1024) * 100));
      sm.innerHTML = 'Penyimpanan terpakai: <b>' + (bytes > 1048576 ? (bytes / 1048576).toFixed(2) + ' MB' : kb + ' KB') + '</b> dari ~5 MB (' + pct + '%) · ' + D.transaksi.length + ' transaksi, ' + (D.pelanggan || []).length + ' member.';
    }
    var da = $('#daftarAudit');
    if (da) {
      var au = D.audit || [];
      da.innerHTML = au.length ? au.slice(0, 30).map(function (a) {
        return '<li><span><b>' + esc(a.kasir) + '</b>: ' + esc(a.aksi) + '</span><span class="redup kecil">' + fmtWaktu(a.waktu) + '</span></li>';
      }).join('') : '<li class="redup">Belum ada log aktivitas.</li>';
    }
    renderTarif();
    $('#daftarKasirAtur').innerHTML = D.kasir.map(function (k) {
      return '<li><span><b>' + esc(k.nama) + '</b> <span class="lencana">' + k.peran + '</span></span>' + (k.id === pengguna.id ? '<span class="redup kecil">sedang masuk</span>' : '<button class="tautan" data-hk="' + k.id + '">Hapus</button>') + '</li>';
    }).join('');
  }

  function eksporProdukCSV() {
    var rows = [['nama', 'kategori', 'stok', 'varian', 'modal', 'barcode', 'grosir', 'favorit']].concat(D.produk.map(function (p) {
      return [p.nama, p.kategori, p.stok, p.varian.map(function (v) { return v.nama + ':' + v.harga + (v.jenis ? ':' + v.jenis : ''); }).join('|'), p.modal || 0, p.barcode || '', (p.grosir || []).map(function (g) { return g.min + ':' + g.harga; }).join('|'), p.favorit ? '1' : '0'];
    }));
    unduh('produk.csv', '\uFEFF' + rows.map(function (r) { return r.map(csvSel).join(','); }).join('\n'), 'text/csv');
  }
  function imporProdukCSV(teks) {
    var rows = parseCSV(teks.replace(/^\uFEFF/, ''));
    if (rows.length && /nama/i.test(rows[0][0])) rows.shift();
    var n = 0;
    rows.forEach(function (r) {
      var nama = (r[0] || '').trim(); if (!nama) return;
      var kat = (r[1] || 'Umum').trim();
      if (D.kategori.indexOf(kat) < 0) D.kategori.push(kat);
      var varian = (r[3] || 'Reguler:0').split('|').map(function (s) { var a = s.split(':'); return { nama: (a[0] || 'Reguler').trim(), harga: Math.max(0, parseInt(a[1], 10) || 0), jenis: (a[2] || '').trim() }; });
      var grosir = (r[6] || '').split('|').map(function (s) { var a = s.split(':'); return { min: parseInt(a[0], 10) || 0, harga: parseInt(a[1], 10) || 0 }; }).filter(function (g) { return g.min > 0 && g.harga >= 0; });
      var ada = D.produk.find(function (p) { return p.nama.toLowerCase() === nama.toLowerCase(); });
      var data = { nama: nama, kategori: kat, stok: Math.max(-1, parseInt(r[2], 10) || 0), varian: varian, modal: Math.max(0, parseInt(r[4], 10) || 0), barcode: (r[5] || '').trim(), grosir: grosir, favorit: r[7] === '1' || r[7] === 'true' };
      if (ada) Object.assign(ada, data); else D.produk.push(Object.assign({ id: uid() }, data));
      n++;
    });
    simpan(); return n;
  }
  function bacaFile(input, cb) {
    var file = input.files[0]; if (!file) return;
    var r = new FileReader(); r.onload = function () { cb(String(r.result)); input.value = ''; }; r.readAsText(file);
  }

  // ---------- Hitung cepat (fotocopy/print + banner m2 + konverter) ----------
  function hitungCepat(f) {
    var T = D.tarif, v = function (n) { return Math.max(0, parseInt(f.elements[n].value, 10) || 0); };
    var nup = f.elements.nup ? Math.max(1, +f.elements.nup.value) : 1;
    var hal = Math.ceil(v('hal') / nup), w = Math.min(Math.ceil(v('warna') / nup), hal), r = Math.max(1, v('rangkap')), sisi = +f.elements.sisi.value, uk = f.elements.ukuran.value, jenis = f.elements.jenis.value;
    var ukNama = uk === 'Custom' ? ((f.elements.ukuranCustom && f.elements.ukuranCustom.value.trim()) || 'Custom') : uk;
    var tambah = uk === 'F4' ? T.f4 : uk === 'Custom' ? (f.elements.tambahCustom ? Math.max(0, parseInt(f.elements.tambahCustom.value, 10) || 0) : 0) : 0;
    var tb = T[jenis], nama = (jenis === 'print' ? 'Print ' : 'Fotocopy ') + ukNama + (nup > 1 ? ' (' + nup + '-in-1)' : ''), baris = [];
    var lbw = Math.ceil((hal - w) / sisi) * r, lw = Math.ceil(w / sisi) * r;
    if (lbw) baris.push({ pid: 'hitung', nama: nama, varian: 'BW ' + sisi + ' sisi', harga: tb['bw' + sisi] + tambah, qty: lbw, jenis: 'bw', lembar: 1 });
    if (lw) baris.push({ pid: 'hitung', nama: nama, varian: 'Warna ' + sisi + ' sisi', harga: tb['warna' + sisi] + tambah, qty: lw, jenis: 'warna', lembar: 1 });
    var j = T.jilid[+f.elements.jilid.value];
    if (j && j[1]) baris.push({ pid: 'hitung', nama: 'Jilid', varian: j[0], harga: j[1], qty: r, jenis: '', lembar: 0 });
    if (v('laminasi')) baris.push({ pid: 'hitung', nama: 'Laminasi', varian: ukNama, harga: T.laminasi + tambah, qty: v('laminasi'), jenis: '', lembar: 0 });
    return baris;
  }
  function dialogHitung() {
    var T = D.tarif;
    dialog('<h3>Kalkulator percetakan</h3>' +
      '<div class="hc-tabs" role="tablist"><button type="button" class="aktif" data-tab="fc">Fotocopy &amp; Print</button><button type="button" data-tab="bn">Banner / m²</button><button type="button" data-tab="kv">Konverter &amp; Estimasi</button></div>' +
      '<div id="tabFC"><div class="hc">' +
      '<div class="hc-seg" role="radiogroup" aria-label="Jenis"><label><input type="radio" name="jenis" value="fotocopy" checked><span>Fotocopy</span></label><label><input type="radio" name="jenis" value="print"><span>Print</span></label></div>' +
      '<label>Jumlah halaman<input name="hal" type="number" min="0" inputmode="numeric" value="10"></label>' +
      '<label>Halaman berwarna<input name="warna" type="number" min="0" inputmode="numeric" value="0"></label>' +
      '<label>Rangkap / eksemplar<input name="rangkap" type="number" min="1" inputmode="numeric" value="1"></label>' +
      '<label>Layout (N-up)<select name="nup"><option value="1">Normal (1 hal/muka)</option><option value="2">2-in-1 / Booklet</option><option value="4">4-in-1</option></select></label>' +
      '<div class="hc-seg" role="radiogroup" aria-label="Ukuran"><label><input type="radio" name="ukuran" value="A4" checked><span>A4</span></label><label><input type="radio" name="ukuran" value="F4"><span>F4 / Folio</span></label><label><input type="radio" name="ukuran" value="Custom"><span>Custom</span></label></div>' +
      '<div id="hcCustomRow" style="grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:10px" hidden><label>Nama / ukuran kertas<input name="ukuranCustom" placeholder="Mis. A3, A5, B5, Legal" value="A3"></label><label>Tambahan harga / lbr (Rp)<input name="tambahCustom" type="number" min="0" inputmode="numeric" value="1000"></label></div>' +
      '<div class="hc-seg" role="radiogroup" aria-label="Sisi"><label><input type="radio" name="sisi" value="1" checked><span>1 sisi</span></label><label><input type="radio" name="sisi" value="2"><span>Bolak-balik</span></label></div>' +
      '<label>Jilid (per rangkap)<select name="jilid">' + T.jilid.map(function (j, i) { return '<option value="' + i + '">' + esc(j[0]) + (j[1] ? ' · ' + rp(j[1]) : '') + '</option>'; }).join('') + '</select></label>' +
      '<label>Laminasi (lembar)<input name="laminasi" type="number" min="0" inputmode="numeric" value="0"></label>' +
      '</div><div class="aksi wrap" style="margin-bottom:8px"><button type="button" class="tombol" id="presetSkripsi">Preset Paket Skripsi (80 hal + Hardcover)</button></div>' +
      '<div class="hc-hasil" id="hcHasil" aria-live="polite"></div></div>' +
      '<div id="tabBN" hidden><div class="hc">' +
      '<label>Bahan<select id="bnBahan"><option value="25000">Flexi 280g (Rp25.000/m²)</option><option value="35000">Flexi 340g (Rp35.000/m²)</option><option value="55000">Korea / Albatros (Rp55.000/m²)</option><option value="65000">Sticker Vinyl (Rp65.000/m²)</option></select></label>' +
      '<label>Qty<input id="bnQty" type="number" min="1" value="1"></label>' +
      '<label>Panjang (meter)<input id="bnP" type="number" min="0.1" step="0.1" value="2"></label>' +
      '<label>Lebar (meter)<input id="bnL" type="number" min="0.1" step="0.1" value="1"></label>' +
      '<label>Finishing / Mata ayam (Rp)<input id="bnFin" type="number" min="0" value="0"></label>' +
      '<label>Harga/m² custom (Rp)<input id="bnHarga" type="number" min="0" value="25000"></label>' +
      '</div><div class="hc-hasil" id="bnHasil"></div></div>' +
      '<div id="tabKV" hidden><div class="hc">' +
      '<label>Rim (1 rim = 500 lbr)<input id="kvRim" type="number" min="0" step="0.5" value="1"></label>' +
      '<label>Lembar<input id="kvLbr" type="number" min="0" value="500"></label>' +
      '<label>Kecepatan mesin (lbr/menit)<input id="kvKec" type="number" min="1" value="45"></label>' +
      '<label>Estimasi waktu selesai<input id="kvWaktu" readonly value="~12 menit"></label>' +
      '</div><p class="redup kecil">Gunakan konverter ini untuk menginformasikan estimasi waktu tunggu ke pelanggan.</p></div>' +
      '<div class="dlg-aksi"><button class="tombol" value="batal">Batal</button><button class="tombol utama" type="button" id="hcTambah">Masukkan ke pesanan</button></div>', function (f) {
        var tabAktif = 'fc';
        function updFC() {
          if ($('#hcCustomRow', f)) $('#hcCustomRow', f).hidden = f.elements.ukuran.value !== 'Custom';
          var b = hitungCepat(f), tot = b.reduce(function (s, i) { return s + i.harga * i.qty; }, 0);
          $('#hcHasil', f).innerHTML = b.length ? '<ul>' + b.map(function (i) { return '<li><span>' + esc(i.nama) + ' · ' + esc(i.varian) + '<small>' + i.qty + ' × ' + rp(i.harga) + '</small></span><b>' + rp(i.qty * i.harga) + '</b></li>'; }).join('') + '</ul><div class="hc-total"><span>Total</span><b>' + rp(tot) + '</b></div>' : '<p class="redup">Isi jumlah halaman dulu.</p>';
        }
        function updBN() {
          var p = Math.max(0.1, parseFloat($('#bnP', f).value) || 0), l = Math.max(0.1, parseFloat($('#bnL', f).value) || 0);
          var hg = Math.max(0, parseInt($('#bnHarga', f).value, 10) || 0), fin = Math.max(0, parseInt($('#bnFin', f).value, 10) || 0);
          var q = Math.max(1, parseInt($('#bnQty', f).value, 10) || 1);
          var luas = p * l, sub = Math.round(luas * hg) + fin;
          $('#bnHasil', f).innerHTML = '<div class="hc-total"><span>' + p + 'm × ' + l + 'm (' + luas.toFixed(2) + ' m²) × ' + q + '</span><b>' + rp(sub * q) + '</b></div>';
          return { nama: 'Cetak Banner ' + p + '×' + l + 'm', varian: $('#bnBahan', f).selectedOptions[0].textContent.split(' (')[0], harga: sub, qty: q };
        }
        $('#bnBahan', f).onchange = function () { $('#bnHarga', f).value = this.value; updBN(); };
        $('#kvRim', f).oninput = function () { var l = Math.round((parseFloat(this.value) || 0) * 500); $('#kvLbr', f).value = l; $('#kvWaktu', f).value = '~' + Math.max(1, Math.ceil(l / (parseInt($('#kvKec', f).value, 10) || 45))) + ' menit'; };
        $('#kvLbr', f).oninput = function () { var l = parseInt(this.value, 10) || 0; $('#kvRim', f).value = (l / 500).toFixed(2); $('#kvWaktu', f).value = '~' + Math.max(1, Math.ceil(l / (parseInt($('#kvKec', f).value, 10) || 45))) + ' menit'; };
        $('#kvKec', f).oninput = function () { var l = parseInt($('#kvLbr', f).value, 10) || 0; $('#kvWaktu', f).value = '~' + Math.max(1, Math.ceil(l / Math.max(1, parseInt(this.value, 10) || 45))) + ' menit'; };
        $('#presetSkripsi', f).onclick = function () {
          f.elements.jenis.value = 'print'; f.elements.hal.value = 80; f.elements.warna.value = 15; f.elements.rangkap.value = 1;
          var idxHc = T.jilid.findIndex(function (j) { return /hardcover/i.test(j[0]); });
          if (idxHc >= 0) { f.elements.jilid.value = String(idxHc); sinkronDropdown(f.elements.jilid); }
          updFC();
        };
        $$('.hc-tabs button', f).forEach(function (tb) {
          tb.onclick = function () {
            tabAktif = tb.dataset.tab;
            $$('.hc-tabs button', f).forEach(function (x) { x.classList.toggle('aktif', x === tb); });
            $('#tabFC', f).hidden = tabAktif !== 'fc'; $('#tabBN', f).hidden = tabAktif !== 'bn'; $('#tabKV', f).hidden = tabAktif !== 'kv';
            $('#hcTambah', f).hidden = tabAktif === 'kv';
          };
        });
        f.oninput = function () { updFC(); updBN(); }; f.onchange = function () { updFC(); updBN(); };
        updFC(); updBN();
        $('#hcTambah', f).onclick = function () {
          if (tabAktif === 'bn') {
            var bn = updBN();
            keranjang.push({ pid: 'banner', nama: bn.nama, varian: bn.varian, harga: bn.harga, qty: bn.qty, jenis: '', lembar: 0 });
            tutupDialog(); renderPOS(); toast('Banner masuk ke pesanan');
            return;
          }
          var b = hitungCepat(f); if (!b.length) return toast('Isi jumlah halaman dulu');
          b.forEach(function (n) { var ada = keranjang.find(function (i) { return i.nama === n.nama && i.varian === n.varian && i.harga === n.harga; }); if (ada) ada.qty += n.qty; else keranjang.push(n); });
          tutupDialog(); renderPOS(); toast('Masuk ke pesanan');
        };
      });
  }
  function renderTarif() {
    var T = D.tarif, f = $('#formTarif'); if (!f) return;
    var isi = function (k, lbl) { return '<label>' + lbl + '<input type="number" min="0" inputmode="numeric" data-t="' + k + '" value="' + k.split('.').reduce(function (o, x) { return o[x]; }, T) + '"></label>'; };
    $('#tarifIsi').innerHTML = '<div class="tarif-grid"><b>Fotocopy</b>' + isi('fotocopy.bw1', 'BW 1 sisi') + isi('fotocopy.bw2', 'BW 2 sisi') + isi('fotocopy.warna1', 'Warna 1 sisi') + isi('fotocopy.warna2', 'Warna 2 sisi') +
      '<b>Print</b>' + isi('print.bw1', 'BW 1 sisi') + isi('print.bw2', 'BW 2 sisi') + isi('print.warna1', 'Warna 1 sisi') + isi('print.warna2', 'Warna 2 sisi') +
      '<b>Lainnya</b>' + isi('f4', 'Tambahan F4 / lembar') + isi('laminasi', 'Laminasi A4') + '</div>' +
      '<p class="redup kecil">Jilid (satu per baris, format <code>Nama:harga</code>)</p><textarea id="tarifJilid" rows="5">' + esc(T.jilid.map(function (j) { return j[0] + ':' + j[1]; }).join('\n')) + '</textarea>';
  }

  // ---------- Event ----------
  function ikatEvent() {
    var pad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'hapus'];
    $('#padPin').innerHTML = pad.map(function (k) { return k ? '<button data-k="' + k + '" aria-label="' + (k === 'hapus' ? 'Hapus' : k) + '">' + (k === 'hapus' ? '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z"/><path d="M13 9l5 6M18 9l-5 6"/></svg>' : k) + '</button>' : '<span></span>'; }).join('');
    $('#padPin').onclick = function (e) { var b = e.target.closest('[data-k]'); if (b) ketikPin(b.dataset.k); };
    document.addEventListener('keydown', function (e) { if (!$('#layarMasuk').hidden) { if (/^\d$/.test(e.key)) ketikPin(e.key); if (e.key === 'Backspace') ketikPin('hapus'); } });

    $('#navBawah').innerHTML = $$('.samping .nav').map(function (b) { return b.outerHTML; }).join('');
    document.addEventListener('click', function (e) { var n = e.target.closest('.nav'); if (n) buka(n.dataset.hal); });
    $('#btnKeluar').onclick = function () { pengguna = null; keranjang = []; try { sessionStorage.removeItem('kasir-sesi'); } catch (er) { } tampilMasuk(); };

    $('#cariProduk').oninput = debounce(renderPOS, 100);
    $('#cariProduk').onkeydown = function (e) {
      if (e.key !== 'Enter') return;
      var q = this.value.trim().toLowerCase(); if (!q) return;
      var p = D.produk.find(function (x) { return x.barcode && x.barcode.toLowerCase() === q; });
      if (p) { e.preventDefault(); this.value = ''; renderPOS(); pilihVarian(p); toast('Scan: ' + p.nama); }
    };
    if ($('#btnScanCam')) $('#btnScanCam').onclick = function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Kamera tidak tersedia di browser ini');
      var stream = null, raf = 0;
      function hentikan() { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      var dlg = dialog('<h3>Scan barcode</h3><video id="scanVid" autoplay playsinline muted class="scan-video"></video><p class="redup kecil" id="scanStatus">Mengarahkan kamera ke barcode produk…</p><div class="dlg-aksi"><button class="tombol" value="batal">Tutup</button></div>', function (f) {
        var vid = $('#scanVid', f), st = $('#scanStatus', f);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
          stream = s; vid.srcObject = s;
          if (!('BarcodeDetector' in window)) { st.textContent = 'Browser ini belum mendukung BarcodeDetector otomatis. Gunakan scanner USB pada kolom cari.'; return; }
          var det = new BarcodeDetector();
          function loop() {
            if (!dlg.open) return hentikan();
            if (vid.readyState >= 2) {
              det.detect(vid).then(function (codes) {
                if (codes && codes.length) {
                  var kode = (codes[0].rawValue || '').trim().toLowerCase();
                  var p = D.produk.find(function (x) { return x.barcode && x.barcode.toLowerCase() === kode; });
                  if (p) { hentikan(); tutupDialog(); pilihVarian(p); toast('Scan: ' + p.nama); return; }
                  st.textContent = 'Terdeteksi: ' + codes[0].rawValue + ' (belum terdaftar di produk)';
                }
              }).catch(function () {});
            }
            raf = requestAnimationFrame(loop);
          }
          raf = requestAnimationFrame(loop);
        }).catch(function () { st.textContent = 'Izin kamera ditolak atau tidak tersedia.'; });
      });
      dlg.addEventListener('close', hentikan, { once: true });
    };
    var promptPasang = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); promptPasang = e;
      if ($('#btnPasang')) $('#btnPasang').hidden = false;
    });
    if ($('#btnPasang')) $('#btnPasang').onclick = function () {
      if (!promptPasang) return;
      promptPasang.prompt();
      promptPasang.userChoice.then(function () { promptPasang = null; $('#btnPasang').hidden = true; });
    };
    $('#chipKategori').onclick = function (e) { var c = e.target.closest('.chip'); if (c) { katAktif = c.dataset.k; renderPOS(); } };
    $('#gridProduk').onclick = function (e) { var k = e.target.closest('.kartu-produk'); if (k) pilihVarian(D.produk.find(function (p) { return p.id === k.dataset.id; })); };
    $('#kerDaftar').onclick = function (e) {
      var kh = e.target.closest('[data-harga]');
      if (kh) {
        var idxH = +kh.dataset.harga, ith = keranjang[idxH];
        dialogAngka('Ubah harga satuan', ith.nama + ' (' + ith.varian + ')', ith.harga, 0, function (nh) {
          ith.harga = nh; ith.grosirAktif = false; renderKeranjang(); toast('Harga disesuaikan');
        });
        return;
      }
      var kt = e.target.closest('[data-ketik]');
      if (kt) {
        var idx = +kt.dataset.ketik, itk = keranjang[idx], pk = D.produk.find(function (x) { return x.id === itk.pid; });
        dialogAngka('Ubah jumlah', itk.nama + ' (' + itk.varian + ')' + (itk.jenis ? ' dalam lembar' : ''), itk.qty, 0, function (nq) {
          if (pk && !tanpaStok(pk) && nq > pk.stok) return toast('Stok tidak cukup (sisa ' + pk.stok + ')');
          itk.qty = nq; if (!nq) keranjang.splice(idx, 1); else terapkanGrosir(itk); segarkanBadgeKartu();
        });
        return;
      }
      var b = e.target.closest('[data-n]'); if (!b) return;
      var it = keranjang[+b.dataset.n], d = +b.dataset.d;
      if (d > 0) { var p = D.produk.find(function (x) { return x.id === it.pid; }); if (p && sisaStok(p) <= 0) return toast('Stok tidak cukup'); }
      it.qty += d; if (it.qty <= 0) keranjang.splice(+b.dataset.n, 1); else terapkanGrosir(it);
      segarkanBadgeKartu();
    };
    $('#inDiskon').oninput = renderKeranjang; $('#tipeDiskon').onchange = renderKeranjang;
    $('#btnKosongkan').onclick = function () { keranjang = []; telpAktif = ''; if ($('#inPelanggan')) $('#inPelanggan').value = ''; segarkanBadgeKartu(); };
    if ($('#btnPelanggan')) $('#btnPelanggan').onclick = function () { dialogPelanggan(); };
    if ($('#btnBiaya')) $('#btnBiaya').onclick = dialogBiaya;
    $('#btnTahan').onclick = dialogTahan;
    $('#btnBayar').onclick = dialogBayar;
    $('#btnHitung').onclick = dialogHitung;
    if ($('#shiftIndikator')) $('#shiftIndikator').onclick = dialogShift;
    if ($('#btnAlatStok') && $('#menuAlatStok')) {
      $('#btnAlatStok').onclick = function (e) {
        e.stopPropagation();
        var mn = $('#menuAlatStok'), buk = mn.hidden;
        mn.hidden = !buk; this.setAttribute('aria-expanded', buk ? 'true' : 'false');
      };
      document.addEventListener('click', function () {
        if ($('#menuAlatStok') && !$('#menuAlatStok').hidden) { $('#menuAlatStok').hidden = true; $('#btnAlatStok').setAttribute('aria-expanded', 'false'); }
      });
    }
    $('#btnTema').onclick = function () {
      var cur = document.documentElement.getAttribute('data-mode') === 'gelap' ? 'terang' : 'gelap';
      document.documentElement.setAttribute('data-mode', cur);
      try { localStorage.setItem('kasir-mode', cur); } catch (e) { }
      perbaruiIkonTema();
      setTimeout(hitungTeksBagian, 0);
      toast('Mode ' + cur);
    };
    document.addEventListener('keydown', function (e) {
      if ($('#layarMasuk').hidden && !$('#dlg').open) {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if ((e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
          if ($('#hal-kasir').classList.contains('aktif')) { e.preventDefault(); $('#cariProduk').focus(); }
        } else if ((e.key === 'F9' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) && $('#hal-kasir').classList.contains('aktif') && keranjang.length) {
          e.preventDefault(); dialogBayar();
        } else if (e.key === 'Escape') {
          tutupDropdown(); $('#panelKeranjang').classList.remove('buka');
        }
      }
    });
    $('#formTarif').onsubmit = function (e) {
      e.preventDefault();
      $$('[data-t]', e.target).forEach(function (i) { var k = i.dataset.t.split('.'), o = D.tarif; while (k.length > 1) o = o[k.shift()]; o[k[0]] = Math.max(0, parseInt(i.value, 10) || 0); });
      var jl = $('#tarifJilid').value.split('\n').map(function (b) { var a = b.split(':'); return [a[0].trim(), Math.max(0, parseInt(a[1], 10) || 0)]; }).filter(function (j) { return j[0]; });
      D.tarif.jilid = jl.length ? jl : tarifBawaan().jilid; simpan(); toast('Tarif disimpan');
    };
    $('#fabKeranjang').onclick = function () { $('#panelKeranjang').classList.toggle('buka'); };
    document.addEventListener('click', function (e) {
      var pk = $('#panelKeranjang');
      if (pk.classList.contains('buka') && !pk.contains(e.target) && !e.target.closest('#fabKeranjang') && !e.target.closest('dialog')) pk.classList.remove('buka');
    });

    $('#cariKelola').oninput = debounce(renderKelola, 120);
    if ($('#filterKatProduk')) $('#filterKatProduk').onchange = renderKelola;
    $('#btnTambahProduk').onclick = function () { formProduk(null); };
    if ($('#btnStokKertas')) $('#btnStokKertas').onclick = dialogStokKertas;
    if ($('#btnOpname')) $('#btnOpname').onclick = dialogOpname;
    $('#btnKategori').onclick = formKategori;
    $('#tabelProduk').onclick = function (e) {
      var sr = e.target.closest('[data-sort]');
      if (sr) {
        if (sortKol === sr.dataset.sort) sortArah = -sortArah; else { sortKol = sr.dataset.sort; sortArah = 1; }
        renderKelola(); return;
      }
      var ed = e.target.closest('[data-edit]'), st = e.target.closest('[data-stok]'), bc = e.target.closest('[data-barcode]');
      if (bc) dialogBarcode(D.produk.find(function (p) { return p.id === bc.dataset.barcode; }));
      if (ed) formProduk(D.produk.find(function (p) { return p.id === ed.dataset.edit; }));
      if (st) {
        var p = D.produk.find(function (x) { return x.id === st.dataset.stok; });
        dialogAngka('Tambah stok', 'Tambah stok ' + p.nama + ' sebanyak:', 10, 1, function (n) {
          p.stok = Math.max(0, p.stok + n); simpan(); renderKelola(); toast('Stok jadi ' + p.stok);
        });
      }
    };

    $('#filterTanggal').onchange = renderRiwayat;
    if ($('#cariRiwayat')) $('#cariRiwayat').oninput = debounce(function () { batasRiwayat = 50; renderRiwayat(); }, 120);
    if ($('#filterMetode')) $('#filterMetode').onchange = renderRiwayat;
    if ($('#filterStatus')) $('#filterStatus').onchange = renderRiwayat;
    if ($('#btnHariIniTrx')) $('#btnHariIniTrx').onclick = function () { $('#filterTanggal').value = tglKey(new Date()); renderRiwayat(); };
    if ($('#btnResetTgl')) $('#btnResetTgl').onclick = function () { $('#filterTanggal').value = ''; if ($('#cariRiwayat')) $('#cariRiwayat').value = ''; if ($('#filterMetode')) { $('#filterMetode').value = ''; sinkronDropdown($('#filterMetode')); } if ($('#filterStatus')) { $('#filterStatus').value = ''; sinkronDropdown($('#filterStatus')); } terpilihTrx = {}; renderRiwayat(); };
    $('#btnEksporTrx').onclick = function () { eksporTrx(); };
    if ($('#cekSemuaTrx')) $('#cekSemuaTrx').onchange = function () {
      var on = this.checked;
      trxFilter().slice(0, 200).forEach(function (x) { if (on) terpilihTrx[x.id] = true; else delete terpilihTrx[x.id]; });
      renderRiwayat();
    };
    if ($('#btnEksporTerpilih')) $('#btnEksporTerpilih').onclick = function () {
      var list = D.transaksi.filter(function (x) { return terpilihTrx[x.id]; });
      if (list.length) { eksporTrx(list); toast(list.length + ' transaksi diekspor'); }
    };
    if ($('#btnHapusTerpilih')) $('#btnHapusTerpilih').onclick = function () {
      var ids = Object.keys(terpilihTrx).filter(function (id) { return terpilihTrx[id]; });
      if (!ids.length) return;
      dialogKonfirm('Hapus transaksi terpilih', 'Batalkan dan hapus ' + ids.length + ' transaksi terpilih? Stok barang ATK akan dikembalikan.', 'Hapus ' + ids.length + ' transaksi', true, function () {
        hapusDaftarTrx(ids); toast(ids.length + ' transaksi dihapus');
      });
    };
    if ($('#btnHapusSemuaTrx')) $('#btnHapusSemuaTrx').onclick = function () {
      var list = trxFilter(); if (!list.length) return;
      var terfilter = $('#filterTanggal').value || ($('#cariRiwayat') && $('#cariRiwayat').value.trim()) || ($('#filterMetode') && $('#filterMetode').value);
      dialogKonfirm('Hapus semua riwayat', 'Hapus ' + list.length + ' transaksi' + (terfilter ? ' yang tampil saat ini' : '') + '? Stok barang ATK akan dikembalikan dan tindakan ini tidak bisa dibatalkan.', 'Ya, hapus semua', true, function () {
        hapusDaftarTrx(list.map(function (x) { return x.id; })); toast(list.length + ' transaksi dihapus');
      });
    };
    $('#daftarTrx').onclick = function (e) {
      var ck = e.target.closest('[data-cek]');
      if (ck) {
        if (ck.checked) terpilihTrx[ck.dataset.cek] = true; else delete terpilihTrx[ck.dataset.cek];
        var card = ck.closest('.trx'); if (card) card.classList.toggle('dipilih', ck.checked);
        perbaruiBarRiwayat(trxFilter());
        return;
      }
      var dt = e.target.closest('[data-detail]'), ul = e.target.closest('[data-ulangi]'), c = e.target.closest('[data-cetak]'), h = e.target.closest('[data-hapus]');
      var wa = e.target.closest('[data-wa]'), st = e.target.closest('[data-status]'), ln = e.target.closest('[data-lunas]');
      if (wa) kirimWA(D.transaksi.find(function (x) { return x.id === wa.dataset.wa; }));
      if (st) {
        var tx = D.transaksi.find(function (x) { return x.id === st.dataset.status; });
        var urut = ['antre', 'proses', 'siap', 'selesai'];
        var nx = urut[(urut.indexOf(tx.status || 'selesai') + 1) % urut.length];
        if (nx === 'selesai' && tx.sisa > 0) return toast('Lunasi DP dulu sebelum menyelesaikan');
        tx.status = nx; simpan(); renderRiwayat(); toast('Status: ' + nx);
      }
      if (ln) {
        var tx2 = D.transaksi.find(function (x) { return x.id === ln.dataset.lunas; });
        dialogKonfirm('Lunasi tagihan', 'Tandai sisa tagihan ' + rp(tx2.sisa) + ' untuk ' + tx2.id + ' sebagai LUNAS?', 'Ya, lunasi', false, function () {
          tx2.bayar += tx2.sisa; tx2.sisa = 0; tx2.status = 'selesai';
          catatAudit('Pelunasan ' + tx2.id); simpan(); renderRiwayat(); toast('Transaksi lunas');
        });
      }
      if (dt) dialogDetailTrx(D.transaksi.find(function (x) { return x.id === dt.dataset.detail; }));
      if (ul) ulangiTrx(D.transaksi.find(function (x) { return x.id === ul.dataset.ulangi; }));
      if (c) cetak(D.transaksi.find(function (x) { return x.id === c.dataset.cetak; }));
      if (h) {
        var x = D.transaksi.find(function (t) { return t.id === h.dataset.hapus; });
        dialogKonfirm('Batalkan transaksi', 'Batalkan transaksi ' + x.id + '? Stok produk akan dikembalikan.', 'Ya, batalkan', true, function () {
          hapusDaftarTrx([x.id]); toast('Transaksi dibatalkan');
        });
      }
    };

    $('#segLaporan').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; modeLap = b.dataset.mode; $$('#segLaporan button').forEach(function (x) { x.classList.toggle('aktif', x === b); }); renderLaporan(); };
    $('#tglLaporan').onchange = renderLaporan;
    if ($('#btnShift')) $('#btnShift').onclick = dialogShift;
    if ($('#btnCounter')) $('#btnCounter').onclick = dialogCounter;
    if ($('#btnPengeluaran')) $('#btnPengeluaran').onclick = dialogPengeluaran;
    if ($('#daftarPengeluaran')) $('#daftarPengeluaran').onclick = function (e) {
      var b = e.target.closest('[data-hpeng]');
      if (b) dialogKonfirm('Hapus pengeluaran', 'Hapus catatan pengeluaran ini?', 'Hapus', true, function () {
        D.pengeluaran = D.pengeluaran.filter(function (p) { return p.id !== b.dataset.hpeng; });
        simpan(); renderLaporan(); toast('Pengeluaran dihapus');
      });
    };
    if ($('#btnEksporLaporan')) $('#btnEksporLaporan').onclick = function () {
      var inp = $('#tglLaporan'), t = new Date((inp.value || tglKey(new Date())) + 'T00:00:00');
      var list = D.transaksi.filter(function (x) { var d = new Date(x.waktu); return modeLap === 'hari' ? tglKey(d) === inp.value : d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth(); });
      var r = ringkasan(list);
      var rows = [['Periode', inp.value || tglKey(new Date()), 'Mode', modeLap], ['Omzet', r.omzet], ['Transaksi', r.trx], ['Item', r.item], ['Tunai', r.metode.tunai], ['QRIS', r.metode.qris], ['Transfer', r.metode.transfer], ['Lembar BW', r.lembar.bw], ['Lembar Warna', r.lembar.warna], [], ['Layanan', 'Qty', 'Nilai']].concat(r.top.map(function (p) { return [p.nama, p.qty, p.nilai]; }));
      unduh('laporan-' + modeLap + '-' + (inp.value || tglKey(new Date())) + '.csv', '\uFEFF' + rows.map(function (rw) { return rw.map(csvSel).join(','); }).join('\n'), 'text/csv');
    };

    if ($('#fLogoToko')) $('#fLogoToko').onchange = function () {
      var fl = this.files[0]; if (!fl) return;
      kecilkanFoto(fl, function (u) { D.toko.logo = u; simpan(); pasangLogo(true); renderAtur(); toast('Logo toko diperbarui (sinkron ke nota)'); });
    };
    if ($('#fLogoHapus')) $('#fLogoHapus').onclick = function () {
      D.toko.logo = ''; simpan(); pasangLogo(true); renderAtur(); toast('Logo toko dikembalikan ke bawaan');
    };
    $('#formToko').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      var namaLama = D.toko.nama;
      ['nama', 'alamat', 'telp', 'footer', 'rekening'].forEach(function (k) { D.toko[k] = f.elements[k].value.trim(); });
      if (D.toko.nama !== namaLama) D.toko.namaDariTema = false;
      simpan(); $('#namaTokoNav').textContent = D.toko.nama; toast('Profil toko disimpan');
    };
    $('#formKasir').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      D.kasir.push({ id: uid(), nama: f.elements.nama.value.trim(), pin: f.elements.pin.value, peran: f.elements.peran.value });
      simpan(); f.reset(); sinkronDropdown(f.elements.peran); renderAtur(); toast('Kasir ditambahkan');
    };
    $('#daftarKasirAtur').onclick = function (e) {
      var b = e.target.closest('[data-hk]');
      if (b) dialogKonfirm('Hapus kasir', 'Yakin ingin menghapus akun kasir ini?', 'Hapus', true, function () { D.kasir = D.kasir.filter(function (k) { return k.id !== b.dataset.hk; }); simpan(); renderAtur(); toast('Kasir dihapus'); });
    };
    if ($('#formAturan')) $('#formAturan').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      D.aturan.pembulatan = parseInt(f.elements.pembulatan.value, 10) || 0;
      D.aturan.ukuranStruk = f.elements.ukuranStruk.value || '58mm';
      D.aturan.batasStok = Math.max(1, parseInt(f.elements.batasStok.value, 10) || 5);
      if (f.elements.autoLock) D.aturan.autoLock = parseInt(f.elements.autoLock.value, 10) || 0;
      D.aturan.qrisStatis = f.elements.qrisStatis.value.trim();
      catatAudit('Ubah aturan operasional'); simpan(); toast('Aturan disimpan');
    };
    if ($('#btnArsipTrx')) $('#btnArsipTrx').onclick = function () {
      var batas = Date.now() - 90 * 86400000;
      var lama = D.transaksi.filter(function (x) { return new Date(x.waktu).getTime() < batas && !(x.sisa > 0); });
      if (!lama.length) return toast('Tidak ada transaksi lunas > 90 hari');
      dialogKonfirm('Bersihkan transaksi lama', 'Hapus ' + lama.length + ' transaksi lunas yang lebih dari 90 hari? (Disarankan Backup JSON dulu)', 'Ya, bersihkan', true, function () {
        var set = {}; lama.forEach(function (x) { set[x.id] = true; });
        D.transaksi = D.transaksi.filter(function (x) { return !set[x.id]; });
        catatAudit('Bersihkan ' + lama.length + ' trx > 90 hari');
        simpan(); renderAtur(); toast(lama.length + ' transaksi lama dibersihkan');
      });
    };
    var lockTimer = null;
    function resetLock() {
      clearTimeout(lockTimer);
      var m = (D && D.aturan && D.aturan.autoLock) || 0;
      if (m > 0 && pengguna) lockTimer = setTimeout(function () {
        if ($('#layarMasuk').hidden) { pengguna = null; try { sessionStorage.removeItem('kasir-sesi'); } catch (e) {} tampilMasuk(); toast('Layar dikunci otomatis'); }
      }, m * 60000);
    }
    ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, resetLock, { passive: true }); });
    $('#btnBackup').onclick = function () { if (D.aturan) { D.aturan.lastBackup = Date.now(); simpan(); } unduh('backup-kasir-' + tglKey(new Date()) + '.json', JSON.stringify(D, null, 1), 'application/json'); };
    $('#fileBackup').onchange = function () {
      bacaFile(this, function (t) {
        try {
          var x = JSON.parse(t); if (!x.produk || !x.kasir) throw 0;
          dialogKonfirm('Pulihkan backup', 'Semua data saat ini akan ditimpa dengan isi berkas backup. Lanjutkan?', 'Pulihkan', true, function () { D = x; simpan(); simpanPelanggan(); toast('Backup dipulihkan'); tampilMasuk(); });
        } catch (er) { toast('File backup tidak valid'); }
      });
    };
    $('#btnEksporProduk').onclick = eksporProdukCSV;
    $('#fileCsv').onchange = function () { bacaFile(this, function (t) { toast(imporProdukCSV(t) + ' produk diimpor'); }); };
    $('#btnContoh').onclick = function () {
      dialogKonfirm('Isi data contoh', 'Data saat ini akan diganti dengan data contoh bawaan. Lanjutkan?', 'Ya, ganti', true, function () { D = dataContoh(); simpan(); simpanPelanggan(); tampilMasuk(); });
    };
    $('#btnReset').onclick = function () {
      dialogKonfirm('Hapus semua data', 'Yakin ingin menghapus SEMUA data? Pastikan Anda sudah membuat backup terlebih dahulu.', 'Hapus semua', true, function () { D = dataKosong(); simpan(); simpanPelanggan(); toast('Data dikosongkan. PIN admin: 1234'); tampilMasuk(); });
    };
    if ($('#formGas')) $('#formGas').onsubmit = function (e) {
      e.preventDefault();
      D.aturan.gasUrl = ($('#gasUrl').value || '').trim();
      D.aturan.gasAuto = !!$('#gasAuto').checked;
      simpan(); renderAtur();
      toast(D.aturan.gasUrl ? 'Pengaturan GAS disimpan' : 'URL GAS dikosongkan');
    };
    if ($('#btnGasPush')) $('#btnGasPush').onclick = function () {
      var url = ($('#gasUrl') && $('#gasUrl').value.trim()) || (D.aturan && D.aturan.gasUrl);
      if (!url) return toast('Masukkan dan simpan URL Web App GAS terlebih dahulu');
      D.aturan.gasUrl = url;
      var st = $('#gasStatus'); if (st) st.textContent = 'Mengirim semua data ke Google Sheets...';
      gasKirim({ action: 'sync', data: D }, function (ok, res) {
        if (ok) {
          D.aturan.gasLastSync = Date.now(); simpan(); renderAtur();
          catatAudit('Push database ke Google Sheets');
          toast('Semua data berhasil dikirim ke Google Sheets');
        } else {
          if (st) st.textContent = 'Gagal Push: ' + ((res && res.error) || 'Periksa URL & izin Web App GAS (Anyone)');
          toast('Gagal sinkron ke Google Sheets');
        }
      });
    };
    if ($('#btnGasPull')) $('#btnGasPull').onclick = function () {
      var url = ($('#gasUrl') && $('#gasUrl').value.trim()) || (D.aturan && D.aturan.gasUrl);
      if (!url) return toast('Masukkan dan simpan URL Web App GAS terlebih dahulu');
      D.aturan.gasUrl = url;
      dialogKonfirm('Ambil data dari Google Sheets', 'Data lokal saat ini akan diganti dengan data terbaru dari Google Spreadsheet. Lanjutkan?', 'Ya, ambil (Pull)', true, function () {
        var st = $('#gasStatus'); if (st) st.textContent = 'Mengambil data dari Google Sheets...';
        gasAmbil(function (ok, res) {
          if (ok && res && res.data) {
            var nd = res.data;
            if (Array.isArray(nd.produk) && nd.produk.length) D.produk = nd.produk;
            if (Array.isArray(nd.transaksi)) D.transaksi = nd.transaksi;
            if (Array.isArray(nd.pelanggan)) D.pelanggan = nd.pelanggan;
            if (Array.isArray(nd.pengeluaran)) D.pengeluaran = nd.pengeluaran;
            if (nd.toko && nd.toko.nama) D.toko = nd.toko;
            if (Array.isArray(nd.kategori) && nd.kategori.length) D.kategori = nd.kategori;
            if (nd.tarif && nd.tarif.fotocopy) D.tarif = nd.tarif;
            if (nd.aturan) D.aturan = Object.assign(aturanBawaan(), nd.aturan, { gasUrl: url, gasAuto: !!D.aturan.gasAuto, gasLastSync: Date.now() });
            if (Array.isArray(nd.kasir) && nd.kasir.length) D.kasir = nd.kasir;
            if (nd.nomor) D.nomor = nd.nomor;
            simpan(); simpanPelanggan(); renderAtur(); renderPOS();
            catatAudit('Pull database dari Google Sheets');
            toast('Data berhasil diambil dari Google Sheets');
          } else {
            if (st) st.textContent = 'Gagal Pull: ' + ((res && res.error) || 'Periksa URL & izin Web App GAS');
            toast('Gagal mengambil data dari Google Sheets');
          }
        });
      });
    };
    if ($('#btnGasKode')) $('#btnGasKode').onclick = dialogKodeGas;
    if ($('#btnBuatAkun')) $('#btnBuatAkun').onclick = dialogBuatAkun;
    if ($('#btnGantiAkun')) $('#btnGantiAkun').onclick = dialogGantiAkun;
    if ($('#btnSandiAkun')) $('#btnSandiAkun').onclick = dialogSandiAkun;
    tingkatkanDropdown(document);
  }

  // ---------- Multi-Akun (Database Terpisah per User) ----------
  function dialogBuatAkun() {
    dialog('<h3>Buat akun &amp; database baru</h3>' +
      '<p class="redup kecil">Setiap akun memiliki database produk, transaksi, pelanggan, dan pengaturan Google Sheets yang terpisah.</p>' +
      '<form id="formBuatAkun" class="form">' +
      '<label>Nama Usaha / Toko<input name="nama" required placeholder="Mis. Fotocopy Maju Jaya"></label>' +
      '<label>Username Akun<input name="username" required pattern="[a-zA-Z0-9_-]{3,24}" placeholder="Mis. majujaya (huruf/angka, min 3)"></label>' +
      '<label>Password Akun (untuk keamanan ganti akun)<input name="sandi" type="password" minlength="4" required placeholder="Minimal 4 karakter"></label>' +
      '<label>PIN Admin (4 angka)<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" value="1234" required></label>' +
      '<label class="cek-semua" style="font-weight:500"><input type="checkbox" name="contoh" checked style="width:18px;height:18px;margin:0;flex:none"><span>Isi contoh layanan fotocopy siap pakai</span></label>' +
      '<div class="dlg-aksi"><button class="tombol" type="button" value="batal">Batal</button><button class="tombol utama" type="submit">Buat Akun &amp; Masuk</button></div>' +
      '</form>', function (f) {
        $('#formBuatAkun', f).onsubmit = function (e) {
          e.preventDefault();
          var fd = e.target;
          var nama = fd.nama.value.trim();
          var user = fd.username.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
          var sandi = fd.sandi.value;
          var pin = fd.pin.value.trim();
          if (user.length < 3) return toast('Username minimal 3 huruf/angka');
          if (sandi.length < 4) return toast('Password minimal 4 karakter');
          if (!/^\d{4}$/.test(pin)) return toast('PIN harus 4 angka');
          var reg = muatAkunReg();
          if (reg.daftar.some(function (a) { return a.username === user; })) return toast('Username sudah dipakai');
          var id = 'u_' + Date.now().toString(36);
          var salt = Math.random().toString(36).slice(2, 10);
          reg.daftar.push({ id: id, username: user, nama: nama, salt: salt, hash: hashSandi(sandi, salt) });
          reg.aktif = id;
          simpanAkunReg(reg);
          setKunciAkun(id);
          D = fd.contoh.checked ? dataContoh() : dataKosong();
          D.toko.nama = nama; D.toko.namaDariTema = false;
          D.kasir = [{ id: 'k1', nama: 'Admin', pin: pin, peran: 'admin' }];
          D.aturan = aturanBawaan();
          simpan(); simpanPelanggan();
          tutupDialog(); pasangLogo(true);
          toast('Akun @' + user + ' dibuat dengan database baru');
          masuk(D.kasir[0]);
        };
      });
  }
  function dialogGantiAkun() {
    var reg = muatAkunReg();
    dialog('<h3>Pilih akun / database</h3>' +
      '<p class="redup kecil">Pilih akun untuk berpindah database. Akun berpassword akan meminta verifikasi sandi.</p>' +
      '<ul class="trx-detail-list" id="listAkun">' + reg.daftar.map(function (a) {
        var aktif = a.id === akunAktifId;
        return '<li style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<span><b>' + esc(a.nama) + '</b> <span class="redup kecil">@' + esc(a.username) + '</span>' + (a.hash ? ' <span class="lencana">Terkunci</span>' : '') + '</span>' +
          (aktif ? '<span class="lencana biru">Aktif</span>' : '<button class="tombol kecil" type="button" data-pindah="' + a.id + '">Masuk</button>') +
          '</li>';
      }).join('') + '</ul>' +
      '<div id="boxSandiAkun" hidden class="form" style="margin-top:12px">' +
      '<label>Masukkan Password untuk <b id="namaAkunTarget"></b><input id="inSandiPindah" type="password" placeholder="Password akun"></label>' +
      '<div class="dlg-aksi"><button class="tombol utama" type="button" id="btnVerifPindah">Buka Database</button></div>' +
      '</div>' +
      '<div class="dlg-aksi"><button class="tombol" value="ok">Tutup</button></div>', function (f) {
        var targetAcc = null;
        function aktifkanAkun(acc) {
          reg.aktif = acc.id; simpanAkunReg(reg);
          setKunciAkun(acc.id);
          pengguna = null; keranjang = [];
          try { sessionStorage.removeItem('kasir-sesi'); } catch (e) { }
          muat(); pasangLogo(true); tutupDialog(); tampilMasuk();
          toast('Berpindah ke database ' + acc.nama);
        }
        $$('[data-pindah]', f).forEach(function (b) {
          b.onclick = function () {
            var acc = reg.daftar.find(function (a) { return a.id === b.dataset.pindah; });
            if (!acc) return;
            if (!acc.hash) return aktifkanAkun(acc);
            targetAcc = acc;
            $('#namaAkunTarget', f).textContent = acc.nama + ' (@' + acc.username + ')';
            $('#boxSandiAkun', f).hidden = false;
            $('#inSandiPindah', f).value = '';
            $('#inSandiPindah', f).focus();
          };
        });
        if ($('#btnVerifPindah', f)) $('#btnVerifPindah', f).onclick = function () {
          if (!targetAcc) return;
          var pw = $('#inSandiPindah', f).value;
          if (hashSandi(pw, targetAcc.salt) !== targetAcc.hash) return toast('Password akun salah');
          aktifkanAkun(targetAcc);
        };
      });
  }
  function dialogSandiAkun() {
    var reg = muatAkunReg();
    var acc = reg.daftar.find(function (a) { return a.id === akunAktifId; });
    if (!acc) return;
    dialog('<h3>Keamanan Password Akun</h3>' +
      '<p class="redup kecil">Password ini melindungi database <b>' + esc(acc.nama) + ' (@' + esc(acc.username) + ')</b> saat orang lain mencoba berpindah akun.</p>' +
      '<form id="formSandiAkun" class="form">' +
      (acc.hash ? '<label>Password lama<input name="lama" type="password" required></label>' : '') +
      '<label>Password baru (min 4 karakter)<input name="baru" type="password" minlength="4" required></label>' +
      '<div class="dlg-aksi"><button class="tombol" type="button" value="batal">Batal</button><button class="tombol utama" type="submit">Simpan Password</button></div>' +
      '</form>', function (f) {
        $('#formSandiAkun', f).onsubmit = function (e) {
          e.preventDefault();
          var fd = e.target;
          if (acc.hash && hashSandi(fd.lama.value, acc.salt) !== acc.hash) return toast('Password lama salah');
          var baru = fd.baru.value;
          if (baru.length < 4) return toast('Password minimal 4 karakter');
          acc.salt = Math.random().toString(36).slice(2, 10);
          acc.hash = hashSandi(baru, acc.salt);
          acc.nama = D.toko.nama || acc.nama;
          simpanAkunReg(reg); tutupDialog();
          toast('Password akun diperbarui');
        };
      });
  }

  // ---------- Sinkronisasi Google Sheets (GAS) ----------
  function gasKirim(payload, cb) {
    var url = D && D.aturan && D.aturan.gasUrl;
    if (!url) { if (cb) cb(false, { error: 'URL kosong' }); return; }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (cb) cb(!!(j && j.ok), j);
    }).catch(function (err) {
      if (cb) cb(false, { error: String(err) });
    });
  }
  function gasAmbil(cb) {
    var url = D && D.aturan && D.aturan.gasUrl;
    if (!url) { if (cb) cb(false, { error: 'URL kosong' }); return; }
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    fetch(url + sep + 'action=pull&_=' + Date.now()).then(function (r) { return r.json(); }).then(function (j) {
      if (cb) cb(!!(j && j.ok), j);
    }).catch(function (err) {
      if (cb) cb(false, { error: String(err) });
    });
  }
  function dialogKodeGas() {
    var kode = [
      'function doGet(e){var p=(e&&e.parameter)||{},a=p.action||"pull";if(a==="ping")return jsonRes({ok:true,msg:"GAS Kasir aktif"});if(a==="pull")return jsonRes({ok:true,data:bacaSemua_()});return jsonRes({ok:false,error:"Aksi tidak dikenal"});}',
      'function doPost(e){try{var b=JSON.parse((e&&e.postData&&e.postData.contents)||"{}");if(b.action==="sync"){tulisSemua_(b.data||{});return jsonRes({ok:true});}if(b.action==="add_trx"&&b.trx){tambahBarisTrx_(b.trx);return jsonRes({ok:true});}return jsonRes({ok:false,error:"Aksi tidak dikenal"});}catch(err){return jsonRes({ok:false,error:String(err)});}}',
      'function jsonRes(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}',
      '/* Salin file lengkap dari folder: gas/Code.gs di proyek Anda */'
    ].join('\n');
    dialog('<h3>Panduan Setup Google Sheets (GAS)</h3>' +
      '<ol class="kecil" style="padding-left:18px;margin:0 0 12px;line-height:1.6">' +
      '<li>Buka <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> untuk membuat Google Spreadsheet baru.</li>' +
      '<li>Klik menu <b>Ekstensi → Apps Script</b>, lalu hapus kode bawaan.</li>' +
      '<li>Buka berkas <code>gas/Code.gs</code> di folder aplikasi ini, salin seluruh isinya, lalu tempel ke editor Apps Script &amp; Simpan.</li>' +
      '<li>Klik <b>Terapkan (Deploy) → Deployment baru</b> → pilih jenis <b>Aplikasi Web</b>.</li>' +
      '<li>Atur <i>Jalankan sebagai</i>: <b>Saya</b>, dan <i>Yang memiliki akses</i>: <b>Siapa saja (Anyone)</b>.</li>' +
      '<li>Salin URL Web App (<code>.../exec</code>) ke kolom URL di pengaturan ini, lalu klik <b>Simpan Pengaturan GAS</b>.</li>' +
      '</ol>' +
      '<textarea id="gasKodeBox" rows="5" readonly style="font-family:monospace;font-size:12px">' + esc(kode) + '</textarea>' +
      '<div class="dlg-aksi"><button class="tombol" type="button" id="btnSalinGas">Salin Ringkasan</button><button class="tombol utama" value="ok">Tutup</button></div>', function (f) {
        if ($('#btnSalinGas', f)) $('#btnSalinGas', f).onclick = function () {
          var box = $('#gasKodeBox', f);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(box.value).then(function () { toast('Ringkasan disalin. Gunakan gas/Code.gs untuk kode penuh'); });
          } else { box.select(); document.execCommand('copy'); toast('Disalin'); }
        };
      });
  }

  // ---------- Mulai ----------
  setKunciAkun(muatAkunReg().aktif);
  muat(); ikatEvent(); pasangLogo();
  var sesi = null; try { sesi = sessionStorage.getItem('kasir-sesi'); } catch (e) { }
  var k = sesi && D.kasir.find(function (x) { return x.id === sesi; });
  if (k) masuk(k); else if (/[?&]demo\b/.test(location.search)) { masuk(D.kasir[0]);[[0, 0, 24], [4, 0, 6], [7, 3, 1]].forEach(function (x) { var p = D.produk[x[0]]; if (p) { tambahKeKeranjang(p, p.varian[x[1]]); keranjang[keranjang.length - 1].qty = x[2]; } }); renderPOS(); } else tampilMasuk();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () { });

  // untuk pengujian
  window.__kasir = { hitung: hitung, ringkasan: ringkasan, parseCSV: parseCSV, imporProdukCSV: imporProdukCSV, data: function () { return D; }, tema: terapkanTema, keranjang: function () { return keranjang; }, tambah: tambahKeKeranjang, hitungLembar: hitungLembar, hitungCepat: hitungCepat, selesaikan: selesaikan };
})();
