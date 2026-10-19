import { Router } from 'express';
import type { Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, getOwnerId } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

function isUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = getOwnerId(req.user);
    const propertyId =
      typeof req.query.propertyId === 'string'
        ? req.query.propertyId
        : undefined;
    const from =
      typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    if (propertyId && !isUuid(propertyId)) {
      return res.status(400).json({ error: 'Invalid propertyId' });
    }

    const propertyWhere: any = {
      createdById: ownerId,
      ...(propertyId ? { id: propertyId } : {}),
    };
    const unitWhere: any = {
      property: { createdById: ownerId },
      ...(propertyId ? { propertyId } : {}),
    };
    const paymentWhere: any = {
      unit: {
        property: {
          createdById: ownerId,
          ...(propertyId ? { id: propertyId } : {}),
        },
      },
    };
    const expenseWhere: any = {
      property: {
        createdById: ownerId,
        ...(propertyId ? { id: propertyId } : {}),
      },
    };

    if (from || to) {
      paymentWhere.paymentDate = {};
      expenseWhere.date = {};
      if (from) {
        const startDate = new Date(
          from.includes('T') ? from : `${from}T00:00:00.000Z`,
        );
        paymentWhere.paymentDate.gte = startDate;
        expenseWhere.date.gte = startDate;
      }
      if (to) {
        const endDate = new Date(
          to.includes('T') ? to : `${to}T23:59:59.999Z`,
        );
        paymentWhere.paymentDate.lte = endDate;
        expenseWhere.date.lte = endDate;
      }
    }

    const [properties, units, payments, expenses] = await Promise.all([
      prisma.property.findMany({
        where: propertyWhere,
        select: { id: true, taxRate: true },
      }),
      prisma.unit.findMany({ where: unitWhere, select: { status: true } }),
      prisma.payment.findMany({
        where: paymentWhere,
        select: { amount: true },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true },
      }),
    ]);

    const totalProperties = properties.length;
    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
    const vacantUnits = units.filter((u) => u.status === 'vacant').length;
    const maintenanceUnits = units.filter(
      (u) => u.status === 'maintenance',
    ).length;

    const monthlyIncome = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const monthlyExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );
    const netProfit = monthlyIncome - monthlyExpenses;

    const avgTaxRate =
      totalProperties > 0
        ? properties.reduce((sum, p) => sum + Number(p.taxRate), 0) /
          totalProperties
        : 0;
    const taxPayable = (monthlyIncome * avgTaxRate) / 100;

    res.json({
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      maintenanceUnits,
      monthlyIncome,
      monthlyExpenses,
      income: monthlyIncome,
      expenses: monthlyExpenses,
      netProfit,
      taxPayable,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get(
  '/chart/:year',
  [param('year').isInt({ min: 2000, max: 2100 })],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid year' });

      const ownerId = getOwnerId(req.user);
      const year = parseInt(req.params.year, 10);
      const propertyId =
        typeof req.query.propertyId === 'string'
          ? req.query.propertyId
          : undefined;
      if (propertyId && !isUuid(propertyId)) {
        return res.status(400).json({ error: 'Invalid propertyId' });
      }
      const chartData = [];

      for (let month = 1; month <= 12; month++) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const [payments, expenses] = await Promise.all([
          prisma.payment.findMany({
            where: {
              unit: {
                property: {
                  createdById: ownerId,
                  ...(propertyId ? { id: propertyId } : {}),
                },
              },
              paymentDate: {
                gte: new Date(`${startDate}T00:00:00.000Z`),
                lte: new Date(`${endDate}T23:59:59.999Z`),
              },
            },
            select: { amount: true },
          }),
          prisma.expense.findMany({
            where: {
              property: {
                createdById: ownerId,
                ...(propertyId ? { id: propertyId } : {}),
              },
              date: {
                gte: new Date(`${startDate}T00:00:00.000Z`),
                lte: new Date(`${endDate}T23:59:59.999Z`),
              },
            },
            select: { amount: true },
          }),
        ]);

        const income = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const expenseTotal = expenses.reduce(
          (sum, e) => sum + Number(e.amount),
          0,
        );

        chartData.push({
          month: new Date(year, month - 1).toLocaleString('default', {
            month: 'short',
          }),
          income,
          expenses: expenseTotal,
          profit: income - expenseTotal,
        });
      }

      res.json(chartData);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch chart data' });
    }
  },
);

router.get(
  '/tax-report/:year',
  [param('year').isInt({ min: 2000, max: 2100 })],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid year' });

      const ownerId = getOwnerId(req.user);
      const year = parseInt(req.params.year, 10);
      const propertyId =
        typeof req.query.propertyId === 'string'
          ? req.query.propertyId
          : undefined;
      if (propertyId && !isUuid(propertyId)) {
        return res.status(400).json({ error: 'Invalid propertyId' });
      }
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const properties = await prisma.property.findMany({
        where: {
          createdById: ownerId,
          ...(propertyId ? { id: propertyId } : {}),
        },
        select: { id: true, name: true, taxRate: true },
      });

      const taxReport = await Promise.all(
        properties.map(async (property) => {
          const units = await prisma.unit.findMany({
            where: { propertyId: property.id },
            select: { id: true },
          });
          const unitIds = units.map((u) => u.id);

          let totalIncome = 0;
          if (unitIds.length > 0) {
            const payments = await prisma.payment.findMany({
              where: {
                unitId: { in: unitIds },
                paymentDate: {
                  gte: new Date(`${startDate}T00:00:00.000Z`),
                  lte: new Date(`${endDate}T23:59:59.999Z`),
                },
              },
              select: { amount: true },
            });
            totalIncome = payments.reduce(
              (sum, p) => sum + Number(p.amount),
              0,
            );
          }

          const taxPayable = (totalIncome * Number(property.taxRate)) / 100;

          return {
            propertyId: property.id,
            propertyName: property.name,
            taxRate: Number(property.taxRate),
            totalIncome,
            taxPayable,
          };
        }),
      );

      res.json(taxReport);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch tax report' });
    }
  },
);

router.get('/expiring-leases', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = getOwnerId(req.user);
    const propertyId =
      typeof req.query.propertyId === 'string'
        ? req.query.propertyId
        : undefined;
    const daysParam =
      typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : 30;
    const days = isNaN(daysParam) || daysParam < 1 ? 30 : daysParam;

    if (propertyId && !isUuid(propertyId)) {
      return res.status(400).json({ error: 'Invalid propertyId' });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const tenants = await prisma.tenant.findMany({
      where: {
        unit: {
          property: {
            createdById: ownerId,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
        leaseEndDate: {
          gte: now,
          lte: future,
        },
      },
      include: {
        unit: {
          include: {
            property: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
      orderBy: { leaseEndDate: 'asc' },
    });

    const result = tenants.map((tenant) => {
      const leaseEndDate = tenant.leaseEndDate!.toISOString().split('T')[0];
      const msLeft = tenant.leaseEndDate!.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      return {
        id: tenant.id,
        unit_id: tenant.unitId,
        unit_name: tenant.unit.unitName,
        status: tenant.unit.status,
        lease_end_date: leaseEndDate,
        days_left: daysLeft,
        property: {
          id: tenant.unit.property.id,
          name: tenant.unit.property.name,
          address: tenant.unit.property.address,
        },
        tenant: {
          id: tenant.id,
          full_name: tenant.fullName,
          phone: tenant.phone,
        },
      };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch expiring leases' });
  }
});

export { router as dashboardRouter };

