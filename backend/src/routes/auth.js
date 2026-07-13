const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { loginRules, changePasswordRules } = require('../middleware/validators');
const { login, logout, getMe, changePassword } = require('../controllers/authController');

router.post('/login', loginRules, handleValidation, login);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/change-password', auth, changePasswordRules, handleValidation, changePassword);

module.exports = router;
