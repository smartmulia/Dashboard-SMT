const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { createAuditLog } = require('../utils/audit');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await createAuditLog({
      userId: user.id,
      namaUser: user.nama,
      aktivitas: 'LOGIN',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: { id: user.id, nama: user.nama, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const logout = async (req, res) => {
  try {
    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: 'LOGOUT',
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Logout berhasil' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nama: true, email: true, role: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { passwordLama, passwordBaru } = req.body;
    if (!passwordLama || !passwordBaru) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(passwordLama, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Password lama salah' });
    }

    const hashed = await bcrypt.hash(passwordBaru, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: 'GANTI PASSWORD',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { login, logout, getMe, changePassword };
