const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getItems, getItemById, createItem, updateItem, deleteItem, importExcel, exportExcel, getStats, getRiwayat } = require('../controllers/itemController');

// Whitelist tipe file Excel untuk import
const EXCEL_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xls)$/i.test(file.originalname);
    if (EXCEL_MIME.includes(file.mimetype) || okExt) cb(null, true);
    else cb(new Error('Hanya file Excel (.xlsx, .xls) yang diizinkan'));
  },
});

router.get('/stats', auth, getStats);
router.get('/export', auth, exportExcel);
router.get('/riwayat', auth, getRiwayat);
router.get('/', auth, getItems);
router.get('/:id', auth, getItemById);
router.post('/', auth, requireRole('ADMIN', 'SUPER_USER'), createItem);
router.put('/:id', auth, requireRole('ADMIN', 'SUPER_USER'), updateItem);
router.delete('/:id', auth, requireRole('ADMIN', 'SUPER_USER'), deleteItem);
router.post('/import/excel', auth, requireRole('ADMIN', 'SUPER_USER'), upload.single('file'), importExcel);

module.exports = router;
