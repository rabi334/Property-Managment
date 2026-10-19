import { Router } from 'express';
import type { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, getOwnerId } from '../middleware/auth';
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

function toExpenseResponse(e: any, includeProperty = false) {
  const base = {
    id: e.id,
    property_id: e.propertyId,
    category: e.category,
    amount: Number(e.amount),
    description: e.description,
    date: e.date.toISOString().split('T')[0],
    added_by: e.addedById,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  };
  if (includeProperty && e.property) {
    (base as any).property = {
      id: e.property.id,
      name: e.property.name,
      type: e.property.type === 'mixed_use' ? 'mixed-use' : e.property.type,
      address: e.property.address,
      tax_rate: Number(e.property.taxRate),
      description: e.property.description,
      created_by: e.property.createdById,
      created_at: e.property.createdAt.toISOString(),
      updated_at: e.property.updatedAt.toISOString(),
    };
  }
  return base;
}

router.get('/', async (req: AuthRequest, res: Response) => {
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

    const where: any = {
      property: { createdById: ownerId },
    };
    if (propertyId) where.propertyId = propertyId;
    if (from || to) {
      where.date = {
        ...(from
          ? {
              gte: new Date(
                from.includes('T') ? from : `${from}T00:00:00.000Z`,
              ),
            }
          : {}),
        ...(to
          ? {
              lte: new Date(to.includes('T') ? to : `${to}T23:59:59.999Z`),
            }
          : {}),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { property: true },
      orderBy: { date: 'desc' },
    });
    res.json(expenses.map((e) => toExpenseResponse(e, true)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.get(
  '/by-property/:propertyId',
  [param('propertyId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid property ID' });

      const ownerId = getOwnerId(req.user);
      const from =
        typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;

      const dateWhere =
        from || to
          ? {
              date: {
                ...(from
                  ? {
                      gte: new Date(
                        from.includes('T') ? from : `${from}T00:00:00.000Z`,
                      ),
                    }
                  : {}),
                ...(to
                  ? {
                      lte: new Date(
                        to.includes('T') ? to : `${to}T23:59:59.999Z`,
                      ),
                    }
                  : {}),
              },
            }
          : {};

      const expenses = await prisma.expense.findMany({
        where: {
          propertyId: req.params.propertyId,
          property: { createdById: ownerId },
          ...dateWhere,
        },
        orderBy: { date: 'desc' },
      });
      res.json(expenses.map((e) => toExpenseResponse(e)));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  },
);

router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid ID' });

      const ownerId = getOwnerId(req.user);
      const expense = await prisma.expense.findFirst({
        where: { id: req.params.id, property: { createdById: ownerId } },
        include: { property: true },
      });

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json(toExpenseResponse(expense, true));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  },
);

router.post(
  '/',
  requireManage,
  [
    body('property_id').isUUID(),
    body('category').isIn(['maintenance', 'utilities', 'renovation', 'other']),
    body('amount').isFloat({ min: 0 }),
    body('description').trim().notEmpty(),
    body('date').isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { property_id, category, amount, description, date } = req.body;
      const ownerId = getOwnerId(req.user);

      const property = await prisma.property.findFirst({
        where: { id: property_id, createdById: ownerId },
      });
      if (!property) return res.status(404).json({ error: 'Property not found' });

      const expense = await prisma.expense.create({
        data: {
          propertyId: property_id,
          category,
          amount,
          description,
          date: new Date(date),
          addedById: req.user!.id,
        },
      });

      res.status(201).json(toExpenseResponse(expense));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  },
);

router.patch(
  '/:id',
  requireManage,
  [
    param('id').isUUID(),
    body('property_id').optional().isUUID(),
    body('category')
      .optional()
      .isIn(['maintenance', 'utilities', 'renovation', 'other']),
    body('amount').optional().isFloat({ min: 0 }),
    body('description').optional().trim().notEmpty(),
    body('date').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const ownerId = getOwnerId(req.user);
      const existing = await prisma.expense.findFirst({
        where: { id: req.params.id, property: { createdById: ownerId } },
      });
      if (!existing) return res.status(404).json({ error: 'Expense not found' });

      const { property_id, category, amount, description, date } = req.body;

      if (property_id !== undefined && property_id !== existing.propertyId) {
        const targetProp = await prisma.property.findFirst({
          where: { id: property_id, createdById: ownerId },
        });
        if (!targetProp)
          return res.status(404).json({ error: 'Target property not found' });
      }

      const updates: any = {};
      if (property_id !== undefined) updates.propertyId = property_id;
      if (category !== undefined) updates.category = category;
      if (amount !== undefined) updates.amount = amount;
      if (description !== undefined) updates.description = description;
      if (date !== undefined) updates.date = new Date(date);

      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.json(toExpenseResponse(expense));
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Expense not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  },
);

router.delete(
  '/:id',
  requireOwner,
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid ID' });

      const ownerId = getOwnerId(req.user);
      const existing = await prisma.expense.findFirst({
        where: { id: req.params.id, property: { createdById: ownerId } },
      });
      if (!existing) return res.status(404).json({ error: 'Expense not found' });

      await prisma.expense.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Expense not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  },
);

export { router as expensesRouter };

