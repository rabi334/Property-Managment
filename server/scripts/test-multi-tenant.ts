import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from '../src/routes/auth';
import { usersRouter } from '../src/routes/users';
import { propertiesRouter } from '../src/routes/properties';
import { unitsRouter } from '../src/routes/units';
import { tenantsRouter } from '../src/routes/tenants';
import { paymentsRouter } from '../src/routes/payments';
import { expensesRouter } from '../src/routes/expenses';
import { maintenanceRouter } from '../src/routes/maintenance';
import { dashboardRouter } from '../src/routes/dashboard';
import { prisma } from '../src/lib/prisma';
import type { Server } from 'http';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/dashboard', dashboardRouter);

let server: Server;
const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function run() {
  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  const testEmail = `test_tenant_${Date.now()}@example.com`;
  let testUserId: string | null = null;
  let testPropertyId: string | null = null;

  try {
    console.log('\n--- STEP 1: Verify existing User A (owner@example.com) ---');
    const loginResA = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'password123' }),
    });
    const loginDataA = await loginResA.json();
    assert(loginResA.status === 200, 'Owner A login successful');
    const tokenA = loginDataA.token;
    assert(!!tokenA, 'Owner A received JWT');

    const propsA = await (await fetch(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(Array.isArray(propsA) && propsA.length >= 2, `Owner A sees their properties (found ${propsA.length})`);
    const ownerAPropertyId = propsA[0].id;

    const unitsA = await (await fetch(`${BASE_URL}/units`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(Array.isArray(unitsA) && unitsA.length >= 4, `Owner A sees their units (found ${unitsA.length})`);

    const statsA = await (await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(statsA.totalProperties >= 2, `Owner A dashboard stats: totalProperties = ${statsA.totalProperties}`);
    assert(statsA.monthlyIncome > 0, `Owner A dashboard stats: monthlyIncome > 0 (got ${statsA.monthlyIncome})`);

    console.log('\n--- STEP 2: Register New User B & Verify Strict Zero Isolation ---');
    const regResB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        full_name: 'Tenant Isolation Tester',
        phone: '+251911000000',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.status === 201, 'User B registration successful');
    const tokenB = regDataB.token;
    testUserId = regDataB.user.id;
    assert(!!tokenB, 'User B received JWT');

    // User B: properties must be empty
    const propsB = await (await fetch(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(propsB) && propsB.length === 0, `User B sees 0 properties (got ${propsB.length})`);

    // User B: units must be empty
    const unitsB = await (await fetch(`${BASE_URL}/units`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(unitsB) && unitsB.length === 0, `User B sees 0 units (got ${unitsB.length})`);

    // User B: tenants must be empty
    const tenantsB = await (await fetch(`${BASE_URL}/tenants`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(tenantsB) && tenantsB.length === 0, `User B sees 0 tenants (got ${tenantsB.length})`);

    // User B: rent-status must be empty
    const rentStatusB = await (await fetch(`${BASE_URL}/tenants/rent-status`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(rentStatusB) && rentStatusB.length === 0, `User B sees 0 rent-status records`);

    // User B: payments must be empty
    const paymentsB = await (await fetch(`${BASE_URL}/payments`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(paymentsB) && paymentsB.length === 0, `User B sees 0 payments`);

    // User B: expenses must be empty
    const expensesB = await (await fetch(`${BASE_URL}/expenses`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(expensesB) && expensesB.length === 0, `User B sees 0 expenses`);

    // User B: maintenance must be empty
    const maintB = await (await fetch(`${BASE_URL}/maintenance`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(Array.isArray(maintB) && maintB.length === 0, `User B sees 0 maintenance requests`);

    // User B: dashboard stats must be completely clean 0
    const statsB = await (await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(statsB.totalProperties === 0, `User B totalProperties = 0`);
    assert(statsB.totalUnits === 0, `User B totalUnits = 0`);
    assert(statsB.monthlyIncome === 0, `User B monthlyIncome = 0`);
    assert(statsB.monthlyExpenses === 0, `User B monthlyExpenses = 0`);
    assert(statsB.netProfit === 0, `User B netProfit = 0`);

    console.log('\n--- STEP 3: User B creates a property & verifying isolation ---');
    const createPropRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        name: 'Horizon Test Heights',
        type: 'apartment',
        address: 'Bole Atlas, Addis Ababa',
        tax_rate: 15,
        description: 'New isolated building',
      }),
    });
    const createdProp = await createPropRes.json();
    assert(createPropRes.status === 201, 'User B created property');
    testPropertyId = createdProp.id;

    // User B now sees exactly 1 property
    const propsBAfter = await (await fetch(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(propsBAfter.length === 1 && propsBAfter[0].name === 'Horizon Test Heights', 'User B sees only their new property');

    // User A should NOT see User B's property
    const propsAAfter = await (await fetch(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(!propsAAfter.some((p: any) => p.id === testPropertyId), "User A does NOT see User B's property");

    console.log('\n--- STEP 4: Cross-Tenant Access Protection ---');
    // User B tries to access User A's property by ID -> 404
    const crossGetRes = await fetch(`${BASE_URL}/properties/${ownerAPropertyId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossGetRes.status === 404, `User B accessing User A property returns 404 (status: ${crossGetRes.status})`);

    // User B tries to update User A's property -> 404
    const crossPatchRes = await fetch(`${BASE_URL}/properties/${ownerAPropertyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: 'Hacked Property Name' }),
    });
    assert(crossPatchRes.status === 404, `User B updating User A property returns 404 (status: ${crossPatchRes.status})`);

    // User B tries to delete User A's property -> 404
    const crossDeleteRes = await fetch(`${BASE_URL}/properties/${ownerAPropertyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossDeleteRes.status === 404, `User B deleting User A property returns 404 (status: ${crossDeleteRes.status})`);

    console.log('\n========================================');
    console.log('🎉 ALL MULTI-TENANT ISOLATION TESTS PASSED!');
    console.log('========================================\n');
  } finally {
    // Cleanup User B test data
    if (testPropertyId) {
      await prisma.property.deleteMany({ where: { id: testPropertyId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    }
    server.close();
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

