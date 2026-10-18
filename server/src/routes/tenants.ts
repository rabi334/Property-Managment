import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { requireManage, requireOwner } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

function toTenantResponse(t: any, includeUnit = false) {
  const base = {
    id: t.id,
    full_name: t.fullName,
    phone: t.phone,
    id_number: t.idNumber,
    emergency_contact: t.emergencyContact,
    deposit_amount: Number(t.depositAmount),
    unit_id: t.unitId,
    status: t.status,
    lease_start_date: t.leaseStartDate?.toISOString().split('T')[0] ?? null,
    lease_end_date: t.leaseEndDate?.toISOString().split('T')[0] ?? null,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
  if (includeUnit && t.unit) {
    (base as any).unit = {
      id: t.unit.id,
      property_id: t.unit.propertyId,
      unit_name: t.unit.unitName,
      rent_type: t.unit.rentType,
      rent_amount: Number(t.unit.rentAmount),
      status: t.unit.status,
      created_at: t.unit.createdAt.toISOString(),
      updated_at: t.unit.updatedAt.toISOString(),
      property: t.unit.property
        ? {
            id: t.unit.property.id,
            name: t.unit.property.name,
            type:
              t.unit.property.type === 'mixed_use'
                ? 'mixed-use'
                : t.unit.property.type,
            address: t.unit.property.address,
            tax_rate: Number(t.unit.property.taxRate),
            description: t.unit.property.description,
            created_by: t.unit.property.createdById,
            created_at: t.unit.property.createdAt.toISOString(),
            updated_at: t.unit.property.updatedAt.toISOString(),
          }
        : null,
    };
  }
  return base;
}

/**
 * Verifies a unit can accept a new active tenant.
 * Checks BOTH the unit's status flag AND the actual Tenant table,
 * since status can drift — the Tenant table is the source of truth.
 */
async function assertUnitAvailableForTenant(
  unitId: string,
  excludeTenantId?: string,
) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return { ok: false as const, status: 404, error: 'Unit not found' };
  }
  if (unit.status !== 'vacant') {
    return {
      ok: false as const,
      status: 400,
      error:
        'Unit is not vacant. Mark the current tenant as past before assigning a new one.',
    };
  }
  const existingActive = await prisma.tenant.findFirst({
    where: {
      unitId,
      status: 'active',
      ...(excludeTenantId ? { id: { not: excludeTenantId } } : {}),
    },
  });
  if (existingActive) {
    return {
      ok: false as const,
      status: 409,
      error:
        'Unit already has an active tenant (status flag was out of sync). Please review manually.',
    };
  }
  return { ok: true as const, unit };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const rawStatus = req.query.status;
    const status: 'active' | 'past' | undefined =
      rawStatus === 'active' || rawStatus === 'past' ? rawStatus : undefined;

    const tenants = await prisma.tenant.findMany({
      where: status ? { status } : undefined,
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tenants.map((t) => toTenantResponse(t, true)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.get('/rent-status', async (req: Request, res: Response) => {
  try {
    const activeTenants = await prisma.tenant.findMany({
      where: { status: 'active' },
      include: { unit: { include: { property: true } } },
    });

    if (activeTenants.length === 0) {
      return res.json([]);
    }

    const tenantIds = activeTenants.map((t) => t.id);

    const sums = await prisma.payment.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _sum: { amount: true },
    });
    const totalPaidByTenant = new Map<string, number>(
      sums.map((s) => [s.tenantId, Number(s._sum.amount ?? 0)]),
    );

    // Last and earliest payment per tenant, fetched once and reduced in memory
    // rather than one query per tenant.
    const allPayments = await prisma.payment.findMany({
      where: { tenantId: { in: tenantIds } },
      orderBy: { paymentDate: 'asc' },
    });
    const lastPaymentByTenant = new Map<string, (typeof allPayments)[number]>();
    const earliestPaymentByTenant = new Map<
      string,
      (typeof allPayments)[number]
    >();
    for (const p of allPayments) {
      if (!earliestPaymentByTenant.has(p.tenantId)) {
        earliestPaymentByTenant.set(p.tenantId, p);
      }
      lastPaymentByTenant.set(p.tenantId, p); // last write wins = latest, since sorted asc
    }

    function addDays(date: Date, days: number): Date {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() + days);
      return d;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const result = activeTenants.map((tenant) => {
      const rentAmount = Number(tenant.unit.rentAmount);
      const cycleDays = tenant.unit.rentType === 'yearly' ? 365 : 30;
      const totalPaid = totalPaidByTenant.get(tenant.id) ?? 0;
      const lastPayment = lastPaymentByTenant.get(tenant.id) ?? null;
      const earliestPayment = earliestPaymentByTenant.get(tenant.id) ?? null;
      const anchorDate =
        tenant.leaseStartDate ?? earliestPayment?.paymentDate ?? null;

      const baseFields = {
        tenant_id: tenant.id,
        full_name: tenant.fullName,
        unit_id: tenant.unitId,
        unit_name: tenant.unit.unitName,
        property_name: tenant.unit.property.name,
        rent_amount: rentAmount,
        rent_type: tenant.unit.rentType,
        total_paid: totalPaid,
        last_payment_date: lastPayment
          ? lastPayment.paymentDate.toISOString().split('T')[0]
          : null,
        last_payment_amount: lastPayment ? Number(lastPayment.amount) : null,
      };

      if (!anchorDate) {
        // No lease start date AND no payments — nothing to compute against.
        return {
          ...baseFields,
          paid_through_date: null,
          next_due_date: null,
          grace_end_date: null,
          status: 'no_history' as const,
          days_overdue: 0,
        };
      }

      const periodsCovered =
        rentAmount > 0 ? Math.floor(totalPaid / rentAmount) : 0;
      const nextDueDate = addDays(anchorDate, periodsCovered * cycleDays);
      const paidThroughDate =
        periodsCovered > 0 ? addDays(nextDueDate, -1) : null;
      const graceEndDate = addDays(nextDueDate, 5);
      const isOverdue = today > graceEndDate;
      const daysOverdue = isOverdue
        ? Math.floor(
            (today.getTime() - graceEndDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        ...baseFields,
        paid_through_date: paidThroughDate
          ? paidThroughDate.toISOString().split('T')[0]
          : null,
        next_due_date: nextDueDate.toISOString().split('T')[0],
        grace_end_date: graceEndDate.toISOString().split('T')[0],
        status: isOverdue ? ('overdue' as const) : ('current' as const),
        days_overdue: daysOverdue,
      };
    });

    // Overdue first (worst first), then current tenants alphabetically.
    result.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      if (a.status === 'overdue' && b.status === 'overdue')
        return b.days_overdue - a.days_overdue;
      return a.full_name.localeCompare(b.full_name);
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to compute rent status' });
  }
});

router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid ID' });

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: { unit: { include: { property: true } } },
      });
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      res.json(toTenantResponse(tenant, true));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  },
);

