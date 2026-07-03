const prisma = require('./prisma');

async function createAuditLog({ userId, namaUser, aktivitas, tabel, dataLama, dataBaru, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        namaUser: namaUser || null,
        aktivitas,
        tabel: tabel || null,
        dataLama: dataLama || null,
        dataBaru: dataBaru || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Gagal membuat audit log:', err);
  }
}

module.exports = { createAuditLog };
