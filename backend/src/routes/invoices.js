const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { handleValidation } = require('../middleware/validate');
const { createInvoiceRules, updateInvoiceRules, updateInvoiceItemsRules } = require('../middleware/validators');
const { getInvoices, getInvoiceById, createInvoice, updateInvoice, updateInvoiceItems, submitApproval, approveInvoice, rejectInvoice, printInvoice, deleteInvoice, cancelInvoice } = require('../controllers/invoiceController');

router.get('/', auth, getInvoices);
router.get('/:id', auth, getInvoiceById);
router.post('/', auth, createInvoiceRules, handleValidation, createInvoice);
router.put('/:id', auth, updateInvoiceRules, handleValidation, updateInvoice);
router.put('/:id/items', auth, updateInvoiceItemsRules, handleValidation, updateInvoiceItems);
router.delete('/:id', auth, deleteInvoice);
router.post('/:id/submit', auth, submitApproval);
router.post('/:id/approve', auth, requireRole('ADMIN'), approveInvoice);
router.post('/:id/reject', auth, requireRole('ADMIN'), rejectInvoice);
router.post('/:id/cancel', auth, requireRole('ADMIN'), cancelInvoice);
router.put('/:id/print', auth, printInvoice);

module.exports = router;
