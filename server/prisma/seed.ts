import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      passwordHash,
      fullName: 'Property Owner',
      role: 'OWNER',
      phone: '+1234567890',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      passwordHash,
      fullName: 'Site Manager',
      role: 'MANAGER',
      phone: '+1234567891',
      createdById: owner.id,
    },
  });

  // Clean existing data for idempotent re-seeding
  await prisma.expense.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();

  // --- Property 1 ---
  const property1 = await prisma.property.create({
    data: {
      name: 'Sunrise Apartments',
      type: 'apartment',
      address: '123 Sunrise Ave, Addis Ababa',
      taxRate: 15.0,
      description: 'A mid-size residential building.',
      createdById: owner.id,
    },
  });

  const unit1A = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      unitName: 'Unit 1A',
      rentType: 'monthly',
      rentAmount: 8000,
      status: 'vacant', // will flip to occupied below
    },
  });

  const unit1B = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      unitName: 'Unit 1B',
      rentType: 'monthly',
      rentAmount: 7500,
      status: 'vacant', // stays vacant — no tenant, tests the empty case
    },
  });

  const unit1C = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      unitName: 'Unit 1C',
      rentType: 'monthly',
      rentAmount: 9000,
      status: 'maintenance', // blocked from tenancy — tests that gate
    },
  });

  // --- Property 2 ---
  const property2 = await prisma.property.create({
    data: {
      name: 'Riverside Commercial Plaza',
      type: 'commercial',
      address: '45 Riverside Rd, Addis Ababa',
      taxRate: 20.0,
      description: 'Ground-floor retail units.',
      createdById: owner.id,
    },
  });

  const unit2A = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      unitName: 'Shop 2A',
      rentType: 'monthly',
      rentAmount: 15000,
      status: 'vacant',
    },
  });

  // --- Tenants ---

  // Unit 1A: a past tenant who moved out, then a new active tenant.
  // This exercises the turnover flow (status transitions) directly.
  const pastTenant1A = await prisma.tenant.create({
    data: {
      fullName: 'Abebe Kebede',
      phone: '+251911000001',
      idNumber: 'ID-0001',
      depositAmount: 8000,
      unitId: unit1A.id,
      status: 'past',
      leaseStartDate: new Date('2025-01-01'),
      leaseEndDate: new Date('2025-12-31'),
    },
  });

  const activeTenant1A = await prisma.tenant.create({
    data: {
      fullName: 'Sara Molla',
      phone: '+251911000002',
      idNumber: 'ID-0002',
      depositAmount: 8000,
      unitId: unit1A.id,
      status: 'active',
      leaseStartDate: new Date('2026-01-01'),
      leaseEndDate: null,
    },
  });

  await prisma.unit.update({
    where: { id: unit1A.id },
    data: { status: 'occupied' },
  });

  // Shop 2A: single active tenant, no turnover history.
  const activeTenant2A = await prisma.tenant.create({
    data: {
      fullName: 'Yonas Tesfaye',
      phone: '+251911000003',
      idNumber: 'ID-0003',
      depositAmount: 30000,
      unitId: unit2A.id,
      status: 'active',
      leaseStartDate: new Date('2025-06-01'),
      leaseEndDate: null,
    },
  });

  await prisma.unit.update({
    where: { id: unit2A.id },
    data: { status: 'occupied' },
  });

  // unit1B and unit1C intentionally have NO tenants — tests the
  // "no active tenant, cannot record payment" and "vacant/maintenance
  // units shouldn't appear in the tenant picker" cases.

  // --- Payments ---
  // Give each active tenant a few months of payment history, including
  // a mix of payment methods and one deliberately late/irregular payment.

  const paymentData = [
    // Sara Molla — paid on time every month
    {
      tenant: activeTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2026-01-03',
      method: 'bank' as const,
    },
    {
      tenant: activeTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2026-02-02',
      method: 'bank' as const,
    },
    {
      tenant: activeTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2026-03-05',
      method: 'cash' as const,
    },
    {
      tenant: activeTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2026-04-01',
      method: 'bank' as const,
    },

    // Yonas Tesfaye — mobile money, one partial/late payment
    {
      tenant: activeTenant2A,
      unit: unit2A,
      amount: 15000,
      date: '2026-01-05',
      method: 'mobile' as const,
    },
    {
      tenant: activeTenant2A,
      unit: unit2A,
      amount: 15000,
      date: '2026-02-10',
      method: 'mobile' as const,
    },
    {
      tenant: activeTenant2A,
      unit: unit2A,
      amount: 7500,
      date: '2026-03-20',
      method: 'cash' as const,
      notes: 'Partial payment — remainder due',
    },

    // Abebe Kebede (past tenant) — historical payments before move-out
    {
      tenant: pastTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2025-11-01',
      method: 'bank' as const,
    },
    {
      tenant: pastTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2025-12-01',
      method: 'bank' as const,
    },
    // October 2026 payments
    {
      tenant: activeTenant1A,
      unit: unit1A,
      amount: 8000,
      date: '2026-10-02',
      method: 'bank' as const,
      notes: 'October 2026 rent',
    },
    {
      tenant: activeTenant2A,
      unit: unit2A,
      amount: 15000,
      date: '2026-10-05',
      method: 'mobile' as const,
      notes: 'October 2026 rent',
    },
  ];

  for (const p of paymentData) {
    await prisma.payment.create({
      data: {
        unitId: p.unit.id,
        tenantId: p.tenant.id,
        amount: p.amount,
        paymentDate: new Date(p.date),
        paymentMethod: p.method,
        recordedById: manager.id,
        notes: 'notes' in p ? p.notes : null,
      },
    });
  }

  // --- Expenses ---
  await prisma.expense.create({
    data: {
      propertyId: property1.id,
      category: 'maintenance',
      amount: 2500,
      description: 'Plumbing inspection and repairs',
      date: new Date('2026-10-10'),
      addedById: manager.id,
    },
  });

  console.log('Seed completed.');
  console.log('Owner:', owner.email);
  console.log('Manager:', manager.email);
  console.log('Properties: Sunrise Apartments, Riverside Commercial Plaza');
  console.log(
    'Units: 1A (occupied), 1B (vacant), 1C (maintenance), Shop 2A (occupied)',
  );
  console.log(
    'Tenants: Sara Molla (active), Yonas Tesfaye (active), Abebe Kebede (past)',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
