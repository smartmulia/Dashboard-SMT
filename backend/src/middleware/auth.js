const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User tidak valid atau nonaktif' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};
