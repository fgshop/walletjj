import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create SUPER_ADMIN
  const adminEmail = 'admin@jojuwallet.com';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123!', 10);
    const admin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`SUPER_ADMIN created: ${admin.email}`);
  } else {
    console.log(`SUPER_ADMIN already exists: ${adminEmail}`);
  }

  // 2. Create default SupportedToken (USDT TRC-20 on Shasta testnet)
  const usdtContract = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs';
  const existingToken = await prisma.supportedToken.findUnique({
    where: { contractAddress: usdtContract },
  });

  if (!existingToken) {
    const token = await prisma.supportedToken.create({
      data: {
        contractAddress: usdtContract,
        symbol: 'USDT',
        name: 'Tether USD (TRC-20)',
        decimals: 6,
        isActive: true,
        sortOrder: 1,
      },
    });
    console.log(`Token created: ${token.symbol} (${token.contractAddress})`);
  } else {
    console.log(`Token already exists: ${usdtContract}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
