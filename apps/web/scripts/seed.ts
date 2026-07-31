import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user
  const adminEmail = 'admin@rikkei.edu.vn';
  const adminPassword = 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Admin Rikkei',
      role: 'admin',
    },
  });

  console.log(`✅ Admin user: ${admin.email} / ${adminPassword}`);

  // Seed categories
  const categories = [
    { name: 'Quy trình học vụ', slug: 'quy-trinh-hoc-vu' },
    { name: 'Quy chế thi đua', slug: 'quy-che-thi-dua' },
    { name: 'Hướng dẫn sử dụng', slug: 'huong-dan-su-dung' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ ${categories.length} categories created`);
  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());