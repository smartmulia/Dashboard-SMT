# AUDIT PRE-DEPLOYMENT — Dashboard SMT

**Proyek:** Dashboard Serba Mas Tentram — Elektronik & Katalog Emas  
**Tanggal Audit:** 6 Juli 2026  
**Auditor:** QA/QC Team  
**Versi:** 1.0.0  
**Status:** ❌ CONDITIONAL FAIL — Perbaikan kritis diperlukan sebelum Go-Live

---

## RINGKASAN EKSEKUTIF

Dashboard SMT adalah aplikasi web internal untuk manajemen barang elektronik, invoice penjualan, dan katalog emas. Audit ini mencakup evaluasi menyeluruh terhadap aspek keamanan, fungsionalitas, performa, kualitas kode, dan kesiapan operasional sebelum deployment ke production.

### Skor Keseluruhan

| Kategori | Skor | Status |
|----------|------|--------|
| Business Logic | 5/10 | ❌ Perlu Perbaikan Kritis |
| Security | 6/10 | ⚠️ Perlu Perbaikan |
| Functionality | 8/10 | ✅ Baik |
| Performance | 7/10 | ⚠️ Perlu Optimasi |
| Code Quality | 7/10 | ✅ Cukup Baik |
| Deployment Readiness | 5/10 | ❌ Belum Siap |
| Documentation | 8/10 | ✅ Baik |

---

## 1. AUDIT KEAMANAN (SECURITY)

### 1.1 Autentikasi & Otorisasi

| Item | Status | Catatan |
|------|--------|---------|
| JWT Implementation | ✅ PASS | Token berbasis JWT dengan expiry |
| Password Hashing | ✅ PASS | bcryptjs dengan salt rounds 10 |
| Role-Based Access Control | ✅ PASS | 4 role dengan hierarchy check |
| Token Validation | ✅ PASS | Middleware verifikasi setiap request |
| User Active Check | ✅ PASS | User nonaktif otomatis ditolak |

### 1.2 Temuan Kritis Keamanan

| # | Severity | Temuan | Detail | Rekomendasi |
|---|----------|--------|--------|-------------|
| S-01 | 🔴 HIGH | JWT Secret Lemah | `.env.example` menunjukkan secret default yang lemah ("your-super-secret-jwt-key-change-in-production") | Gunakan secret minimal 64 karakter random. Pastikan `.env` production menggunakan secret yang kuat. |
| S-02 | 🔴 HIGH | Tidak Ada Rate Limiting | Endpoint login dan API tidak memiliki rate limiting | Implementasi `express-rate-limit` pada endpoint `/api/auth/login` (max 5 attempt/15 menit) dan global API (100 req/menit) |
| S-03 | 🔴 HIGH | CORS Terlalu Permisif | `FRONTEND_URL` fallback ke `localhost:5173` jika env tidak di-set | Wajib set `FRONTEND_URL` di production. Hapus fallback localhost. |
| S-04 | 🟡 MEDIUM | Tidak Ada Helmet.js | Tidak ada security headers (X-Frame-Options, X-Content-Type-Options, HSTS, dll.) | Install dan konfigurasi `helmet` middleware |
| S-05 | 🟡 MEDIUM | Request Body Size 50MB | `express.json({ limit: '50mb' })` terlalu besar, rentan DoS | Turunkan ke 10MB untuk JSON, pisahkan limit untuk upload file |
| S-06 | 🟡 MEDIUM | Tidak Ada Input Sanitization | Meskipun ada `express-validator` di dependencies, tidak digunakan di controller | Implementasi validasi input menggunakan express-validator pada semua endpoint POST/PUT |
| S-07 | 🟡 MEDIUM | Token Expiry Terlalu Lama | JWT_EXPIRES_IN default "7d" tanpa refresh token mechanism | Implementasi refresh token atau turunkan expiry ke 4-8 jam untuk production |
| S-08 | 🟡 MEDIUM | File Upload Tanpa Validasi Tipe | Multer hanya limit ukuran (10MB), tidak filter tipe file | Tambahkan `fileFilter` untuk whitelist ekstensi (.xlsx, .xls) pada import dan (.jpg, .jpeg, .png, .webp) pada katalog |
| S-09 | 🟢 LOW | Tidak Ada CSRF Protection | SPA dengan JWT di header relatif aman, tapi bisa diperkuat | Pertimbangkan SameSite cookie atau custom header validation |
| S-10 | 🟢 LOW | Error Message Terlalu Verbose | `err.message` dikirim langsung ke client | Kirim generic message di production, log detail di server |

### 1.3 Keamanan Data

| Item | Status | Catatan |
|------|--------|---------|
| Password tidak di-expose via API | ✅ PASS | Select explicit fields di getUsers |
| COGS tersembunyi untuk role USER | ✅ PASS | Logic filter di itemController |
| Audit trail lengkap | ✅ PASS | Semua operasi penting dicatat |
| Data lama/baru tersimpan di audit | ✅ PASS | dataLama dan dataBaru di AuditLog |
| .env di .gitignore | ⚠️ VERIFY | Pastikan .env tidak masuk ke repository |

---

