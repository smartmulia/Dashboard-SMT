const prisma = require('../utils/prisma');
const { createAuditLog } = require('../utils/audit');
const XLSX = require('xlsx');

const buildWhere = (query, userRole) => {
  const { search, grade, status, startDate, endDate, jenisBarang, perusahaan } = query;
  const where = {};

  if (search) {
    where.OR = [
      { nomorSbg: { contains: search } },
      { jenisBarang: { contains: search } },
      { detailBarang: { contains: search } },
      { keterangan: { contains: search } },
    ];
  }
  if (grade) where.grade = grade;
  where.status = status || 'BELUM_TERJUAL';
  if (perusahaan) where.perusahaan = perusahaan;
  if (jenisBarang) where.jenisBarang = { contains: jenisBarang };
  if (startDate || endDate) {
    where.tanggalMasuk = {};
    if (startDate) where.tanggalMasuk.gte = new Date(startDate);
    if (endDate) where.tanggalMasuk.lte = new Date(endDate + 'T23:59:59');
  }
  return where;
};

const getItems = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = buildWhere(req.query, req.user.role);

    const [total, items] = await Promise.all([
      prisma.elektronik.count({ where }),
      prisma.elektronik.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    const hideCogs = req.user.role === 'USER';
    const data = hideCogs ? items.map(i => { const { cogs, ...rest } = i; return rest; }) : items;

    res.json({
      success: true,
      data,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await prisma.elektronik.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!item) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

    if (req.user.role === 'USER') {
      const { cogs, ...rest } = item;
      return res.json({ success: true, data: rest });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createItem = async (req, res) => {
  try {
    const { nomorSbg, grade, jenisBarang, detailBarang, keterangan, cogs, offeringPengepul, hargaJual, perusahaan } = req.body;

    if (!nomorSbg || !grade || !jenisBarang || !detailBarang || cogs === undefined) {
      return res.status(400).json({ success: false, message: 'Field wajib tidak lengkap' });
    }

    const existing = await prisma.elektronik.findUnique({ where: { nomorSbg } });
    if (existing) return res.status(400).json({ success: false, message: 'Nomor SBG sudah ada' });

    const cogsNum = parseFloat(cogs);
    const hargaJualNum = hargaJual ? parseFloat(hargaJual) : null;
    const ppn = hargaJualNum ? parseFloat((hargaJualNum * 0.011).toFixed(2)) : null;
    const totalHarga = hargaJualNum && ppn ? parseFloat((hargaJualNum + ppn).toFixed(2)) : null;
    const profit = hargaJualNum ? parseFloat((hargaJualNum - cogsNum).toFixed(2)) : null;

    const item = await prisma.elektronik.create({
      data: {
        nomorSbg,
        grade,
        jenisBarang,
        detailBarang,
        keterangan: keterangan || null,
        cogs: cogsNum,
        offeringPengepul: offeringPengepul ? parseFloat(offeringPengepul) : null,
        hargaJual: hargaJualNum,
        ppn,
        totalHarga,
        profit,
        perusahaan: perusahaan || 'SERBA_MAS',
      },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: 'TAMBAH DATA ELEKTRONIK',
      tabel: 'Elektronik',
      dataBaru: item,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Data berhasil ditambahkan', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.elektronik.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

    const { nomorSbg, grade, jenisBarang, detailBarang, keterangan, cogs, offeringPengepul, hargaJual, status, perusahaan } = req.body;

    if (nomorSbg && nomorSbg !== existing.nomorSbg) {
      const dup = await prisma.elektronik.findUnique({ where: { nomorSbg } });
      if (dup) return res.status(400).json({ success: false, message: 'Nomor SBG sudah ada' });
    }

    const cogsNum = cogs !== undefined ? parseFloat(cogs) : parseFloat(existing.cogs);
    const hargaJualNum = hargaJual !== undefined ? (hargaJual ? parseFloat(hargaJual) : null) : (existing.hargaJual ? parseFloat(existing.hargaJual) : null);
    const ppn = hargaJualNum ? parseFloat((hargaJualNum * 0.011).toFixed(2)) : null;
    const totalHarga = hargaJualNum && ppn ? parseFloat((hargaJualNum + ppn).toFixed(2)) : null;
    const profit = hargaJualNum ? parseFloat((hargaJualNum - cogsNum).toFixed(2)) : null;

    const updated = await prisma.elektronik.update({
      where: { id },
      data: {
        nomorSbg: nomorSbg || existing.nomorSbg,
        grade: grade || existing.grade,
        jenisBarang: jenisBarang || existing.jenisBarang,
        detailBarang: detailBarang || existing.detailBarang,
        keterangan: keterangan !== undefined ? keterangan : existing.keterangan,
        cogs: cogsNum,
        offeringPengepul: offeringPengepul !== undefined ? (offeringPengepul ? parseFloat(offeringPengepul) : null) : existing.offeringPengepul,
        hargaJual: hargaJualNum,
        ppn,
        totalHarga,
        profit,
        status: status || existing.status,
        perusahaan: perusahaan || existing.perusahaan,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: 'EDIT DATA ELEKTRONIK',
      tabel: 'Elektronik',
      dataLama: existing,
      dataBaru: updated,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Data berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.elektronik.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

    await prisma.elektronik.delete({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: 'HAPUS DATA ELEKTRONIK',
      tabel: 'Elektronik',
      dataLama: existing,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const importExcel = async (req, res) => {
  try {
    const { mapping, perusahaan } = req.body;
    const mappingObj = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;

    if (!req.file) return res.status(400).json({ success: false, message: 'File Excel tidak ditemukan' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let berhasil = 0, gagal = 0, duplicate = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const nomorSbg = String(row[mappingObj.nomorSbg] || '').trim();
        const jenisBarang = String(row[mappingObj.jenisBarang] || '').trim();
        const detailBarang = String(row[mappingObj.detailBarang] || '').trim();
        const grade = String(row[mappingObj.grade] || '').trim().toUpperCase();
        const cogs = parseFloat(row[mappingObj.cogs] || 0);
        const offeringPengepul = mappingObj.offeringPengepul ? parseFloat(row[mappingObj.offeringPengepul] || 0) : null;
        const hargaJual = mappingObj.hargaJual ? parseFloat(row[mappingObj.hargaJual] || 0) : null;
        const keterangan = mappingObj.keterangan ? String(row[mappingObj.keterangan] || '') : null;

        if (!nomorSbg || !jenisBarang || !detailBarang || !['A','B','C','D'].includes(grade)) {
          gagal++;
          errors.push({ nomorSbg, pesan: 'Data tidak lengkap atau grade tidak valid' });
          continue;
        }

        const ppn = hargaJual ? parseFloat((hargaJual * 0.011).toFixed(2)) : null;
        const totalHarga = hargaJual && ppn ? parseFloat((hargaJual + ppn).toFixed(2)) : null;
        const profit = hargaJual ? parseFloat((hargaJual - cogs).toFixed(2)) : null;

        const existing = await prisma.elektronik.findUnique({ where: { nomorSbg } });
        if (existing) {
          await prisma.elektronik.update({
            where: { nomorSbg },
            data: { grade, jenisBarang, detailBarang, keterangan, cogs, offeringPengepul, hargaJual, ppn, totalHarga, profit, perusahaan: perusahaan || 'SERBA_MAS' },
          });
          duplicate++;
        } else {
          await prisma.elektronik.create({
            data: { nomorSbg, grade, jenisBarang, detailBarang, keterangan, cogs, offeringPengepul, hargaJual, ppn, totalHarga, profit, perusahaan: perusahaan || 'SERBA_MAS' },
          });
          berhasil++;
        }
      } catch (e) {
        gagal++;
        errors.push({ pesan: e.message });
      }
    }

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `IMPORT EXCEL (${berhasil} baru, ${duplicate} update, ${gagal} gagal)`,
      tabel: 'Elektronik',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Import selesai',
      data: { total: rows.length, berhasil, duplicate, gagal, errors },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const exportExcel = async (req, res) => {
  try {
    const where = buildWhere(req.query, req.user.role);
    const items = await prisma.elektronik.findMany({ where, orderBy: { createdAt: 'desc' } });

    const hideCogs = req.user.role === 'USER';

    const data = items.map((item, idx) => {
      const row = {
        No: idx + 1,
        'Nomor SBG': item.nomorSbg,
        Grade: item.grade,
        'Jenis Barang': item.jenisBarang,
        'Detail Barang': item.detailBarang,
        Keterangan: item.keterangan || '',
        'Offering Pengepul': item.offeringPengepul ? parseFloat(item.offeringPengepul) : '',
        'Harga Jual': item.hargaJual ? parseFloat(item.hargaJual) : '',
        'PPN (1.1%)': item.ppn ? parseFloat(item.ppn) : '',
        'Total Harga': item.totalHarga ? parseFloat(item.totalHarga) : '',
        'Profit': item.profit ? parseFloat(item.profit) : '',
        Status: item.status === 'BELUM_TERJUAL' ? 'Belum Terjual' : 'Terjual',
        Perusahaan: item.perusahaan === 'VOLARY' ? 'Volary' : 'Serba Mas',
        'Tanggal Masuk': new Date(item.tanggalMasuk).toLocaleDateString('id-ID'),
      };
      if (!hideCogs) row['COGS'] = parseFloat(item.cogs);
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Elektronik');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await createAuditLog({
      userId: req.user.id,
      namaUser: req.user.nama,
      aktivitas: `EXPORT EXCEL (${items.length} data)`,
      tabel: 'Elektronik',
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Data-Elektronik-${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const { perusahaan, startDate, endDate } = req.query;
    const where = perusahaan ? { perusahaan } : {};

    if (startDate || endDate) {
      where.tanggalMasuk = {};
      if (startDate) where.tanggalMasuk.gte = new Date(startDate);
      if (endDate) where.tanggalMasuk.lte = new Date(endDate + 'T23:59:59');
    }

    // Rentang untuk trend chart
    const trendStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendEnd = endDate ? new Date(endDate + 'T23:59:59') : new Date();

    const trendQuery = perusahaan
      ? prisma.$queryRaw`SELECT DATE(tanggal_masuk) as tanggal, CAST(COUNT(*) AS UNSIGNED) as jumlah FROM elektronik WHERE tanggal_masuk >= ${trendStart} AND tanggal_masuk <= ${trendEnd} AND perusahaan = ${perusahaan} GROUP BY DATE(tanggal_masuk) ORDER BY tanggal`
      : prisma.$queryRaw`SELECT DATE(tanggal_masuk) as tanggal, CAST(COUNT(*) AS UNSIGNED) as jumlah FROM elektronik WHERE tanggal_masuk >= ${trendStart} AND tanggal_masuk <= ${trendEnd} GROUP BY DATE(tanggal_masuk) ORDER BY tanggal`;

    const [
      totalSbg,
      totalCogs,
      totalHargaJual,
      totalTerjual,
      gradeDistribution,
      topProfit,
      topHargaJual,
      trendHarian,
      profitItems,
      rugiItems,
    ] = await Promise.all([
      prisma.elektronik.count({ where }),
      prisma.elektronik.aggregate({ _sum: { cogs: true }, where }),
      prisma.elektronik.aggregate({ _sum: { hargaJual: true, profit: true }, where }),
      prisma.elektronik.count({ where: { ...where, status: 'TERJUAL' } }),
      prisma.elektronik.groupBy({ by: ['grade'], _count: { grade: true }, where }),
      prisma.elektronik.findMany({ where: { ...where, profit: { gt: 0 } }, orderBy: { profit: 'desc' }, take: 10, select: { nomorSbg: true, jenisBarang: true, detailBarang: true, profit: true } }),
      prisma.elektronik.findMany({ where: { ...where, hargaJual: { not: null } }, orderBy: { hargaJual: 'desc' }, take: 10, select: { nomorSbg: true, jenisBarang: true, detailBarang: true, hargaJual: true } }),
      trendQuery,
      prisma.elektronik.findMany({
        where: { ...where, profit: { gt: 0 } },
        select: { tanggalMasuk: true, hargaJual: true, cogs: true, profit: true },
        orderBy: { tanggalMasuk: 'asc' },
      }),
      prisma.elektronik.findMany({
        where: { ...where, profit: { lt: 0 } },
        select: { tanggalMasuk: true, hargaJual: true, cogs: true, profit: true },
        orderBy: { tanggalMasuk: 'asc' },
      }),
    ]);

    const totalHargaJualNum = parseFloat(totalHargaJual._sum.hargaJual || 0);
    const totalProfitNum = parseFloat(totalHargaJual._sum.profit || 0);
    const persentaseProfit = totalHargaJualNum > 0 ? ((totalProfitNum / totalHargaJualNum) * 100).toFixed(2) : 0;

    const trendHarianSafe = trendHarian.map(row => ({
      tanggal: row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : String(row.tanggal),
      jumlah: Number(row.jumlah),
    }));

    // Agregasi profit per bulan (hanya item dengan profit > 0)
    const byMonth = {};
    profitItems.forEach(item => {
      const bulan = item.tanggalMasuk.toISOString().slice(0, 7);
      if (!byMonth[bulan]) byMonth[bulan] = { bulan, totalHargaJual: 0, totalCogs: 0, totalProfit: 0, jumlah: 0 };
      byMonth[bulan].totalHargaJual += parseFloat(item.hargaJual || 0);
      byMonth[bulan].totalCogs += parseFloat(item.cogs || 0);
      byMonth[bulan].totalProfit += parseFloat(item.profit || 0);
      byMonth[bulan].jumlah += 1;
    });
    const trendProfit = Object.values(byMonth).sort((a, b) => a.bulan.localeCompare(b.bulan));

    // Agregasi rugi per bulan (hanya item dengan profit < 0, rugi = COGS - HJ)
    const byMonthRugi = {};
    rugiItems.forEach(item => {
      const bulan = item.tanggalMasuk.toISOString().slice(0, 7);
      if (!byMonthRugi[bulan]) byMonthRugi[bulan] = { bulan, totalHargaJual: 0, totalCogs: 0, totalRugi: 0, jumlah: 0 };
      byMonthRugi[bulan].totalHargaJual += parseFloat(item.hargaJual || 0);
      byMonthRugi[bulan].totalCogs += parseFloat(item.cogs || 0);
      byMonthRugi[bulan].totalRugi += Math.abs(parseFloat(item.profit || 0));
      byMonthRugi[bulan].jumlah += 1;
    });
    const trendRugi = Object.values(byMonthRugi).sort((a, b) => a.bulan.localeCompare(b.bulan));

    res.json({
      success: true,
      data: {
        totalSbg,
        totalCogs: parseFloat(totalCogs._sum.cogs || 0),
        totalHargaJual: totalHargaJualNum,
        totalProfit: totalProfitNum,
        persentaseProfit: parseFloat(persentaseProfit),
        totalTerjual,
        totalBelumTerjual: totalSbg - totalTerjual,
        gradeDistribution,
        topProfit,
        topHargaJual,
        trendHarian: trendHarianSafe,
        trendProfit,
        trendRugi,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getRiwayat = async (req, res) => {
  try {
    const { perusahaan, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'TERJUAL' };
    if (perusahaan) where.perusahaan = perusahaan;
    if (search) {
      where.OR = [
        { jenisBarang: { contains: search } },
        { detailBarang: { contains: search } },
        { nomorSbg: { contains: search } },
        { invoiceItems: { some: { invoice: { OR: [
          { namaCustomer: { contains: search } },
          { nomorInvoice: { contains: search } },
        ] } } } },
      ];
    }

    const [total, agregat, items] = await Promise.all([
      prisma.elektronik.count({ where }),
      prisma.elektronik.aggregate({
        where,
        _sum: { profit: true, totalHarga: true, hargaJual: true },
      }),
      prisma.elektronik.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          invoiceItems: {
            include: {
              invoice: {
                select: { nomorInvoice: true, namaCustomer: true, noTelepon: true, approvedAt: true, approvedByNama: true, tanggalInvoice: true },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: items,
      summary: {
        totalBarang: total,
        totalProfit: parseFloat(agregat._sum.profit || 0),
        totalHargaJual: parseFloat(agregat._sum.hargaJual || 0),
        totalNilai: parseFloat(agregat._sum.totalHarga || 0),
      },
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getItems, getItemById, createItem, updateItem, deleteItem, importExcel, exportExcel, getStats, getRiwayat };
