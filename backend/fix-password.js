const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fixPasswords() {
  const hash = await bcrypt.hash('admin123', 10);

  const users = [
    { email: 'admin@smt.com',     nama: 'Administrator', role: 'ADMIN'      },
    { email: 'superuser@smt.com', nama: 'Super User',    role: 'SUPER_USER' },
    { email: 'user@smt.com',      nama: 'User Biasa',    role: 'USER'       },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash },
      create: { ...u, password: hash, isActive: true },
    });
    console.log('Password diperbaiki:', u.email);
  }

  const all = await prisma.user.findMany({
    select: { id: true, nama: true, email: true, role: true, isActive: true },
  });
  console.log('\nUser tersedia:');
  all.forEach(u => console.log(` - ${u.email} [${u.role}] aktif: ${u.isActive}`));
  console.log('\nPassword semua user: admin123');

  await prisma.$disconnect();
}

fixPasswords().catch(e => { console.error(e); process.exit(1); });