// FIXED: now filters to the single active tenant, instead of an
// unordered findFirst that could return a past tenant.
router.get(
  '/by-unit/:unitId',
  [param('unitId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid unit ID' });

      const tenant = await prisma.tenant.findFirst({
        where: { unitId: req.params.unitId, status: 'active' },
        include: { unit: { include: { property: true } } },
      });

      res.json(tenant ? toTenantResponse(tenant, true) : null);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  },
);

router.post(
  '/',
  requireManage,
  [
    body('full_name').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('id_number').trim().notEmpty(),
    body('emergency_contact').optional().trim(),
    body('deposit_amount').optional().isFloat({ min: 0 }),
    body('unit_id').isUUID(),
    body('lease_start_date').optional().isISO8601(),
    body('lease_end_date').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const {
        full_name,
        phone,
        id_number,
        emergency_contact,
        deposit_amount,
        unit_id,
        lease_start_date,
        lease_end_date,
      } = req.body;

      const check = await assertUnitAvailableForTenant(unit_id);
      if (!check.ok)
        return res.status(check.status).json({ error: check.error });

      const tenant = await prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: {
            fullName: full_name,
            phone,
            idNumber: id_number,
            emergencyContact: emergency_contact || null,
            depositAmount: deposit_amount ?? 0,
            unitId: unit_id,
            status: 'active',
            leaseStartDate: lease_start_date
              ? new Date(lease_start_date)
              : null,
            leaseEndDate: lease_end_date ? new Date(lease_end_date) : null,
          },
        });
        await tx.unit.update({
          where: { id: unit_id },
          data: { status: 'occupied' },
        });
        return created;
      });

      res.status(201).json(toTenantResponse(tenant));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  },
);

