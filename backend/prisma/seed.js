const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smt.com' },
    update: {},
    create: {
      nama: 'Administrator',
      email: 'admin@smt.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const superUser = await prisma.user.upsert({
    where: { email: 'superuser@smt.com' },
    update: {},
    create: {
      nama: 'Super User',
      email: 'superuser@smt.com',
      password: hashedPassword,
      role: 'SUPER_USER',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@smt.com' },
    update: {},
    create: {
      nama: 'User Biasa',
      email: 'user@smt.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  console.log('Seed berhasil:', { admin, superUser, user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
