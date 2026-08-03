import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Admin credentials — MUST be set via env for production seeding
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Admin Rikkei';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.');
  console.error('   Example: ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=YourSecurePass123 npm run db:seed');
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
  console.error('❌ ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user (ADMIN_PASSWORD guaranteed non-empty by check above)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      // Do NOT update password on re-seed — preserves manual changes
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: ADMIN_NAME,
      role: 'admin',
    },
  });

  console.log(`✅ Admin user: ${admin.email}`);
  console.log('   (Use the ADMIN_PASSWORD you set; password is not echoed for security.)');

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