## 2. AUDIT LOGIKA BISNIS & OPERASIONAL (CRITICAL FINDINGS)

> Bagian ini berisi temuan bug logika dan celah operasional yang dapat menyebabkan inkonsistensi data, kerugian finansial, atau kebingungan user.

### 2.0.1 🔴 CRITICAL — Race Condition: Barang Bisa Masuk ke 2+ Invoice Sekaligus

**Lokasi:** `invoiceController.js` → `createInvoice()`

**Masalah:**  
Saat membuat invoice, sistem hanya mengecek `status === 'TERJUAL'`. Tetapi status barang baru berubah ke TERJUAL **saat di-approve**, bukan saat masuk invoice. Akibatnya:

1. User A buat invoice dengan barang X → status tetap BELUM_TERJUAL
2. User B buat invoice lain juga dengan barang X → lolos validasi (masih BELUM_TERJUAL)
3. ADMIN approve keduanya → barang yang sama masuk 2 invoice, data keuangan double-counted

**Dampak:** Duplikasi penjualan, laporan profit tidak akurat, potensi sengketa customer.

**Fix:**
```javascript
// Tambahkan pengecekan: apakah barang sudah ada di invoice DRAFT/WAITING_APPROVAL/APPROVED
const sudahDiInvoice = await prisma.invoiceItem.findMany({
  where: {
    elektronikId: { in: itemIds.map(Number) },
    invoice: { status: { in: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED'] } }
  },
  include: { invoice: { select: { nomorInvoice: true } } }
});
if (sudahDiInvoice.length > 0) {
  return res.status(400).json({ 
    success: false, 
    message: `Barang sudah ada di invoice lain yang masih aktif` 
  });
}
```

---

### 2.0.2 🔴 CRITICAL — Tidak Ada Endpoint Hapus Invoice

**Lokasi:** `invoiceController.js`, `routes/invoices.js`

