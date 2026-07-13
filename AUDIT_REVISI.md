# AUDIT REVISI — Dashboard SMT

**Proyek:** Dashboard Serba Mas Tentram — Elektronik, Invoice & Katalog Emas
**Tanggal Audit Revisi:** 13 Juli 2026
**Auditor:** QA/QC Team
**Versi:** 2.0.0
**Referensi:** [AUDIT_PRE_DEPLOYMENT.md](AUDIT_PRE_DEPLOYMENT.md) (6 Juli 2026, v1.2)
**Status:** ⚠️ CONDITIONAL PASS — 1 temuan Critical tersisa (kebocoran kredensial), sisanya Medium/Low

---

## RINGKASAN EKSEKUTIF

Audit revisi ini mengevaluasi **kondisi project saat ini** setelah perbaikan yang dilakukan menyusul audit pra-deployment sebelumnya. Hasilnya sangat menggembirakan: **mayoritas besar temuan kritis logika bisnis dan keamanan sudah diperbaiki** dengan benar di dalam kode.

Dari **17 action item WAJIB** pada audit sebelumnya, **16 sudah diselesaikan** di level kode aplikasi. Namun ditemukan **1 masalah Critical baru** yang bukan bug kode melainkan kebocoran kredensial di repository, serta beberapa temuan Medium/Low yang belum ditangani (sebagian besar bersifat fitur tambahan, kualitas kode, dan infrastruktur).

### Perbandingan Skor dengan Audit Sebelumnya

| Kategori | Skor Lama | Skor Sekarang | Perubahan |
|----------|-----------|---------------|-----------|
| Business Logic | 5/10 | 9/10 | 🟢 +4 |
| Security | 6/10 | 7/10 | 🟢 +1 (tertahan oleh kebocoran `.env`) |
| Functionality | 8/10 | 9/10 | 🟢 +1 |
| Performance | 7/10 | 8/10 | 🟢 +1 (index DB ditambahkan) |
| Code Quality | 7/10 | 7/10 | ⚪ tetap (belum ada test/lint) |
| Deployment Readiness | 5/10 | 6/10 | 🟢 +1 |
| Documentation | 8/10 | 8/10 | ⚪ tetap |

### Ringkasan Jumlah Temuan Tersisa

| Severity | Jumlah | Keterangan |
|----------|--------|------------|
| 🔴 Critical | 1 | Kredensial `.env` ter-commit ke git |
| 🟡 Medium | 6 | Fitur invoice, validasi input, logging, refresh token |
| 🟢 Low | 8 | Kualitas kode, UX minor, housekeeping |

---

## 1. STATUS PERBAIKAN TEMUAN AUDIT SEBELUMNYA

> Verifikasi langsung terhadap kode sumber saat ini.

### 1.1 Temuan Logika Bisnis — SUDAH DIPERBAIKI ✅

