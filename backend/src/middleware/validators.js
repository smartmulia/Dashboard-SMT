const { body } = require('express-validator');

// Kumpulan aturan validasi input untuk endpoint POST/PUT utama.
// Dipasang di route sebelum handleValidation. Melengkapi (bukan mengganti)
// pengecekan logika bisnis yang tetap ada di controller.

const GRADES = ['A', 'B', 'C', 'D'];
const PERUSAHAAN = ['SERBA_MAS', 'VOLARY'];
const ROLES = ['ADMIN', 'SUPER_USER', 'USER', 'KATALOG_USER'];

// ── Auth ──
const loginRules = [
  body('email').trim().isEmail().withMessage('Email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
];

const changePasswordRules = [
  body('passwordLama').notEmpty().withMessage('Password lama wajib diisi'),
  body('passwordBaru').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
];

// ── Elektronik ──
const createItemRules = [
  body('nomorSbg').trim().notEmpty().withMessage('Nomor SBG wajib diisi'),
  body('grade').isIn(GRADES).withMessage('Grade harus salah satu dari A, B, C, D'),
  body('jenisBarang').trim().notEmpty().withMessage('Jenis barang wajib diisi'),
  body('detailBarang').trim().notEmpty().withMessage('Detail barang wajib diisi'),
  body('cogs').exists().withMessage('COGS wajib diisi').bail().isFloat({ min: 0 }).withMessage('COGS harus angka >= 0'),
  body('hargaJual').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Harga jual harus angka >= 0'),
  body('offeringPengepul').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Offering pengepul harus angka >= 0'),
  body('perusahaan').optional({ nullable: true, checkFalsy: true }).isIn(PERUSAHAAN).withMessage('Perusahaan tidak valid'),
];

const updateItemRules = [
  body('nomorSbg').optional().trim().notEmpty().withMessage('Nomor SBG tidak boleh kosong'),
  body('grade').optional().isIn(GRADES).withMessage('Grade harus salah satu dari A, B, C, D'),
  body('jenisBarang').optional().trim().notEmpty().withMessage('Jenis barang tidak boleh kosong'),
  body('detailBarang').optional().trim().notEmpty().withMessage('Detail barang tidak boleh kosong'),
  body('cogs').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('COGS harus angka >= 0'),
  body('hargaJual').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Harga jual harus angka >= 0'),
  body('offeringPengepul').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Offering pengepul harus angka >= 0'),
  body('perusahaan').optional({ nullable: true, checkFalsy: true }).isIn(PERUSAHAAN).withMessage('Perusahaan tidak valid'),
];

// ── Invoice ──
const createInvoiceRules = [
  body('namaCustomer').trim().notEmpty().withMessage('Nama customer wajib diisi'),
  body('tanggalInvoice').notEmpty().withMessage('Tanggal invoice wajib diisi'),
  body('perusahaan').optional({ nullable: true, checkFalsy: true }).isIn(PERUSAHAAN).withMessage('Perusahaan tidak valid'),
  body('itemIds').isArray({ min: 1 }).withMessage('Minimal 1 barang harus dipilih'),
  body('itemIds.*').isInt().withMessage('ID barang tidak valid'),
];

const updateInvoiceRules = [
  body('namaCustomer').optional().trim().notEmpty().withMessage('Nama customer tidak boleh kosong'),
  body('perusahaan').optional({ nullable: true, checkFalsy: true }).isIn(PERUSAHAAN).withMessage('Perusahaan tidak valid'),
];

const updateInvoiceItemsRules = [
  body('itemIds').isArray({ min: 1 }).withMessage('Minimal 1 barang harus dipilih'),
  body('itemIds.*').isInt().withMessage('ID barang tidak valid'),
];

// ── User ──
const createUserRules = [
  body('nama').trim().notEmpty().withMessage('Nama wajib diisi'),
  body('email').trim().isEmail().withMessage('Email tidak valid'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role').optional({ nullable: true, checkFalsy: true }).isIn(ROLES).withMessage('Role tidak valid'),
];

const updateUserRules = [
  body('nama').optional().trim().notEmpty().withMessage('Nama tidak boleh kosong'),
  body('email').optional().trim().isEmail().withMessage('Email tidak valid'),
  body('role').optional({ nullable: true, checkFalsy: true }).isIn(ROLES).withMessage('Role tidak valid'),
];

const resetPasswordRules = [
  body('passwordBaru').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
];

module.exports = {
  loginRules,
  changePasswordRules,
  createItemRules,
  updateItemRules,
  createInvoiceRules,
  updateInvoiceRules,
  updateInvoiceItemsRules,
  createUserRules,
  updateUserRules,
  resetPasswordRules,
};
