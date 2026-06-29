import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash,
      name: 'Demo User',
    },
  });

  const stripe = await prisma.company.upsert({
    where: { id: 'seed-company-stripe' },
    update: {},
    create: {
      id: 'seed-company-stripe',
      userId: user.id,
      name: 'Stripe',
      website: 'https://stripe.com',
      industry: 'Fintech',
      size: '1000+',
    },
  });

  const linear = await prisma.company.upsert({
    where: { id: 'seed-company-linear' },
    update: {},
    create: {
      id: 'seed-company-linear',
      userId: user.id,
      name: 'Linear',
      website: 'https://linear.app',
      industry: 'Software',
      size: '51-200',
    },
  });

  await prisma.job.upsert({
    where: { id: 'seed-job-stripe-fe' },
    update: {},
    create: {
      id: 'seed-job-stripe-fe',
      companyId: stripe.id,
      userId: user.id,
      title: 'Senior Frontend Engineer',
      location: 'Remote',
      type: 'REMOTE',
      source: 'LinkedIn',
    },
  });

  await prisma.job.upsert({
    where: { id: 'seed-job-linear-pe' },
    update: {},
    create: {
      id: 'seed-job-linear-pe',
      companyId: linear.id,
      userId: user.id,
      title: 'Product Engineer',
      location: 'San Francisco, CA',
      type: 'FULL_TIME',
      source: 'Company site',
    },
  });

  console.log('Seed complete. Demo login: demo@example.com / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
