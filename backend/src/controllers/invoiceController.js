const prisma = require('../utils/prisma');
const { createAuditLog } = require('../utils/audit');

async function kirimNotifikasi({ userIds, judul, pesan, tipe, invoiceId }) {
  if (!userIds || userIds.length === 0) return;
  await prisma.notifikasi.createMany({
    data: userIds.map(userId => ({ userId, judul, pesan, tipe, invoiceId: invoiceId || null })),
    skipDuplicates: true,
  });
}

// Generate nomor invoice sekuensial: INV-YYYY-NNNN (mis. INV-2026-0001).
// Nomor diambil dari urutan terbesar tahun berjalan, +1. Race condition
// ditangani dengan retry pada unique constraint di createInvoice.
async function generateNomorInvoice() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { nomorInvoice: { startsWith: prefix } },
    orderBy: { nomorInvoice: 'desc' },
    select: { nomorInvoice: true },
  });
  let seq = 1;
  if (last) {
    const n = parseInt(last.nomorInvoice.slice(prefix.length), 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// Validasi sekumpulan barang layak masuk invoice: ada, belum terjual,
// punya harga jual > 0, dan tidak sedang dipakai invoice aktif lain.
// excludeInvoiceId dipakai saat edit item agar barang di invoice ini sendiri diabaikan.
// Return { items } bila lolos, atau { error } bila ada masalah.
async function validasiBarangInvoice(idList, excludeInvoiceId = null) {
  const items = await prisma.elektronik.findMany({ where: { id: { in: idList } } });
  if (!items.length) return { error: 'Tidak ada barang dipilih' };

  const sudahTerjual = items.filter(i => i.status === 'TERJUAL');
  if (sudahTerjual.length > 0) {
    return { error: `Barang berikut sudah terjual: ${sudahTerjual.map(i => i.nomorSbg).join(', ')}` };
  }

  const tanpaHarga = items.filter(i => !i.hargaJual || parseFloat(i.hargaJual) <= 0);
  if (tanpaHarga.length > 0) {
    return { error: `Barang berikut belum memiliki harga jual: ${tanpaHarga.map(i => i.nomorSbg).join(', ')}` };
  }

  const dipakai = await prisma.invoiceItem.findMany({
    where: {
      elektronikId: { in: idList },
      ...(excludeInvoiceId ? { invoiceId: { not: excludeInvoiceId } } : {}),
      invoice: { status: { in: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'PRINTED'] } },
    },
    include: { invoice: { select: { nomorInvoice: true } } },
  });
  if (dipakai.length > 0) {
    const daftar = dipakai.map(x => `${x.nomorSbg} (di ${x.invoice.nomorInvoice})`).join(', ');
    return { error: `Barang sudah ada di invoice lain yang masih aktif: ${daftar}` };
  }

  return { items };
}

const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, perusahaan } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (req.user.role === 'USER') where.createdById = req.user.id;
    if (status) where.status = status;
    if (perusahaan) where.perusahaan = perusahaan;
    if (search) {
      where.OR = [
        { nomorInvoice: { contains: search } },
        { namaCustomer: { contains: search } },
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, nama: true } },
          items: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        createdBy: { select: { id: true, nama: true } },
        items: { include: { elektronik: true } },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });
    if (req.user.role === 'USER' && invoice.createdById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { namaCustomer, noTelepon, tanggalInvoice, perusahaan, catatan, itemIds } = req.body;

    if (!namaCustomer || !tanggalInvoice) {
      return res.status(400).json({ success: false, message: 'Field wajib tidak lengkap' });
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada barang dipilih' });
    }
    const idList = itemIds.map(Number);

    const cek = await validasiBarangInvoice(idList);
    if (cek.error) return res.status(400).json({ success: false, message: cek.error });
    const items = cek.items;

    // Generate nomor invoice di backend + retry bila terjadi tabrakan (unique constraint)
    let invoice = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const nomorInvoice = await generateNomorInvoice();
      try {
        invoice = await prisma.invoice.create({
          data: {
            namaCustomer,
            noTelepon,
            nomorInvoice,
            tanggalInvoice: new Date(tanggalInvoice),
            perusahaan: perusahaan || 'SERBA_MAS',
            catatan: catatan || null,
            createdById: req.user.id,
            status: 'DRAFT',
            items: {
              create: items.map(item => ({
                elektronikId: item.id,
                nomorSbg: item.nomorSbg,
                jenisBarang: item.jenisBarang,
                detailBarang: item.detailBarang,
                hargaJual: parseFloat(item.hargaJual || 0),
                ppn: parseFloat(item.ppn || 0),
                totalHarga: parseFloat(item.totalHarga || 0),
              })),
            },
          },
          include: { items: true },
        });
        break;
      } catch (e) {
        // P2002 = unique constraint (nomor invoice tabrakan) → coba nomor berikutnya
        if (e.code === 'P2002' && attempt < 4) continue;
        throw e;
      }
    }

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `BUAT INVOICE ${invoice.nomorInvoice}`,
      tabel: 'Invoice',
      dataBaru: { nomorInvoice: invoice.nomorInvoice, namaCustomer },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: `Invoice ${invoice.nomorInvoice} berhasil dibuat`, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    if (!['DRAFT', 'REJECTED'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Invoice tidak dapat diedit pada status ini' });
    }

    if (req.user.role === 'USER' && invoice.createdById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const { namaCustomer, noTelepon, tanggalInvoice, perusahaan, catatan } = req.body;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        namaCustomer: namaCustomer || invoice.namaCustomer,
        noTelepon: noTelepon || invoice.noTelepon,
        tanggalInvoice: tanggalInvoice ? new Date(tanggalInvoice) : invoice.tanggalInvoice,
        perusahaan: perusahaan || invoice.perusahaan,
        catatan: catatan !== undefined ? catatan : invoice.catatan,
      },
    });

    res.json({ success: true, message: 'Invoice berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Ganti/atur ulang daftar barang pada invoice DRAFT atau REJECTED (M-01)
const updateInvoiceItems = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { itemIds } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    if (!['DRAFT', 'REJECTED'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Item hanya dapat diubah pada invoice Draft atau Ditolak' });
    }
    if (req.user.role === 'USER' && invoice.createdById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 barang harus dipilih' });
    }

    const idList = itemIds.map(Number);
    // Abaikan pemakaian pada invoice ini sendiri (barang lama boleh dipertahankan)
    const cek = await validasiBarangInvoice(idList, id);
    if (cek.error) return res.status(400).json({ success: false, message: cek.error });
    const items = cek.items;

    // Ganti seluruh item dalam satu transaksi
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoiceItem.createMany({
        data: items.map(item => ({
          invoiceId: id,
          elektronikId: item.id,
          nomorSbg: item.nomorSbg,
          jenisBarang: item.jenisBarang,
          detailBarang: item.detailBarang,
          hargaJual: parseFloat(item.hargaJual || 0),
          ppn: parseFloat(item.ppn || 0),
          totalHarga: parseFloat(item.totalHarga || 0),
        })),
      }),
    ]);

    const updated = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `UBAH ITEM INVOICE ${invoice.nomorInvoice} — ${items.length} barang`,
      tabel: 'Invoice',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Daftar barang invoice berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const submitApproval = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    if (!['DRAFT', 'REJECTED'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Invoice sudah disubmit sebelumnya' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'WAITING_APPROVAL', rejectedAt: null, rejectedReason: null },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `SUBMIT APPROVAL INVOICE ${invoice.nomorInvoice}`,
      tabel: 'Invoice',
      ipAddress: req.ip,
    });

    // Notifikasi ke semua ADMIN
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    await kirimNotifikasi({
      userIds: admins.map(a => a.id),
      judul: 'Invoice Menunggu Approval',
      pesan: `Invoice ${invoice.nomorInvoice} dari ${req.user.nama} memerlukan persetujuan Anda.`,
      tipe: 'APPROVAL_REQUEST',
      invoiceId: invoice.id,
    });

    res.json({ success: true, message: 'Invoice berhasil disubmit untuk approval', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const approveInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    if (invoice.status !== 'WAITING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Invoice tidak dalam status menunggu approval' });
    }

    // Segregation of duties: approver tidak boleh pembuat invoice
    if (invoice.createdById === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menyetujui invoice yang dibuat sendiri' });
    }

    // Transaction: update invoice + tandai semua barang sebagai TERJUAL
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: req.user.id, approvedByNama: req.user.nama, approvedAt: new Date() },
      }),
      ...invoice.items.map(item =>
        prisma.elektronik.update({ where: { id: item.elektronikId }, data: { status: 'TERJUAL' } })
      ),
    ]);

    const updated = await prisma.invoice.findUnique({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `APPROVE INVOICE ${invoice.nomorInvoice} — ${invoice.items.length} barang ditandai TERJUAL`,
      tabel: 'Invoice',
      ipAddress: req.ip,
    });

    // Notifikasi ke pembuat invoice
    await kirimNotifikasi({
      userIds: [invoice.createdById],
      judul: 'Invoice Disetujui',
      pesan: `Invoice ${invoice.nomorInvoice} telah disetujui oleh ${req.user.nama}.`,
      tipe: 'APPROVED',
      invoiceId: invoice.id,
    });

    res.json({ success: true, message: 'Invoice disetujui, barang ditandai TERJUAL', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const rejectInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { alasan } = req.body;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    if (invoice.status !== 'WAITING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Invoice tidak dalam status menunggu approval' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: alasan || 'Tidak ada alasan' },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `REJECT INVOICE ${invoice.nomorInvoice}: ${alasan}`,
      tabel: 'Invoice',
      ipAddress: req.ip,
    });

    // Notifikasi ke pembuat invoice
    await kirimNotifikasi({
      userIds: [invoice.createdById],
      judul: 'Invoice Ditolak',
      pesan: `Invoice ${invoice.nomorInvoice} ditolak oleh ${req.user.nama}. Alasan: ${alasan || 'Tidak ada alasan'}`,
      tipe: 'REJECTED',
      invoiceId: invoice.id,
    });

    res.json({ success: true, message: 'Invoice ditolak', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const printInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    if (invoice.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Invoice belum disetujui' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'PRINTED', printedAt: new Date() },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `CETAK INVOICE ${invoice.nomorInvoice}`,
      tabel: 'Invoice',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Invoice dicetak, status barang diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    // Hanya invoice DRAFT yang boleh dihapus
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Hanya invoice berstatus Draft yang dapat dihapus' });
    }

    if (req.user.role === 'USER' && invoice.createdById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // invoice_items ikut terhapus otomatis (onDelete: Cascade)
    await prisma.invoice.delete({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `HAPUS INVOICE ${invoice.nomorInvoice}`,
      tabel: 'Invoice',
      dataLama: { nomorInvoice: invoice.nomorInvoice, namaCustomer: invoice.namaCustomer },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Invoice berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const cancelInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { alasan } = req.body;
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });

    // Hanya invoice yang sudah APPROVED/PRINTED yang perlu di-cancel (mengembalikan status barang)
    if (!['APPROVED', 'PRINTED'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Hanya invoice yang sudah disetujui yang dapat dibatalkan' });
    }

    // Transaction: set invoice CANCELLED + kembalikan barang ke BELUM_TERJUAL
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: 'CANCELLED', rejectedReason: alasan || 'Dibatalkan setelah approval', rejectedAt: new Date() },
      }),
      ...invoice.items.map(item =>
        prisma.elektronik.update({ where: { id: item.elektronikId }, data: { status: 'BELUM_TERJUAL' } })
      ),
    ]);

    const updated = await prisma.invoice.findUnique({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `BATALKAN INVOICE ${invoice.nomorInvoice} — ${invoice.items.length} barang dikembalikan ke BELUM TERJUAL. Alasan: ${alasan || '-'}`,
      tabel: 'Invoice',
      ipAddress: req.ip,
    });

    // Notifikasi ke pembuat invoice
    await kirimNotifikasi({
      userIds: [invoice.createdById],
      judul: 'Invoice Dibatalkan',
      pesan: `Invoice ${invoice.nomorInvoice} dibatalkan oleh ${req.user.nama}. Alasan: ${alasan || 'Tidak ada alasan'}`,
      tipe: 'CANCELLED',
      invoiceId: invoice.id,
    });

    res.json({ success: true, message: 'Invoice dibatalkan, barang dikembalikan ke status Belum Terjual', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInvoices, getInvoiceById, createInvoice, updateInvoice, updateInvoiceItems, submitApproval, approveInvoice, rejectInvoice, printInvoice, deleteInvoice, cancelInvoice };
