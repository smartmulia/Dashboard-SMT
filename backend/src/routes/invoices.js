const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getInvoices, getInvoiceById, createInvoice, updateInvoice, submitApproval, approveInvoice, rejectInvoice, printInvoice } = require('../controllers/invoiceController');

router.get('/', auth, getInvoices);
router.get('/:id', auth, getInvoiceById);
router.post('/', auth, createInvoice);
router.put('/:id', auth, updateInvoice);
router.post('/:id/submit', auth, submitApproval);
router.post('/:id/approve', auth, requireRole('ADMIN'), approveInvoice);
router.post('/:id/reject', auth, requireRole('ADMIN'), rejectInvoice);
router.put('/:id/print', auth, printInvoice);

module.exports = router;
