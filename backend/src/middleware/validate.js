const { validationResult } = require('express-validator');

// Middleware terpusat: jalankan setelah rangkaian aturan express-validator.
// Mengembalikan pesan error pertama (agar konsisten dengan format respons lain)
// beserta daftar lengkap error pada field `errors`.
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    return res.status(400).json({ success: false, message: list[0].msg, errors: list });
  }
  next();
};

module.exports = { handleValidation };
