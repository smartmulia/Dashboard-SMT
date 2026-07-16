const prisma = require('../utils/prisma');
const { simpanGambar, hapusGambar: hapusFileGambar } = require('../utils/storage');

const getKatalog = async (req, res) => {
  try {
    const { kategori, jenisBarang, tersedia, search, cabangId } = req.query;
    const where = {};
    if (kategori) where.kategori = kategori;
    if (jenisBarang) where.jenisBarang = jenisBarang;
    if (tersedia !== undefined) where.tersedia = tersedia === 'true';
    if (cabangId) where.cabangId = parseInt(cabangId);
    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { deskripsi: { contains: search } },
        { jenisBarang: { contains: search } },
      ];
    }
    const items = await prisma.katalogEmas.findMany({
      where,
      orderBy: [{ kategori: 'asc' }, { urutan: 'asc' }, { createdAt: 'asc' }],
      include: { cabang: { select: { id: true, nama: true } } },
    });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memuat katalog' });
  }
};

const getKatalogById = async (req, res) => {
  try {
    const item = await prisma.katalogEmas.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!item) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat item' });
  }
};

const createKatalog = async (req, res) => {
  try {
    const { kategori, jenisBarang, nama, deskripsi, harga, tersedia, urutan, cabangId } = req.body;
    if (!kategori || !jenisBarang || !nama || !harga) {
      return res.status(400).json({ success: false, message: 'Kategori, jenis barang, nama, dan harga wajib diisi' });
    }
    let gambar = null;
    if (req.file) {
      gambar = await simpanGambar(req.file, 'katalog');
    }
    const item = await prisma.katalogEmas.create({
      data: {
        cabangId: cabangId ? parseInt(cabangId) : null,
        kategori,
        jenisBarang,
        nama,
        deskripsi: deskripsi || null,
        harga: parseFloat(harga),
        gambar,
        tersedia: tersedia === 'false' ? false : true,
        urutan: urutan ? parseInt(urutan) : 0,
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal membuat item katalog' });
  }
};

const updateKatalog = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.katalogEmas.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });

    const { kategori, jenisBarang, nama, deskripsi, harga, tersedia, urutan, cabangId } = req.body;
    let gambar = existing.gambar;

    if (req.file) {
      // Hapus gambar lama jika ada (OSS atau lokal, terdeteksi otomatis)
      if (existing.gambar) await hapusFileGambar(existing.gambar);
      gambar = await simpanGambar(req.file, 'katalog');
    }

    const item = await prisma.katalogEmas.update({
      where: { id },
      data: {
        ...(cabangId !== undefined && { cabangId: cabangId ? parseInt(cabangId) : null }),
        ...(kategori && { kategori }),
        ...(jenisBarang && { jenisBarang }),
        ...(nama && { nama }),
        deskripsi: deskripsi !== undefined ? deskripsi || null : existing.deskripsi,
        ...(harga && { harga: parseFloat(harga) }),
        ...(tersedia !== undefined && { tersedia: tersedia === 'false' ? false : true }),
        ...(urutan !== undefined && { urutan: parseInt(urutan) }),
        gambar,
      },
    });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui item katalog' });
  }
};

const deleteKatalog = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.katalogEmas.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });

    if (existing.gambar) await hapusFileGambar(existing.gambar);
    await prisma.katalogEmas.delete({ where: { id } });
    res.json({ success: true, message: 'Item berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus item' });
  }
};

const hapusGambar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.katalogEmas.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });
    if (existing.gambar) await hapusFileGambar(existing.gambar);
    await prisma.katalogEmas.update({ where: { id }, data: { gambar: null } });
    res.json({ success: true, message: 'Gambar berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus gambar' });
  }
};

module.exports = { getKatalog, getKatalogById, createKatalog, updateKatalog, deleteKatalog, hapusGambar };
