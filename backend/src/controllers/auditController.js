const prisma = require('../utils/prisma');

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, startDate, endDate, aktivitas } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (search) {
      where.OR = [
        { namaUser: { contains: search } },
        { aktivitas: { contains: search } },
      ];
    }
    if (aktivitas) where.aktivitas = { contains: aktivitas };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, nama: true, email: true, role: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAuditLogs };
