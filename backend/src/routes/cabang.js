const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getCabang, createCabang, updateCabang, deleteCabang } = require('../controllers/cabangController');

router.get('/', auth, getCabang);
router.post('/', auth, requireRole('ADMIN'), createCabang);
router.put('/:id', auth, requireRole('ADMIN'), updateCabang);
router.delete('/:id', auth, requireRole('ADMIN'), deleteCabang);

module.exports = router;
