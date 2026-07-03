const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { createAuditLog } = require('../utils/audit');

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nama: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!nama || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { nama, email, password: hashed, role: role || 'USER' },
      select: { id: true, nama: true, email: true, role: true, createdAt: true },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `BUAT USER: ${email} (${role || 'USER'})`,
      tabel: 'User',
      dataBaru: { nama, email, role },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'User berhasil dibuat', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nama, email, role, isActive } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    if (email && email !== existing.email) {
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) return res.status(400).json({ success: false, message: 'Email sudah digunakan' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        nama: nama || existing.nama,
        email: email || existing.email,
        role: role || existing.role,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      select: { id: true, nama: true, email: true, role: true, isActive: true },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `EDIT USER: ${existing.email}`,
      tabel: 'User',
      dataLama: { nama: existing.nama, email: existing.email, role: existing.role },
      dataBaru: { nama: updated.nama, email: updated.email, role: updated.role },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'User berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun sendiri' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `HAPUS USER: ${existing.email}`,
      tabel: 'User',
      dataLama: { nama: existing.nama, email: existing.email, role: existing.role },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { passwordBaru } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const hashed = await bcrypt.hash(passwordBaru || 'password123', 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `RESET PASSWORD USER: ${existing.email}`,
      tabel: 'User',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password berhasil direset' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, resetPassword };
