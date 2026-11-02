import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear any existing employee test user to prevent unique constraints
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'employee@precisionmappinggis.com' },
        { employeeId: 'EMP-2026-0007' }
      ]
    }
  });

  const hash = (pwd: string) => bcrypt.hash(pwd, 10);

  // Create seed users with clearly fake data (no real PAN/Aadhaar)
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hradmin@precisionmappinggis.com' },
    update: {
      name: 'Sachin Nichale',
    },
    create: {
      employeeId: 'EMP-2026-0001',
      name: 'Sachin Nichale',
      email: 'hradmin@precisionmappinggis.com',
      mobile: '9000000001',
      role: 'HR_ADMIN',
      passwordHash: await hash('Admin@1234'),
      status: 'ACTIVE',
    },
  });

  const financeManager = await prisma.user.upsert({
    where: { email: 'finance@precisionmappinggis.com' },
    update: {},
    create: {
      employeeId: 'EMP-2026-0002',
      name: 'Ravi Joshi',
      email: 'finance@precisionmappinggis.com',
      mobile: '9000000002',
      role: 'FINANCE_MANAGER',
      passwordHash: await hash('Finance@1234'),
      status: 'ACTIVE',
    },
  });

  const hod = await prisma.user.upsert({
    where: { email: 'hod@precisionmappinggis.com' },
    update: {},
    create: {
      employeeId: 'EMP-2026-0003',
      name: 'Sunita Patel',
      email: 'hod@precisionmappinggis.com',
      mobile: '9000000003',
      role: 'HOD',
      passwordHash: await hash('Hod@1234'),
      status: 'ACTIVE',
    },
  });

  const reportingManager = await prisma.user.upsert({
    where: { email: 'manager@precisionmappinggis.com' },
    update: {},
    create: {
      employeeId: 'EMP-2026-0004',
      name: 'Deepak Kulkarni',
      email: 'manager@precisionmappinggis.com',
      mobile: '9000000004',
      role: 'REPORTING_MANAGER',
      passwordHash: await hash('Manager@1234'),
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'pm1@precisionmappinggis.com' },
    update: {},
    create: {
      employeeId: 'EMP-2026-0005',
      name: 'Amit Verma',
      email: 'pm1@precisionmappinggis.com',
      mobile: '9000000005',
      role: 'PROJECT_MANAGER',
      passwordHash: await hash('Pm@1234'),
      reportingManagerId: reportingManager.id,
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'pm2@precisionmappinggis.com' },
    update: {},
    create: {
      employeeId: 'EMP-2026-0006',
      name: 'Priya Nair',
      email: 'pm2@precisionmappinggis.com',
      mobile: '9000000006',
      role: 'PROJECT_MANAGER',
      passwordHash: await hash('Pm@1234'),
      reportingManagerId: reportingManager.id,
      status: 'ACTIVE',
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@precisionmappinggis.com' },
    update: {},
    create: {
      employeeId: 'EMP-2026-0007',
      name: 'Vikram Singh',
      email: 'employee@precisionmappinggis.com',
      mobile: '9000000007',
      role: 'EMPLOYEE',
      passwordHash: await hash('Employee@1234'),
      reportingManagerId: reportingManager.id,
      status: 'ACTIVE',
    },
  });

  // Clear Task and Phase 2 data to prevent duplicates on re-seed
  await prisma.task.deleteMany();
  await prisma.rentPayment.deleteMany();
  await prisma.roomClosure.deleteMany();
  await prisma.room.deleteMany();
  await prisma.broker.deleteMany();
  await prisma.owner.deleteMany();

  // --- Phase 2: Seed RMS-Rent ---
  const broker1 = await prisma.broker.create({
    data: {
      name: 'Ramesh Broker',
      mobile: '9876543210',
      brokerageCharges: 5000,
      bankName: 'HDFC Bank',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
    }
  });

  const owner1 = await prisma.owner.create({
    data: {
      name: 'Suresh Landlord',
      mobile: '9876543211',
      aadhaar: '1111-2222-3333',
      pan: 'ABCDE1234F',
      bankName: 'SBI',
      accountNumber: '0987654321',
      ifscCode: 'SBIN0004321',
    }
  });

  // Room 1: ACTIVE
  await prisma.room.create({
    data: {
      roomNumber: 'PMGIS-2026-001',
      projectName: 'Project Alpha',
      city: 'Mumbai',
      address: '101, Alpha Tower, Andheri',
      facilities: 'AC, WiFi',
      electricityIncluded: false,
      waterIncluded: true,
      startDate: new Date('2026-01-01'),
      monthlyRent: 15000,
      deposit: 30000,
      occupancyCapacity: 2,
      status: 'ACTIVE',
      brokerId: broker1.id,
      ownerId: owner1.id,
      createdById: hrAdmin.id, // using hrAdmin just as a creator
      approvedById: hod.id,
    }
  });

  // Room 2: PENDING_APPROVAL
  await prisma.room.create({
    data: {
      projectName: 'Project Beta',
      city: 'Pune',
      address: '202, Beta Heights, Hinjewadi',
      facilities: 'Non-AC',
      electricityIncluded: true,
      waterIncluded: true,
      startDate: new Date('2026-06-01'),
      monthlyRent: 12000,
      deposit: 24000,
      occupancyCapacity: 3,
      status: 'PENDING_APPROVAL',
      brokerId: broker1.id,
      ownerId: owner1.id,
      createdById: hrAdmin.id,
    }
  });

  // Room 3: PENDING_CLOSURE
  await prisma.room.create({
    data: {
      roomNumber: 'PMGIS-2026-002',
      projectName: 'Project Alpha',
      city: 'Mumbai',
      address: '303, Gamma Block, Bandra',
      facilities: 'AC',
      electricityIncluded: false,
      waterIncluded: false,
      startDate: new Date('2025-01-01'),
      monthlyRent: 20000,
      deposit: 40000,
      occupancyCapacity: 1,
      status: 'PENDING_CLOSURE',
      brokerId: broker1.id,
      ownerId: owner1.id,
      createdById: hrAdmin.id,
      approvedById: hod.id,
    }
  });

  // --- Phase 3: Seed ReMS ---
  await prisma.expenseEntry.deleteMany();
  await prisma.reimbursementRequest.deleteMany();
  await prisma.advanceRequest.deleteMany();

  // Employee for ReMS requests
  const pm1 = await prisma.user.findUnique({ where: { email: 'pm1@precisionmappinggis.com' } });
  
  if (pm1) {
    // Advance 1: PENDING_MANAGER
    await prisma.advanceRequest.create({
      data: {
        referenceNumber: 'ADV/2026/0001',
        employeeId: pm1.id,
        projectName: 'Project Alpha',
        purpose: 'Site Visit Travel',
        amount: 15000,
        expenseHead: 'Travel',
        expectedDate: new Date('2026-08-01'),
        status: 'PENDING_MANAGER',
      }
    });

    // Advance 2: PENDING_FINANCE
    await prisma.advanceRequest.create({
      data: {
        referenceNumber: 'ADV/2026/0002',
        employeeId: pm1.id,
        projectName: 'Project Beta',
        purpose: 'Equipment Purchase',
        amount: 8000,
        expenseHead: 'Stationery',
        expectedDate: new Date('2026-07-15'),
        status: 'PENDING_FINANCE',
        managerRemark: 'Approved, please process',
      }
    });

    // Reimbursement 1: PENDING_MANAGER
    await prisma.reimbursementRequest.create({
      data: {
        referenceNumber: 'REIMB/2026/0001',
        employeeId: pm1.id,
        projectName: 'Project Alpha',
        travelActivityDetails: 'Travel to Mumbai site',
        totalAmount: 12000,
        status: 'PENDING_MANAGER',
        expenseEntries: {
          create: [
            {
              expenseHead: 'Travel',
              amount: 8000,
              expenseDate: new Date('2026-07-02'),
              billType: 'INVOICE',
              documentUrl: '/uploads/invoice1.pdf',
              tdsApplicable: false,
            },
            {
              expenseHead: 'Food',
              amount: 4000,
              expenseDate: new Date('2026-07-03'),
              billType: 'CASH_VOUCHER',
              documentUrl: '/uploads/voucher1.pdf',
              tdsApplicable: false,
            }
          ]
        }
      }
    });

    // Reimbursement 2: PAID
    await prisma.reimbursementRequest.create({
      data: {
        referenceNumber: 'REIMB/2026/0002',
        employeeId: pm1.id,
        projectName: 'Project Beta',
        travelActivityDetails: 'Team dinner and supplies',
        totalAmount: 6000,
        status: 'PAID',
        managerRemark: 'Looks good',
        financeRemark: 'Processed on July 1',
        paidAt: new Date('2026-07-01'),
        expenseEntries: {
          create: [
            {
              expenseHead: 'Food',
              amount: 6000,
              expenseDate: new Date('2026-06-25'),
              billType: 'INVOICE',
              documentUrl: '/uploads/invoice2.pdf',
              tdsApplicable: true,
              tdsFlag: true,
            }
          ]
        }
      }
    });
  }

  // --- Seed Tasks ---
  await prisma.task.create({
    data: {
      title: 'Complete Site Survey Report',
      description: 'Prepare and upload the final survey report for Project Alpha.',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date('2026-07-20'),
      assignedToId: employee.id,
      assignedById: reportingManager.id,
    }
  });

  await prisma.task.create({
    data: {
      title: 'Submit Expense Vouchers',
      description: 'Please submit travel reimbursement expense bills for verification.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: new Date('2026-07-15'),
      updateRemark: 'I have gathered all the vouchers, compiling them now.',
      assignedToId: employee.id,
      assignedById: hod.id,
    }
  });

  console.log('✅ Seed complete. Users created:');
  console.log(`  HR Admin       : ${hrAdmin.email}`);
  console.log(`  Finance Manager: ${financeManager.email}`);
  console.log(`  HOD            : ${hod.email}`);
  console.log(`  Reporting Mgr  : ${reportingManager.email}`);
  console.log(`  PM1            : pm1@precisionmappinggis.com`);
  console.log(`  PM2            : pm2@precisionmappinggis.com`);
  console.log(`  Employee       : employee@precisionmappinggis.com`);
  console.log('\n  ✅ Sample Rooms (Phase 2) created: 3 rooms (ACTIVE, PENDING_APPROVAL, PENDING_CLOSURE)');
  console.log('  ✅ Sample ReMS (Phase 3) created: 2 Advances, 2 Reimbursements');
  console.log('  ✅ Sample Tasks created: 2 tasks (PENDING, IN_PROGRESS)');
  console.log('\n  Default password for each: [Role]@1234  (e.g. Admin@1234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