| Ref Lama | Temuan | Status | Bukti di Kode |
|----------|--------|--------|---------------|
| 2.0.1 | Race condition barang masuk 2+ invoice | ✅ FIXED | [invoiceController.js:106-116](backend/src/controllers/invoiceController.js#L106-L116) — cek `invoiceItem` pada status DRAFT/WAITING/APPROVED/PRINTED |
| 2.0.2 | Tidak ada endpoint hapus invoice | ✅ FIXED | [invoiceController.js:349-380](backend/src/controllers/invoiceController.js#L349-L380) — `deleteInvoice` (hanya DRAFT) |
| 2.0.3 | Invoice bisa dibuat dengan harga Rp 0 | ✅ FIXED | [invoiceController.js:100-103](backend/src/controllers/invoiceController.js#L100-L103) — validasi `tanpaHarga` |
| 2.0.4 | Barang TERJUAL bisa di-edit harganya | ✅ FIXED | [itemController.js:173-175](backend/src/controllers/itemController.js#L173-L175) — guard status TERJUAL |
| 2.0.5 | Tidak ada revert/cancel invoice | ✅ FIXED | [invoiceController.js:382-428](backend/src/controllers/invoiceController.js#L382-L428) — `cancelInvoice` (kembalikan barang ke BELUM_TERJUAL) |
| 2.0.8 | SUPER_USER bisa approve invoice sendiri | ✅ FIXED | [invoiceController.js:241-243](backend/src/controllers/invoiceController.js#L241-L243) — cek `createdById === req.user.id` |
| 2.0.9 | Delete item tanpa cek invoice aktif | ✅ FIXED | [itemController.js:230-236](backend/src/controllers/itemController.js#L230-L236) — cek `invoiceItem` |
| 2.0.13 | PDF invoice tanpa Nomor SBG | ✅ FIXED | [pdfInvoice.js:104-117](frontend/src/utils/pdfInvoice.js#L104-L117) — kolom "No. SBG" ditambahkan |
| 2.0.14 | Dashboard profit misleading (semua barang) | ✅ FIXED | [itemController.js:434-449](backend/src/controllers/itemController.js#L434-L449) — pisah `profitRiil` vs `profitProyeksi` |
| 2.0.15 | Import Excel overwrite barang TERJUAL | ✅ FIXED | [itemController.js:293-298](backend/src/controllers/itemController.js#L293-L298) — skip jika TERJUAL |
| 2.0.16 | Filter "Semua Status" tidak berfungsi | ✅ FIXED | [itemController.js:57](backend/src/controllers/itemController.js#L57) — `if (status) where.status = status` |
| 2.0.17 | `updateItem` bisa ubah status via API | ✅ FIXED | [itemController.js:170](backend/src/controllers/itemController.js#L170) — `status` dihapus dari body |
| 2.0.18 | Export Excel: profit 0 tampil kosong | ✅ FIXED | [itemController.js:354](backend/src/controllers/itemController.js#L354) — cek `!= null` |

### 1.2 Temuan Keamanan & Infrastruktur — SUDAH DIPERBAIKI ✅

| Ref Lama | Temuan | Status | Bukti di Kode |
|----------|--------|--------|---------------|
| S-02 | Tidak ada rate limiting | ✅ FIXED | [server.js:56-74](backend/server.js#L56-L74) — global 100/mnt + login 5/15mnt |
| S-03 | CORS terlalu permisif | ✅ FIXED | [server.js:45](backend/server.js#L45) — tanpa fallback localhost di production |
| S-04 | Tidak ada Helmet.js | ✅ FIXED | [server.js:40-42](backend/server.js#L40-L42) |
| S-05 | Body size limit 50MB | ✅ FIXED | [server.js:52-53](backend/server.js#L52-L53) — turun ke 10MB |
| S-08 | File upload tanpa validasi tipe | ✅ FIXED | [items.js:16-20](backend/src/routes/items.js#L16-L20), [katalog.js:23-26](backend/src/routes/katalog.js#L23-L26) — `fileFilter` |
| S-10 | Error message terlalu verbose | ✅ FIXED | [server.js:92-97](backend/server.js#L92-L97) — generic message di production |
| F-01/F-02 | Route items POST/PUT/import tanpa role check | ✅ FIXED | [items.js:28-31](backend/src/routes/items.js#L28-L31) — `requireRole('ADMIN','SUPER_USER')` |
| F-03 | Reset password default "password123" | ✅ FIXED | [userController.js:124-127](backend/src/controllers/userController.js#L124-L127) — wajib `passwordBaru` min 6 |
| Infra | Graceful shutdown | ✅ FIXED | [server.js:105-121](backend/server.js#L105-L121) — handler SIGTERM/SIGINT |
| Infra | Validasi env var saat startup | ✅ FIXED | [server.js:17-32](backend/server.js#L17-L32) |
| P-01 | Index DB pada kolom filter | ✅ FIXED | [schema.prisma:61-91](backend/prisma/schema.prisma#L61-L91) — index status, perusahaan, grade, tanggal |

---

## 2. TEMUAN CRITICAL (Wajib segera diperbaiki) 🔴

### C-01 🔴 CRITICAL — File `.env` Berisi Kredensial Asli Ter-commit ke Git

**Lokasi:** `backend/.env` (ter-track sejak commit `a4b9d044` "Initial commit")

**Masalah:**
Meskipun `.gitignore` sudah benar mencantumkan `.env`, file `backend/.env` **sudah terlanjur di-commit ke repository sebelum aturan ignore berlaku** dan masih ter-track sampai sekarang (`git ls-files` menampilkannya). File ini berisi:
- `JWT_SECRET` — kunci penandatanganan token autentikasi
- `DATABASE_URL` — kredensial akses database (host, user, password)
- `FRONTEND_URL`

Karena project ini sudah di-push ke GitHub (lihat riwayat merge PR #1), **kredensial ini kemungkinan sudah bocor ke remote dan tersimpan permanen di histori git**, meskipun file dihapus di kemudian hari.

**Dampak:**
- Siapa pun dengan akses ke repository (termasuk histori) bisa membaca JWT_SECRET → memalsukan token login siapa pun (termasuk ADMIN)
- Kredensial database bisa dipakai untuk akses langsung ke data produksi
- Ini adalah **risiko keamanan tertinggi** pada kondisi project saat ini

**Fix (wajib, urutan penting):**
1. **Rotasi semua kredensial** — generate `JWT_SECRET` baru (≥64 karakter random) dan **ganti password database**. Anggap kredensial lama sudah bocor.
2. Hapus file dari tracking git (tetap simpan lokal):
   ```bash
   git rm --cached backend/.env
   git commit -m "chore: hapus .env dari tracking git"
   ```
3. **Bersihkan histori git** (karena file sudah pernah masuk ke commit lama). Gunakan `git filter-repo` atau BFG Repo-Cleaner:
   ```bash
   git filter-repo --path backend/.env --invert-paths
   ```
   Lalu force-push (koordinasi dengan tim karena mengubah histori).
4. Pastikan hanya `backend/.env.example` (tanpa nilai asli) yang ada di repository.

---

## 3. TEMUAN MEDIUM (Sebaiknya diperbaiki sebelum/segera setelah go-live) 🟡

### M-01 🟡 Update Invoice Tidak Bisa Ganti Item Barang
**Lokasi:** [invoiceController.js:158-189](backend/src/controllers/invoiceController.js#L158-L189)
`updateInvoice` hanya mengubah header (customer, tanggal, perusahaan, catatan). Item barang tidak bisa ditambah/hapus/ganti pada invoice DRAFT. Workaround saat ini: hapus invoice lalu buat ulang (kini sudah bisa karena `deleteInvoice` ada). Tetap disarankan menambah endpoint `PUT /api/invoices/:id/items`. *(Carry-over dari 2.0.6)*

### M-02 🟡 `express-validator` Terpasang Tapi Tidak Digunakan
**Lokasi:** `backend/package.json` (dependency ada), tidak ada pemakaian di `backend/src`.
Validasi input masih manual dan tidak konsisten di tiap controller (hanya cek field kosong). Tidak ada sanitasi tipe/format (mis. email, angka, panjang string). Disarankan implementasi middleware validasi terpusat menggunakan `express-validator` pada endpoint POST/PUT. *(Carry-over dari S-06)*

### M-03 🟡 JWT_EXPIRES_IN Masih "7d" di `.env`
**Lokasi:** `backend/.env` → `JWT_EXPIRES_IN="7d"`
Meskipun default di kode sudah 8 jam ([authController.js:26](backend/src/controllers/authController.js#L26)), nilai `.env` menimpanya menjadi 7 hari. Token berumur panjang tanpa mekanisme refresh/revoke berisiko jika token dicuri. Turunkan ke 4–8 jam, atau implementasikan refresh token. *(Carry-over dari S-07)*

### M-04 🟡 Belum Ada File Logging (winston/morgan)
Hanya `console.log`/`console.error`. Tidak ada HTTP access log maupun log file terstruktur untuk audit operasional dan troubleshooting di production. Audit trail bisnis di DB sudah ada, tapi log level-infrastruktur belum. Disarankan tambah `morgan` (HTTP) + `winston` (file, rotasi).

### M-05 🟡 Frontend Ambil Barang dengan Hard-Limit 2000
**Lokasi:** [Invoice.jsx:56](frontend/src/pages/Invoice.jsx#L56) — `limit: 2000`
Sudah dinaikkan dari 100 (perbaikan parsial dari 2.0.7), tapi masih hard cap. Jika barang BELUM_TERJUAL melebihi 2000, sebagian tidak muncul saat pembuatan invoice. Disarankan pencarian server-side / infinite scroll khusus pemilihan barang invoice.

### M-06 🟡 Nomor Invoice Masih Di-generate Frontend (Timestamp)
**Lokasi:** [Invoice.jsx:69](frontend/src/pages/Invoice.jsx#L69) — `INV-${Date.now()}`
Berpotensi collision & tidak sekuensial. Meskipun DB menolak duplikat (unique constraint), UX buruk dan penomoran tidak rapi. Disarankan generate di backend dengan format sekuensial (`INV-2026-0001`). *(Carry-over dari 2.0.10)*

---

## 4. TEMUAN LOW (Peningkatan iterasi berikutnya) 🟢

| # | Temuan | Lokasi | Catatan |
|---|--------|--------|---------|
| L-01 | Notifikasi hardcode limit 20 tanpa pagination | [notifikasiController.js:13](backend/src/controllers/notifikasiController.js#L13) | Notifikasi lama hilang dari tampilan. Carry-over 2.0.11 |
| L-02 | Profit di Riwayat dari tabel elektronik, bukan snapshot invoice_items | [itemController.js:512-568](backend/src/controllers/itemController.js#L512-L568) | Risiko turun karena edit harga TERJUAL kini diblokir, tapi konsistensi ideal tetap pakai snapshot. Carry-over 2.0.12 |
| L-03 | "% Profit" mencampur net vs gross | [itemController.js:442](backend/src/controllers/itemController.js#L442) | Bisa membingungkan saat ada barang rugi. Carry-over 2.0.19 |
| L-04 | Tidak ada test suite (unit/integration) | `backend/package.json` | Tidak ada script `test`. Carry-over Q-01 |
| L-05 | Tidak ada ESLint/Prettier | project root | Belum ada konfigurasi linting. Carry-over Q-02 |
| L-06 | Tidak ada code splitting frontend (React.lazy) | [App.jsx](frontend/src/App.jsx) | Semua page di-load sekaligus, bundle besar (xlsx/jspdf/apexcharts). Carry-over P-02 |
| L-07 | Dependency `multer@1.4.5-lts.1` sudah deprecated | `backend/package.json` | Multer 1.x tidak lagi didukung; pertimbangkan upgrade ke 2.x |
| L-08 | Tidak ada image compression saat upload katalog | [katalog.js:20-27](backend/src/routes/katalog.js#L20-L27) | Gambar disimpan apa adanya (limit 5MB). Carry-over P-04 |

---

## 5. CHECKLIST KESIAPAN DEPLOYMENT (Infrastruktur)

Item di bawah bersifat operasional/DevOps dan **tidak dapat diverifikasi dari kode** — perlu konfirmasi tim infrastruktur.

| Item | Status Kode | Catatan |
|------|-------------|---------|
| Validasi env var saat startup | ✅ ADA | [server.js:17-32](backend/server.js#L17-L32) |
| Graceful shutdown | ✅ ADA | [server.js:105-121](backend/server.js#L105-L121) |
| Health check endpoint | ✅ ADA | `/api/health` |
| `trust proxy` untuk reverse proxy | ✅ ADA | [server.js:37](backend/server.js#L37) |
| PM2 / Dockerfile | ⚠️ VERIFIKASI | Tidak ada `ecosystem.config.js`/`Dockerfile` di repo |
| Nginx + SSL/TLS | ⚠️ VERIFIKASI | Konfigurasi di luar repo |
| Database backup otomatis | ⚠️ VERIFIKASI | Perlu cron backup harian |
| Monitoring & error tracking (Sentry/uptime) | ❌ BELUM | Belum terintegrasi |
| File logging + rotasi | ❌ BELUM | Lihat M-04 |

---

## 6. KESIMPULAN

Kondisi project **sudah jauh lebih baik** dibanding audit pra-deployment. Tim pengembang telah menyelesaikan **hampir seluruh temuan kritis logika bisnis dan keamanan aplikasi** dengan implementasi yang benar dan terverifikasi di kode:

- Integritas data invoice terjaga (race condition, invoice Rp 0, delete guard, cancel/revert, segregation of duties — **semua tertutup**).
- Dashboard kini memisahkan profit **terealisasi** vs **proyeksi** — laporan tidak lagi misleading.
- Lapisan keamanan standar sudah aktif (rate limiting, Helmet, CORS ketat, validasi upload, role check, generic error, graceful shutdown, validasi env).
- Index database untuk kolom filter sudah ditambahkan.

**Blocker tunggal yang tersisa untuk go-live adalah C-01 (kebocoran kredensial `.env` di git)** — ini bukan bug kode, melainkan higiene repository, tetapi dampaknya kritis dan **wajib ditangani dengan rotasi kredensial + pembersihan histori git** sebelum production.

Temuan Medium & Low sisanya sebagian besar berupa **fitur tambahan, kualitas kode, dan infrastruktur** yang dapat dijadwalkan pasca go-live tanpa memblokir peluncuran, selama C-01 sudah beres dan checklist infrastruktur (PM2/Nginx/SSL/backup) dikonfirmasi.

### Rekomendasi Prioritas
1. **SEGERA:** Tangani C-01 — rotasi JWT_SECRET & password DB, hapus `.env` dari tracking, bersihkan histori git.
2. **Sebelum go-live:** Konfirmasi infrastruktur (PM2, Nginx, SSL, backup), set `JWT_EXPIRES_IN` wajar (M-03), tambah file logging (M-04).
3. **Iterasi berikutnya:** M-01/M-02/M-05/M-06, lalu temuan Low (test, lint, code splitting, dll).

---

*Dokumen ini di-generate oleh QA/QC Team — Dashboard SMT Audit Revisi*
*Versi audit: 2.0 | 16 dari 17 action item WAJIB (audit v1.2) selesai | Temuan tersisa: 1 Critical + 6 Medium + 8 Low*
*Verifikasi dilakukan langsung terhadap kode sumber per 13 Juli 2026*
