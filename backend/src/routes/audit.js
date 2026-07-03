const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getAuditLogs } = require('../controllers/auditController');

router.get('/', auth, requireRole('ADMIN', 'SUPER_USER'), getAuditLogs);

module.exports = router;
