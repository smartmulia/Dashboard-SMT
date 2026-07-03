const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getItems, getItemById, createItem, updateItem, deleteItem, importExcel, exportExcel, getStats, getRiwayat } = require('../controllers/itemController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/stats', auth, getStats);
router.get('/export', auth, exportExcel);
router.get('/riwayat', auth, getRiwayat);
router.get('/', auth, getItems);
router.get('/:id', auth, getItemById);
router.post('/', auth, createItem);
router.put('/:id', auth, updateItem);
router.delete('/:id', auth, requireRole('ADMIN', 'SUPER_USER'), deleteItem);
router.post('/import/excel', auth, upload.single('file'), importExcel);

module.exports = router;
