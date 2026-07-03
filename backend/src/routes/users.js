const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getUsers, createUser, updateUser, deleteUser, resetPassword } = require('../controllers/userController');

router.get('/', auth, requireRole('ADMIN'), getUsers);
router.post('/', auth, requireRole('ADMIN'), createUser);
router.put('/:id', auth, requireRole('ADMIN'), updateUser);
router.delete('/:id', auth, requireRole('ADMIN'), deleteUser);
router.post('/:id/reset-password', auth, requireRole('ADMIN'), resetPassword);

module.exports = router;
