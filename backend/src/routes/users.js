const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { handleValidation } = require('../middleware/validate');
const { createUserRules, updateUserRules, resetPasswordRules } = require('../middleware/validators');
const { getUsers, createUser, updateUser, deleteUser, resetPassword } = require('../controllers/userController');

router.get('/', auth, requireRole('ADMIN'), getUsers);
router.post('/', auth, requireRole('ADMIN'), createUserRules, handleValidation, createUser);
router.put('/:id', auth, requireRole('ADMIN'), updateUserRules, handleValidation, updateUser);
router.delete('/:id', auth, requireRole('ADMIN'), deleteUser);
router.post('/:id/reset-password', auth, requireRole('ADMIN'), resetPasswordRules, handleValidation, resetPassword);

module.exports = router;
