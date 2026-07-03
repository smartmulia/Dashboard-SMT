const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getKatalog, getKatalogById, createKatalog, updateKatalog, deleteKatalog, hapusGambar } = require('../controllers/katalogController');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/katalog');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `katalog_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

router.get('/', auth, getKatalog);
router.get('/:id', auth, getKatalogById);
router.post('/', auth, requireRole('ADMIN', 'SUPER_USER', 'KATALOG_USER'), upload.single('gambar'), createKatalog);
router.put('/:id', auth, requireRole('ADMIN', 'SUPER_USER', 'KATALOG_USER'), upload.single('gambar'), updateKatalog);
router.delete('/:id/gambar', auth, requireRole('ADMIN', 'SUPER_USER', 'KATALOG_USER'), hapusGambar);
router.delete('/:id', auth, requireRole('ADMIN', 'SUPER_USER', 'KATALOG_USER'), deleteKatalog);

module.exports = router;