router.patch(
  '/:id',
  requireManage,
  [
    param('id').isUUID(),
    body('full_name').optional().trim().notEmpty(),
    body('phone').optional().trim().notEmpty(),
    body('id_number').optional().trim().notEmpty(),
    body('emergency_contact').optional().trim(),
    body('deposit_amount').optional().isFloat({ min: 0 }),
    body('unit_id').optional().isUUID(),
    body('status').optional().isIn(['active', 'past']),
    body('lease_start_date').optional(),
    body('lease_end_date').optional(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const existing = await prisma.tenant.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Tenant not found' });

      const {
        full_name,
        phone,
        id_number,
        emergency_contact,
        deposit_amount,
        unit_id,
        status,
        lease_start_date,
        lease_end_date,
      } = req.body;

      const newUnitId = unit_id !== undefined ? unit_id : existing.unitId;
      const newStatus = status !== undefined ? status : existing.status;
      const isReassigning = newUnitId !== existing.unitId;
      const willBeActive = newStatus === 'active';

      // Guard: reassigning to a different unit while active, or
      // reactivating a past tenant, requires the target unit be free.
      if (
        willBeActive &&
        (isReassigning ||
          (existing.status === 'past' && newStatus === 'active'))
      ) {
        const check = await assertUnitAvailableForTenant(
          newUnitId,
          existing.id,
        );
        if (!check.ok)
          return res.status(check.status).json({ error: check.error });
      }

      const updates: any = {};
      if (full_name !== undefined) updates.fullName = full_name;
      if (phone !== undefined) updates.phone = phone;
      if (id_number !== undefined) updates.idNumber = id_number;
      if (emergency_contact !== undefined)
        updates.emergencyContact = emergency_contact;
      if (deposit_amount !== undefined) updates.depositAmount = deposit_amount;
      if (unit_id !== undefined) updates.unitId = unit_id;
      if (status !== undefined) updates.status = status;
      if (lease_start_date !== undefined) {
        updates.leaseStartDate = lease_start_date
          ? new Date(lease_start_date)
          : null;
      }
      if (lease_end_date !== undefined) {
        updates.leaseEndDate = lease_end_date ? new Date(lease_end_date) : null;
      }

      const tenant = await prisma.$transaction(async (tx) => {
        const updated = await tx.tenant.update({
          where: { id: req.params.id },
          data: updates,
        });

        // Old unit becomes vacant if this tenant was active there and is
        // leaving (either moving out, or moving to a different unit).
        if (existing.status === 'active' && (isReassigning || !willBeActive)) {
          await tx.unit.update({
            where: { id: existing.unitId },
            data: { status: 'vacant' },
          });
        }
        // New/target unit becomes occupied if this tenant is now active there.
        if (willBeActive) {
          await tx.unit.update({
            where: { id: newUnitId },
            data: { status: 'occupied' },
          });
        }

        return updated;
      });

      res.json(toTenantResponse(tenant));
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Tenant not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  },
);

router.delete(
  '/:id',
  requireOwner,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid ID' });

      await prisma.tenant.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Tenant not found' });
      if (e.code === 'P2003') {
        return res.status(409).json({
          error:
            'Cannot delete this tenant — they have payment history. Mark them as past instead.',
        });
      }
      console.error(e);
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  },
);

export { router as tenantsRouter };
