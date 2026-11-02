import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Phase 2 — RMS-Rent data...');

  // Get seed users
  const pm1 = await prisma.user.findUnique({ where: { email: 'pm1@precisionmappinggis.com' } });
  const hod = await prisma.user.findUnique({ where: { email: 'hod@precisionmappinggis.com' } });

  if (!pm1 || !hod) {
    console.error('❌ Run Phase 1 seed first: node dist/prisma/seed.js');
    process.exit(1);
  }

  // Owner 1
  const owner1 = await prisma.owner.upsert({
    where: { id: 'owner-seed-001' },
    update: {},
    create: {
      id: 'owner-seed-001',
      name: 'Ramesh Gupta',
      mobile: '9100000001',
      aadhaar: '0000-0000-0001',
      pan: 'AAAAA0001A',
      bankName: 'State Bank of India',
      accountNumber: '10000000001',
      ifscCode: 'SBIN0000001',
    },
  });

  // Owner 2
  const owner2 = await prisma.owner.upsert({
    where: { id: 'owner-seed-002' },
    update: {},
    create: {
      id: 'owner-seed-002',
      name: 'Sushma Reddy',
      mobile: '9100000002',
      aadhaar: '0000-0000-0002',
      pan: 'BBBBB0002B',
      bankName: 'HDFC Bank',
      accountNumber: '20000000002',
      ifscCode: 'HDFC0000002',
    },
  });

  // Broker
  const broker1 = await prisma.broker.upsert({
    where: { id: 'broker-seed-001' },
    update: {},
    create: {
      id: 'broker-seed-001',
      name: 'Mahesh Properties',
      mobile: '9200000001',
      brokerageCharges: new Prisma.Decimal(5000),
      bankName: 'Axis Bank',
      accountNumber: '30000000003',
      ifscCode: 'UTIB0000001',
    },
  });

  // Room 1 — ACTIVE
  const room1 = await prisma.room.upsert({
    where: { roomNumber: 'PMGIS-2026-001' },
    update: {},
    create: {
      roomNumber: 'PMGIS-2026-001',
      projectName: 'Survey of Karnataka',
      city: 'Bengaluru',
      address: '12, MG Road, Bengaluru, Karnataka 560001',
      facilities: 'AC, WiFi, Parking',
      electricityIncluded: true,
      waterIncluded: true,
      startDate: new Date('2026-01-01'),
      monthlyRent: new Prisma.Decimal(18000),
      deposit: new Prisma.Decimal(36000),
      occupancyCapacity: 4,
      status: 'ACTIVE',
      agreementStartDate: new Date('2026-01-01'),
      agreementEndDate: new Date('2026-12-31'),
      agreementRemark: 'Annual lease',
      ownerId: owner1.id,
      brokerId: broker1.id,
      createdById: pm1.id,
      approvedById: hod.id,
    },
  });

  // Room 2 — PENDING_APPROVAL
  await prisma.room.upsert({
    where: { roomNumber: 'PMGIS-2026-PENDING' },
    update: {},
    create: {
      roomNumber: 'PMGIS-2026-PENDING',
      projectName: 'DRDO Land Survey',
      city: 'Hyderabad',
      address: '45, Banjara Hills, Hyderabad, Telangana 500034',
      facilities: 'AC, Security',
      electricityIncluded: false,
      waterIncluded: false,
      startDate: new Date('2026-07-01'),
      monthlyRent: new Prisma.Decimal(22000),
      deposit: new Prisma.Decimal(44000),
      occupancyCapacity: 3,
      status: 'PENDING_APPROVAL',
      ownerId: owner2.id,
      createdById: pm1.id,
    },
  });

  // Room 3 — CLOSED
  await prisma.room.upsert({
    where: { roomNumber: 'PMGIS-2025-099' },
    update: {},
    create: {
      roomNumber: 'PMGIS-2025-099',
      projectName: 'Survey of Karnataka',
      city: 'Mysuru',
      address: '7, Sayyaji Rao Road, Mysuru, Karnataka 570001',
      startDate: new Date('2025-01-01'),
      monthlyRent: new Prisma.Decimal(12000),
      deposit: new Prisma.Decimal(24000),
      occupancyCapacity: 2,
      status: 'CLOSED',
      ownerId: owner1.id,
      createdById: pm1.id,
      approvedById: hod.id,
    },
  });

  // Seed 3 payments for Room 1
  for (let month = 1; month <= 3; month++) {
    await prisma.rentPayment.upsert({
      where: { roomId_paymentMonth_paymentYear: { roomId: room1.id, paymentMonth: month, paymentYear: 2026 } },
      update: {},
      create: {
        roomId: room1.id,
        paymentMonth: month,
        paymentYear: 2026,
        rentAmount: new Prisma.Decimal(18000),
        advanceAmount: new Prisma.Decimal(0),
        paymentDate: new Date(`2026-0${month}-05`),
        remark: `Regular payment for month ${month}`,
        recordedById: pm1.id,
      },
    });
  }

  console.log('✅ Phase 2 seed complete:');
  console.log('  Rooms: PMGIS-2026-001 (ACTIVE), PMGIS-2026-PENDING (PENDING), PMGIS-2025-099 (CLOSED)');
  console.log('  Payments: Jan-Mar 2026 for Room 1');
  console.log(`  Owners: ${owner1.name}, ${owner2.name}`);
  console.log(`  Broker: ${broker1.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
