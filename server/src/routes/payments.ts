import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { requireManage, requireOwner } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

function isUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toPaymentResponse(p: any, includeRelations = false) {
  const base = {
    id: p.id,
    unit_id: p.unitId,
    tenant_id: p.tenantId,
    amount: Number(p.amount),
    payment_date: p.paymentDate.toISOString().split('T')[0],
    payment_method: p.paymentMethod,
    recorded_by: p.recordedById,
    notes: p.notes,
    created_at: p.createdAt.toISOString(),
  };
  if (includeRelations && p.tenant) {
    (base as any).tenant = {
      id: p.tenant.id,
      full_name: p.tenant.fullName,
      phone: p.tenant.phone,
      status: p.tenant.status,
    };
  }
  if (includeRelations && p.unit) {
    (base as any).unit = {
      id: p.unit.id,
      property_id: p.unit.propertyId,
      unit_name: p.unit.unitName,
      rent_type: p.unit.rentType,
      rent_amount: Number(p.unit.rentAmount),
      status: p.unit.status,
      created_at: p.unit.createdAt.toISOString(),
      updated_at: p.unit.updatedAt.toISOString(),
      property: p.unit.property
        ? {
            id: p.unit.property.id,
            name: p.unit.property.name,
            type:
              p.unit.property.type === 'mixed_use'
                ? 'mixed-use'
                : p.unit.property.type,
            address: p.unit.property.address,
            tax_rate: Number(p.unit.property.taxRate),
            description: p.unit.property.description,
            created_by: p.unit.property.createdById,
            created_at: p.unit.property.createdAt.toISOString(),
            updated_at: p.unit.property.updatedAt.toISOString(),
          }
        : null,
    };
  }
  return base;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const propertyId =
      typeof req.query.propertyId === 'string'
        ? req.query.propertyId
        : undefined;
    const unitId =
      typeof req.query.unitId === 'string' ? req.query.unitId : undefined;
    const tenantId =
      typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    const from =
      typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    if (propertyId && !isUuid(propertyId))
      return res.status(400).json({ error: 'Invalid propertyId' });
    if (unitId && !isUuid(unitId))
      return res.status(400).json({ error: 'Invalid unitId' });
    if (tenantId && !isUuid(tenantId))
      return res.status(400).json({ error: 'Invalid tenantId' });

    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (tenantId) where.tenantId = tenantId;
    if (propertyId) where.unit = { ...(where.unit || {}), propertyId };
    if (from || to) {
      where.paymentDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { unit: { include: { property: true } }, tenant: true },
      orderBy: { paymentDate: 'desc' },
    });
    res.json(payments.map((p) => toPaymentResponse(p, true)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.get(
  '/by-unit/:unitId',
  [param('unitId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid unit ID' });

      const payments = await prisma.payment.findMany({
        where: { unitId: req.params.unitId },
        include: { tenant: true },
        orderBy: { paymentDate: 'desc' },
      });
      res.json(payments.map((p) => toPaymentResponse(p, true)));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  },
);

router.get(
  '/by-tenant/:tenantId',
  [param('tenantId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid tenant ID' });

      const payments = await prisma.payment.findMany({
        where: { tenantId: req.params.tenantId },
        orderBy: { paymentDate: 'desc' },
      });
      res.json(payments.map((p) => toPaymentResponse(p)));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  },
);

router.post(
  '/',
  requireManage,
  [
    body('tenant_id').isUUID(),
    body('amount').isFloat({ min: 0 }),
    body('payment_date').isISO8601(),
    body('payment_method').isIn(['cash', 'bank', 'mobile']),
    body('notes').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { tenant_id, amount, payment_date, payment_method, notes } =
        req.body;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenant_id },
      });
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      if (tenant.status !== 'active') {
        return res
          .status(400)
          .json({
            error: 'Cannot record a payment for a tenant who is not active.',
          });
      }

      const payment = await prisma.payment.create({
        data: {
          unitId: tenant.unitId,
          tenantId: tenant.id,
          amount,
          paymentDate: new Date(payment_date),
          paymentMethod: payment_method,
          recordedById: req.user!.id,
          notes: notes || null,
        },
      });

      res.status(201).json(toPaymentResponse(payment));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  },
);

router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid ID' });

      const payment = await prisma.payment.findUnique({
        where: { id: req.params.id },
        include: { unit: { include: { property: true } }, tenant: true },
      });
      if (!payment) return res.status(404).json({ error: 'Payment not found' });

      res.json(toPaymentResponse(payment, true));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch payment' });
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

      await prisma.payment.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Payment not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to delete payment' });
    }
  },
);

export { router as paymentsRouter };