**Masalah:**  
Tidak ada endpoint DELETE untuk invoice. Jika invoice DRAFT dibuat lalu ditinggalkan, atau terjadi kesalahan input:
- Barang terjebak di invoice aktif (terkait masalah #2.0.1)
- User tidak bisa membatalkan invoice yang belum di-submit
- Data "sampah" invoice DRAFT menumpuk di database

**Dampak:** Barang tidak bisa dijual ke customer lain, data kotor.

**Fix:** Tambahkan endpoint `DELETE /api/invoices/:id` yang hanya mengizinkan hapus invoice berstatus DRAFT.

---

### 2.0.3 🔴 CRITICAL — Invoice Bisa Dibuat dengan Harga Jual Rp 0

**Lokasi:** `invoiceController.js` → `createInvoice()` line:

```javascript
hargaJual: parseFloat(item.hargaJual || 0),
ppn: parseFloat(item.ppn || 0),
totalHarga: parseFloat(item.totalHarga || 0),
```

**Masalah:**  
Jika barang belum punya hargaJual (null), invoice tetap dibuat dengan harga 0. Tidak ada validasi "barang harus sudah memiliki harga jual sebelum bisa masuk invoice."

**Dampak:** Invoice senilai Rp 0 bisa di-approve → barang ditandai TERJUAL dengan harga nol → laporan profit salah.

**Fix:** Tambahkan validasi:
```javascript
const tanpaHarga = items.filter(i => !i.hargaJual || parseFloat(i.hargaJual) <= 0);
if (tanpaHarga.length > 0) {
  return res.status(400).json({
    success: false,
    message: `Barang berikut belum memiliki harga jual: ${tanpaHarga.map(i => i.nomorSbg).join(', ')}`
  });
}
```

---

### 2.0.4 🟡 MEDIUM — Barang TERJUAL Bisa Di-edit Harganya (Data Inconsistency)

**Lokasi:** `itemController.js` → `updateItem()`

**Masalah:**  
Endpoint `PUT /api/items/:id` tidak mengecek apakah `status === 'TERJUAL'`. Admin bisa mengubah COGS/hargaJual barang yang sudah terjual, tetapi **harga di invoice_items tidak ikut berubah** (karena snapshot saat create invoice).

**Dampak:** Data tidak konsisten antara tabel `elektronik` dan `invoice_items`. Laporan riwayat dan dashboard bisa menampilkan angka berbeda.

**Fix:** Tambahkan guard:
```javascript
if (existing.status === 'TERJUAL' && (cogs !== undefined || hargaJual !== undefined)) {
  return res.status(400).json({ 
    success: false, 
    message: 'Tidak dapat mengubah harga barang yang sudah terjual' 
  });
}
```

---

### 2.0.5 🟡 MEDIUM — Tidak Ada Mekanisme Revert/Cancel Invoice Setelah Approve

**Lokasi:** `invoiceController.js`

**Masalah:**  
Saat approve → barang ditandai TERJUAL. Tetapi jika terjadi kesalahan (customer batal, salah input), **tidak ada mekanisme** untuk:
- Membatalkan invoice yang sudah APPROVED
- Mengembalikan status barang ke BELUM_TERJUAL

Status flow hanya satu arah: `DRAFT → WAITING_APPROVAL → APPROVED → PRINTED`

**Dampak:** Jika terjadi kesalahan, data harus dikoreksi manual di database. Tidak ada audit trail untuk pembatalan.

**Fix:** Tambahkan endpoint `POST /api/invoices/:id/cancel` khusus ADMIN yang:
1. Mengubah status invoice ke `CANCELLED`
2. Mengembalikan semua barang ke `BELUM_TERJUAL`
3. Mencatat alasan pembatalan di audit log

---

### 2.0.6 🟡 MEDIUM — Update Invoice Tidak Bisa Ganti Item Barang

**Lokasi:** `invoiceController.js` → `updateInvoice()`

**Masalah:**  
Endpoint update hanya mengubah header (namaCustomer, tanggal, perusahaan, catatan). **Tidak bisa menambah/hapus/ganti item barang** di invoice DRAFT.

**Dampak:** Jika salah pilih barang, user harus hapus invoice dan buat ulang — tapi hapus invoice pun tidak ada (masalah #2.0.2).

**Fix:** Tambahkan logika update items dalam `updateInvoice`, atau buat endpoint terpisah `PUT /api/invoices/:id/items`.

---

### 2.0.7 🟡 MEDIUM — Frontend Fetch Items Hanya 100, Bisa Kehilangan Data

**Lokasi:** `Invoice.jsx` → `fetchItems()`

```javascript
const { data } = await api.get('/items', { params: { status: 'BELUM_TERJUAL', limit: 100 } })
```

**Masalah:**  
Saat buat invoice, frontend hanya mengambil 100 barang pertama. Jika ada >100 barang BELUM_TERJUAL, user tidak bisa memilih barang sisanya.

**Dampak:** User tidak bisa membuat invoice untuk barang tertentu yang tidak muncul di list.

**Fix:** Implementasi infinite scroll atau tingkatkan limit, atau tambahkan server-side search khusus untuk pemilihan barang invoice.

---

### 2.0.8 🟡 MEDIUM — SUPER_USER Bisa Submit Invoice Sendiri (Bypass Approval)

**Lokasi:** `routes/invoices.js`, `invoiceController.js`

**Masalah:**  
Route `POST /:id/submit` tidak ada role restriction. SUPER_USER bisa membuat dan submit invoice. Tetapi jika SUPER_USER juga punya akses approve (via bug lain atau future change), prinsip **segregation of duties** dilanggar.

Saat ini aman karena approve hanya ADMIN, tetapi desainnya fragile — tidak ada check bahwa approver ≠ pembuat.

**Dampak:** Potensi fraud jika role permission berubah di masa depan.

**Fix:** Tambahkan validasi di `approveInvoice`:
```javascript
if (invoice.createdById === req.user.id) {
  return res.status(400).json({ 
    success: false, 
    message: 'Tidak dapat menyetujui invoice yang dibuat sendiri' 
  });
}
```

---

### 2.0.9 🟡 MEDIUM — Delete Item Tidak Cek Apakah Ada di Invoice Aktif

**Lokasi:** `itemController.js` → `deleteItem()`

**Masalah:**  
Barang bisa dihapus meskipun sedang ada di invoice DRAFT/WAITING_APPROVAL. Karena relasi di `InvoiceItem` tidak cascade delete pada elektronik, invoice akan memiliki referensi ke barang yang sudah tidak ada.

**Dampak:** Data integrity rusak. Invoice menunjuk ke barang yang tidak ada di database.

**Fix:**
```javascript
const diInvoice = await prisma.invoiceItem.findFirst({
  where: { elektronikId: id, invoice: { status: { in: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED'] } } }
});
if (diInvoice) {
  return res.status(400).json({ 
    success: false, 
    message: 'Barang tidak dapat dihapus karena sedang ada di invoice aktif' 
  });
}
```

---

### 2.0.10 🟢 LOW — Nomor Invoice Generate Berdasarkan Timestamp (Collision Possible)

**Lokasi:** `Invoice.jsx` → `openCreate()`

```javascript
nomorInvoice: `INV-${Date.now()}`
```

**Masalah:**  
Nomor invoice di-generate di frontend berdasarkan timestamp. Jika 2 user klik "Buat Invoice" pada milidetik yang sama, akan collision (ditolak oleh unique constraint di DB, tapi UX buruk).

**Dampak:** Minor — DB menolak dengan error, tapi user bingung.

**Fix:** Generate nomor invoice di backend dengan format sequential: `INV-2026-0001`, `INV-2026-0002`, dst.

---

### 2.0.11 🟢 LOW — Notifikasi Hardcode Limit 20 Tanpa Pagination

**Lokasi:** `notifikasiController.js` → `getNotifikasi()`

```javascript
take: 20,
```

**Masalah:**  
Hanya menampilkan 20 notifikasi terakhir. Notifikasi lama hilang dari tampilan tanpa opsi load more.

**Dampak:** User kehilangan informasi riwayat notifikasi.

---

### 2.0.12 🟢 LOW — Profit di Riwayat Menunjukkan Angka dari Tabel Elektronik, Bukan dari Invoice

**Lokasi:** `Riwayat.jsx`, `itemController.js` → `getRiwayat()`

**Masalah:**  
Halaman Riwayat menampilkan profit dari `elektronik.profit`, bukan dari data snapshot di `invoice_items`. Jika harga di tabel elektronik diubah setelah terjual (masalah #2.0.4), angka yang tampil akan berbeda dari yang tercetak di invoice PDF.

**Dampak:** Inkonsistensi laporan visual vs dokumen resmi (PDF).

---

### 2.0.13 🟢 LOW — PDF Invoice Tidak Menampilkan Nomor SBG

**Lokasi:** `pdfInvoice.js` → `generateInvoicePDF()`

**Masalah:**  
Komentar di kode: "Table — tanpa kolom Nomor SBG". Invoice PDF tidak menyertakan nomor SBG per item. Ini menyulitkan rekonsiliasi barang fisik dengan dokumen invoice.

**Dampak:** Kesulitan tracking barang fisik jika terjadi dispute.

**Fix:** Tambahkan kolom Nomor SBG di tabel PDF.

---

### 2.0.14 🔴 CRITICAL — Dashboard Stats Menghitung Semua Barang → Profit yang Ditampilkan Bukan Profit Riil

**Lokasi:** `itemController.js` → `getStats()`

**Masalah:**  
Query aggregate `totalHargaJual` dan `totalProfit` menghitung **semua barang** termasuk yang belum terjual:

```javascript
prisma.elektronik.aggregate({ _sum: { hargaJual: true, profit: true }, where })
```

`where` tidak memfilter `status: 'TERJUAL'`. Artinya:
- Dashboard menampilkan "Total Profit Rp 500jt" — padahal itu **proyeksi profit**, bukan profit riil dari penjualan
- Manajemen bisa mengira itu pendapatan yang sudah terealisasi
- Tidak ada pembedaan "profit terealisasi" vs "potensi profit"

**Dampak:** Misleading bagi manajemen. Keputusan bisnis berdasarkan angka yang salah.

**Fix:** Pisahkan statistik:
```javascript
// Profit riil (hanya barang TERJUAL)
const profitRiil = await prisma.elektronik.aggregate({
  _sum: { profit: true, hargaJual: true },
  where: { ...where, status: 'TERJUAL' }
});
// Potensi profit (barang BELUM_TERJUAL)
const profitPotensi = await prisma.elektronik.aggregate({
  _sum: { profit: true, hargaJual: true },
  where: { ...where, status: 'BELUM_TERJUAL' }
});
```
Tampilkan keduanya secara terpisah di dashboard.

---

### 2.0.15 🟡 MEDIUM — Import Excel Bisa Overwrite Barang yang Sudah TERJUAL

**Lokasi:** `itemController.js` → `importExcel()`

**Masalah:**  
Saat nomor SBG sudah ada di database, import akan melakukan update:
```javascript
await prisma.elektronik.update({
  where: { nomorSbg },
  data: { grade, jenisBarang, detailBarang, keterangan, cogs, offeringPengepul, hargaJual, ppn, totalHarga, profit, ... },
});
```

**Tidak ada pengecekan** apakah barang tersebut sudah berstatus TERJUAL. Dampak:
- COGS dan hargaJual barang yang sudah terjual bisa diubah via import
- Data profit di database berubah, tapi snapshot di `invoice_items` tetap
- Lebih parah dari bug manual edit (#2.0.4) karena batch operation — bisa mengubah ratusan barang sekaligus

**Dampak:** Korupsi data keuangan massal tanpa disadari.

**Fix:**
```javascript
const existing = await prisma.elektronik.findUnique({ where: { nomorSbg } });
if (existing) {
  if (existing.status === 'TERJUAL') {
    gagal++;
    errors.push({ nomorSbg, pesan: 'Barang sudah terjual, tidak dapat diupdate via import' });
    continue;
  }
  // ... proceed with update
}
```

---

### 2.0.16 🟡 MEDIUM — Filter "Semua Status" di Frontend Tidak Berfungsi

**Lokasi:** `itemController.js` → `buildWhere()`, `Elektronik.jsx`

**Masalah:**  
Backend:
```javascript
where.status = status || 'BELUM_TERJUAL';
```

Frontend dropdown "Semua Status" mengirim `status: ""`. Karena `"" || 'BELUM_TERJUAL'` evaluasi ke `'BELUM_TERJUAL'`, user **tidak pernah bisa melihat semua status** dari halaman Elektronik.

Dropdown menampilkan opsi "Semua Status", tapi hasilnya selalu menunjukkan barang BELUM_TERJUAL saja. User bisa bingung mengira data hilang.

**Dampak:** UX misleading. User tidak bisa melihat overview keseluruhan dari satu tempat.

**Fix backend:**
```javascript
if (status) where.status = status;
// Jika status tidak dikirim atau kosong, tidak memfilter status (tampilkan semua)
```

Atau jika memang ingin default BELUM_TERJUAL, ganti logika frontend agar default dropdown = `'BELUM_TERJUAL'` (bukan `''`), dan tambahkan opsi terpisah untuk "Semua".

---

### 2.0.17 🟡 MEDIUM — `updateItem` Bisa Mengubah Status Barang via API Langsung

**Lokasi:** `itemController.js` → `updateItem()`

```javascript
status: status || existing.status,
```

**Masalah:**  
Field `status` bisa dikirim via API request body. Artinya user dengan akses edit (tanpa role check di route POST/PUT) bisa mengubah status barang dari `BELUM_TERJUAL` ke `TERJUAL` secara manual **tanpa melalui flow invoice**.

Ini membypass seluruh approval workflow:
- Tidak ada invoice yang tercatat
- Tidak ada customer yang tercatat
- Tidak ada approval oleh ADMIN
- Audit log hanya mencatat "EDIT DATA ELEKTRONIK", bukan penjualan

**Dampak:** Barang bisa ditandai terjual tanpa bukti penjualan. Potensi fraud.

**Fix:** Hapus `status` dari body yang diterima di `updateItem`:
```javascript
// Jangan terima status dari request body
const { nomorSbg, grade, jenisBarang, detailBarang, keterangan, cogs, offeringPengepul, hargaJual, perusahaan } = req.body;
// Status hanya bisa diubah via flow invoice (approve/cancel)
```

---

### 2.0.18 🟢 LOW — Export Excel: Profit 0 Ditampilkan Sebagai Kosong

**Lokasi:** `itemController.js` → `exportExcel()`

```javascript
'Profit': item.profit ? parseFloat(item.profit) : '',
```

**Masalah:**  
Jika profit tepat `0` (hargaJual === COGS), JavaScript mengevaluasi `0` sebagai falsy → kolom profit ditampilkan kosong di Excel. Ini membuat user bingung: apakah profit belum dihitung atau memang nol?

**Fix:**
```javascript
'Profit': item.profit !== null && item.profit !== undefined ? parseFloat(item.profit) : '',
```

---

### 2.0.19 🟢 LOW — Persentase Profit Mencampur Profit dan Rugi (Net vs Gross)

**Lokasi:** `itemController.js` → `getStats()`

```javascript
const persentaseProfit = totalHargaJualNum > 0 
  ? ((totalProfitNum / totalHargaJualNum) * 100).toFixed(2) : 0;
```

**Masalah:**  
`totalProfitNum` adalah sum dari **semua profit** termasuk yang negatif (rugi). Jadi angka ini sebenarnya "net profit margin". Tapi di frontend label-nya "% Profit" yang menyiratkan gross profit margin.

Contoh: 8 barang profit total +100jt, 2 barang rugi total -80jt → `totalProfitNum` = +20jt → ditampilkan "% Profit = 2%" — padahal 80% barang profitable.

**Dampak:** Angka bisa sangat rendah atau bahkan negatif, membingungkan user yang mengira setiap barang profitable.

---

## 3. AUDIT FUNGSIONALITAS

### 3.1 Modul Data Elektronik

| Test Case | Status | Catatan |
|-----------|--------|---------|
| CRUD barang | ✅ PASS | Create, Read, Update, Delete berfungsi |
| Validasi field wajib | ✅ PASS | nomorSbg, grade, jenisBarang, detailBarang, cogs |
| Duplikasi nomor SBG | ✅ PASS | Dicek saat create dan update |
| Kalkulasi PPN (1.1%) | ✅ PASS | Otomatis dihitung |
| Kalkulasi Profit/Rugi | ✅ PASS | hargaJual - COGS |
| Import Excel | ✅ PASS | Dengan mapping kolom, update jika duplikat |
| Export Excel | ✅ PASS | Filter dan role-aware (hide COGS untuk USER) |
| Filter & Pagination | ✅ PASS | Search, grade, status, tanggal, perusahaan |
| Proteksi role USER | ✅ PASS | Kolom COGS disembunyikan |

### 3.2 Modul Invoice

| Test Case | Status | Catatan |
|-----------|--------|---------|
| Buat invoice (DRAFT) | ✅ PASS | — |
| Validasi barang sudah terjual | ✅ PASS | Tolak jika item status TERJUAL |
| Submit untuk approval | ✅ PASS | Status DRAFT/REJECTED → WAITING_APPROVAL |
| Approve invoice (ADMIN) | ✅ PASS | Transaction: update invoice + tandai barang TERJUAL |
| Reject invoice (ADMIN) | ✅ PASS | Dengan alasan penolakan |
| Cetak invoice | ✅ PASS | Hanya jika APPROVED |
| Notifikasi ke ADMIN saat submit | ✅ PASS | — |
| Notifikasi ke pembuat saat approve/reject | ✅ PASS | — |
| Edit hanya DRAFT/REJECTED | ✅ PASS | Status lain ditolak |
| USER hanya lihat milik sendiri | ✅ PASS | Filter createdById |

### 3.3 Modul Katalog Emas

| Test Case | Status | Catatan |
|-----------|--------|---------|
| CRUD katalog | ✅ PASS | — |
| Upload gambar | ✅ PASS | Via multer |
| Filter per cabang | ✅ PASS | — |
| Role KATALOG_USER akses terbatas | ✅ PASS | Hanya halaman katalog |

### 3.4 Modul User Management

| Test Case | Status | Catatan |
|-----------|--------|---------|
| CRUD user (ADMIN only) | ✅ PASS | Route dilindungi requireRole('ADMIN') |
| Reset password | ✅ PASS | — |
| Tidak bisa hapus diri sendiri | ✅ PASS | Validasi id !== req.user.id |
| Ganti password sendiri | ✅ PASS | Verifikasi password lama |

### 3.5 Temuan Fungsionalitas Tambahan

| # | Severity | Temuan | Rekomendasi |
|---|----------|--------|-------------|
| F-01 | 🟡 MEDIUM | Route `/api/items` POST tidak ada role check | Tambahkan `requireRole('ADMIN', 'SUPER_USER')` pada route create/update item |
| F-02 | 🟡 MEDIUM | Route `/api/items/import/excel` tidak ada role check | Hanya ADMIN/SUPER_USER yang boleh import |
| F-03 | 🟢 LOW | Default password reset "password123" terlalu lemah | Wajibkan parameter passwordBaru, atau generate random |
| F-04 | 🟢 LOW | Audit log pada route AuditLog hanya untuk SUPER_USER+ | OK sesuai desain, tetapi pastikan documented |

---

## 4. AUDIT PERFORMA

### 4.1 Backend

| Item | Status | Catatan |
|------|--------|---------|
| Database indexing | ⚠️ REVIEW | Prisma auto-index pada @unique, tapi perlu index tambahan pada field filter (grade, status, perusahaan, tanggalMasuk) |
| N+1 Query pada import | ⚠️ REVIEW | Loop `findUnique` per row pada import Excel — bisa lambat untuk dataset besar |
| Pagination | ✅ PASS | Semua list endpoint mendukung pagination |
| Stats query parallel | ✅ PASS | Promise.all untuk concurrent queries |
| Connection pooling | ✅ PASS | Prisma default connection pool |

### 4.2 Frontend

| Item | Status | Catatan |
|------|--------|---------|
| Code splitting | ⚠️ REVIEW | Tidak ada lazy loading pada routes — semua page di-load sekaligus |
| Bundle size | ⚠️ REVIEW | xlsx, jspdf, apexcharts cukup besar — perlu code splitting |
| Image optimization | ⚠️ REVIEW | Gambar katalog disajikan tanpa resize/compress |
| API request caching | ❌ MISSING | Tidak ada caching layer di frontend |

### 4.3 Rekomendasi Performa

| # | Prioritas | Rekomendasi |
|---|-----------|-------------|
| P-01 | HIGH | Tambahkan database index pada kolom: `grade`, `status`, `perusahaan`, `tanggal_masuk` |
| P-02 | MEDIUM | Implementasi `React.lazy()` dan `Suspense` untuk code splitting per route |
| P-03 | MEDIUM | Batch upsert pada import Excel (gunakan `createMany` dengan chunking) |
| P-04 | LOW | Tambahkan image resize/compression saat upload katalog |
| P-05 | LOW | Implementasi SWR/React Query untuk client-side caching |

---

## 5. AUDIT KUALITAS KODE

### 5.1 Arsitektur

| Aspek | Evaluasi |
|-------|----------|
| Struktur folder | ✅ Terorganisir baik (controllers, middleware, routes, utils) |
| Separation of concerns | ✅ Controller-Route-Middleware terpisah |
| Error handling | ⚠️ Konsisten try-catch tapi bisa lebih baik dengan global error middleware |
| Konsistensi penamaan | ✅ Bahasa Indonesia konsisten |
| Environment config | ✅ dotenv dengan .env.example |

### 5.2 Temuan Kualitas Kode

| # | Severity | Temuan | Detail |
|---|----------|--------|--------|
| Q-01 | 🟡 MEDIUM | Tidak ada test suite | Tidak ada unit test atau integration test |
| Q-02 | 🟡 MEDIUM | Tidak ada ESLint/Prettier | Tidak ada linting configuration |
| Q-03 | 🟢 LOW | parseInt tanpa radix param | Beberapa tempat `parseInt(req.params.id)` tanpa radix (default 10, tapi best practice) |
| Q-04 | 🟢 LOW | Duplikasi kalkulasi PPN/profit | Formula PPN dan profit diulang di createItem, updateItem, importExcel |

---

## 6. AUDIT KESIAPAN DEPLOYMENT

### 6.1 Checklist Infrastructure

| Item | Status | Detail |
|------|--------|--------|
| Production .env | ❌ BELUM | Perlu dikonfigurasi dengan credentials production |
| Process Manager (PM2) | ❌ BELUM | Tidak ada ecosystem.config.js atau Dockerfile |
| Reverse Proxy (Nginx) | ❌ BELUM | Tidak ada konfigurasi nginx |
| SSL/TLS | ❌ BELUM | Belum ada setup HTTPS |
| Database backup strategy | ❌ BELUM | Tidak ada cron backup |
| Logging (file-based) | ❌ BELUM | Hanya console.log, perlu file logging (winston/morgan) |
| Health check endpoint | ✅ ADA | `/api/health` tersedia |
| Frontend build | ✅ ADA | `vite build` tersedia |
| Database migration | ✅ ADA | Prisma migrate ready |

### 6.2 Checklist Operasional

| Item | Status | Rekomendasi |
|------|--------|-------------|
| Monitoring & alerting | ❌ BELUM | Setup uptime monitoring (Uptime Robot/Pingdom) |
| Error tracking | ❌ BELUM | Integrasikan Sentry atau equivalent |
| Access logging | ⚠️ PARTIAL | Audit log di DB ada, tapi belum ada HTTP access log |
| Graceful shutdown | ❌ BELUM | Tambahkan SIGTERM handler untuk graceful close |
| Environment variable validation | ❌ BELUM | Validasi required env vars saat startup |

### 6.3 Rekomendasi Deployment

```
Production Setup yang Dibutuhkan:
├── PM2 ecosystem.config.js
├── Nginx reverse proxy + SSL
├── MySQL production instance (terpisah)
├── Backup script (daily cron)
├── Log rotation
├── .env production (secret, DB, CORS)
└── CI/CD pipeline (optional)
```

---

## 7. AUDIT DATABASE

### 7.1 Schema Review

| Aspek | Status | Catatan |
|-------|--------|---------|
| Primary keys | ✅ PASS | Auto-increment integer |
| Unique constraints | ✅ PASS | email, nomorSbg, nomorInvoice |
| Foreign keys | ✅ PASS | Relasi dengan onDelete Cascade (notifikasi) |
| Timestamps | ✅ PASS | createdAt, updatedAt pada semua tabel |
| Data types | ✅ PASS | Decimal(15,2) untuk monetary values |
| Enums | ✅ PASS | Role, Grade, Status terdefinisi |

### 7.2 Temuan Database

| # | Severity | Temuan | Rekomendasi |
|---|----------|--------|-------------|
| D-01 | 🟡 MEDIUM | Tidak ada soft delete | Jika user dihapus, invoices orphan (createdById tetap ada tapi user hilang). Pertimbangkan soft delete. |
| D-02 | 🟡 MEDIUM | Cascade delete pada Notifikasi | Jika user dihapus, semua notifikasi hilang — bisa kehilangan jejak |
| D-03 | 🟢 LOW | Audit log userId nullable | Jika user dihapus, audit log tetap ada tapi relasi putus — sudah ditangani dengan namaUser field |
| D-04 | 🟢 LOW | Tidak ada database-level constraint pada enum | Ditangani Prisma, tapi tambahan check constraint di DB level lebih aman |

---

## 8. COMPLIANCE & REGULASI

| Item | Status | Catatan |
|------|--------|---------|
| Data privacy (UU PDP) | ⚠️ REVIEW | Menyimpan nama, email, no telepon — pastikan ada consent dan retention policy |
| Audit trail | ✅ PASS | Seluruh aktivitas dicatat dengan timestamp dan IP |
| Access control | ✅ PASS | Role-based, minimal privilege |
| Data encryption at rest | ❌ MISSING | Password di-hash, tapi data sensitif lain (COGS, harga) plaintext |
| Backup & recovery | ❌ MISSING | Belum ada disaster recovery plan |

---

## 9. ACTION ITEMS SEBELUM DEPLOYMENT

### 🔴 WAJIB (Blocker — Harus diselesaikan)

| # | Item | PIC | Target |
|---|------|-----|--------|
| 1 | **Fix race condition: cek barang di invoice aktif sebelum create invoice** | Backend Dev | 2 jam |
| 2 | **Tambahkan endpoint hapus invoice (hanya DRAFT)** | Backend Dev | 2 jam |
| 3 | **Validasi harga jual > 0 sebelum barang masuk invoice** | Backend Dev | 1 jam |
| 4 | **Cek barang di invoice aktif sebelum delete item** | Backend Dev | 1 jam |
| 5 | **Fix dashboard: pisahkan profit riil (TERJUAL) vs proyeksi (BELUM_TERJUAL)** | Backend + Frontend | 3 jam |
| 6 | **Blokir updateItem agar tidak bisa ubah status via API (bypass invoice flow)** | Backend Dev | 30 menit |
| 7 | **Blokir import Excel agar tidak overwrite barang TERJUAL** | Backend Dev | 1 jam |
| 8 | Implementasi rate limiting pada login & API | Backend Dev | 1 hari |
| 9 | Konfigurasi CORS production (hapus fallback localhost) | Backend Dev | 1 jam |
| 10 | Setup helmet.js untuk security headers | Backend Dev | 1 jam |
| 11 | Turunkan body size limit ke 10MB | Backend Dev | 30 menit |
| 12 | Tambahkan role check pada route POST/PUT items & import | Backend Dev | 1 jam |
| 13 | Konfigurasi production .env dengan JWT secret kuat | DevOps | 1 jam |
| 14 | Setup PM2 + Nginx + SSL | DevOps | 1 hari |
| 15 | Setup database backup otomatis (daily) | DevOps | 2 jam |
| 16 | Validasi file type pada multer upload (items import) | Backend Dev | 1 jam |
| 17 | Tambahkan graceful shutdown handler | Backend Dev | 30 menit |

### 🟡 DISARANKAN (Sebelum production traffic tinggi)

| # | Item | PIC | Target |
|---|------|-----|--------|
| 18 | Fix filter "Semua Status" yang tidak berfungsi (buildWhere logic) | Backend Dev | 30 menit |
| 19 | Blokir edit harga barang yang sudah TERJUAL | Backend Dev | 1 jam |
| 20 | Tambahkan endpoint cancel/revert invoice (ADMIN) | Backend Dev | 4 jam |
| 21 | Implementasi update items dalam invoice DRAFT | Backend Dev | 3 jam |
| 22 | Validasi approver ≠ pembuat invoice (segregation of duties) | Backend Dev | 30 menit |
| 23 | Perbaiki fetch items limit 100 di form buat invoice | Frontend Dev | 2 jam |
| 24 | Generate nomor invoice di backend (sequential) | Full Stack | 2 jam |
| 25 | Implementasi express-validator pada semua input | Backend Dev | 2 hari |
| 26 | Database index optimization | Backend Dev | 2 jam |
| 27 | Frontend code splitting (React.lazy) | Frontend Dev | 1 hari |
| 28 | Setup logging (winston + morgan) | Backend Dev | 2 jam |
| 29 | Implementasi refresh token | Backend Dev | 1 hari |
| 30 | Setup error tracking (Sentry) | DevOps | 2 jam |
| 31 | Environment variable validation saat startup | Backend Dev | 1 jam |

### 🟢 NICE-TO-HAVE (Iterasi berikutnya)

| # | Item | PIC | Target |
|---|------|-----|--------|
| 32 | Tambahkan kolom Nomor SBG di PDF invoice | Frontend Dev | 1 jam |
| 33 | Notifikasi dengan pagination (bukan hardcode 20) | Full Stack | 2 jam |
| 34 | Konsistensi data profit: gunakan snapshot invoice, bukan tabel elektronik | Backend Dev | 4 jam |
| 35 | Fix export Excel: profit 0 ditampilkan kosong (falsy check) | Backend Dev | 15 menit |
| 36 | Pisahkan label "% Profit" menjadi gross vs net profit margin | Frontend Dev | 1 jam |
| 37 | Unit & integration tests | QA/Dev | 1 minggu |
| 38 | CI/CD pipeline | DevOps | 1 hari |
| 39 | Image compression pada upload | Backend Dev | 2 jam |
| 40 | Client-side caching (React Query/SWR) | Frontend Dev | 2 hari |
| 41 | Soft delete implementation | Backend Dev | 1 hari |
| 42 | ESLint + Prettier configuration | Dev | 1 jam |

---

## 10. SIGN-OFF

| Role | Nama | Status | Tanggal |
|------|------|--------|---------|
| QA/QC Lead | ______________ | ⬜ Pending | ___/___/2026 |
| Backend Lead | ______________ | ⬜ Pending | ___/___/2026 |
| Frontend Lead | ______________ | ⬜ Pending | ___/___/2026 |
| DevOps | ______________ | ⬜ Pending | ___/___/2026 |
| Project Manager | ______________ | ⬜ Pending | ___/___/2026 |

---

## 11. KESIMPULAN

Aplikasi Dashboard SMT secara fungsional sudah **hampir siap** dan sebagian besar business logic berjalan dengan baik. Namun terdapat **temuan kritis pada logika bisnis** yang dapat menyebabkan **inkonsistensi data keuangan** dan **misleading reporting** jika tidak diperbaiki:

### Temuan Terpenting (Business Logic & Data Integrity)
1. **Race condition invoice** — barang yang sama bisa masuk ke 2+ invoice karena tidak ada lock/check saat create
2. **Dashboard profit misleading** — menampilkan profit dari SEMUA barang (termasuk belum terjual) seolah sudah terealisasi
3. **Status barang bisa diubah langsung via API** — bypass seluruh invoice approval workflow (potensi fraud)
4. **Import Excel overwrite barang TERJUAL** — korupsi data keuangan massal
5. **Invoice Rp 0** — barang tanpa harga jual bisa masuk invoice dan di-approve
6. **Tidak ada hapus invoice** — invoice DRAFT yang salah tidak bisa dihapus
7. **Delete item tanpa cek invoice** — merusak data integrity invoice aktif
8. **Filter "Semua Status" tidak berfungsi** — user selalu hanya melihat BELUM_TERJUAL

### Temuan Terpenting (Security & Infra)
9. **Rate limiting** wajib ada untuk mencegah brute-force attack pada login
10. **Security headers** via helmet.js untuk proteksi standar web
11. **CORS configuration** harus explicit untuk domain production
12. **Infrastructure** (PM2, Nginx, SSL, backup) belum disiapkan

**Rekomendasi:** Selesaikan 17 action items WAJIB (estimasi 4-5 hari kerja), dengan **prioritas tertinggi** pada 7 fix logika bisnis (#1-#7) terlebih dahulu karena berdampak langsung pada integritas data keuangan. Kemudian lakukan re-audit ringkas sebelum Go-Live.

---

*Dokumen ini di-generate oleh QA/QC Team — Dashboard SMT Pre-Deployment Audit*  
*Versi audit: 1.2 | Total temuan: 19 logika bisnis + 10 security + 5 performa + 4 kode + 5 database*  
*Berlaku hingga perbaikan selesai dan re-audit dilakukan*
