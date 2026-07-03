const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getNotifikasi, getJumlahBelumDibaca, bacaNotifikasi, bacaSemuaNotifikasi } = require('../controllers/notifikasiController');

router.get('/', auth, getNotifikasi);
router.get('/jumlah', auth, getJumlahBelumDibaca);
router.patch('/:id/baca', auth, bacaNotifikasi);
router.patch('/baca-semua', auth, bacaSemuaNotifikasi);

module.exports = router;
