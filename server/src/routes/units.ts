import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { requireManage, requireOwner } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

function toUnitResponse(u: any, includeRelations = false) {
  const base = {
    id: u.id,
    property_id: u.propertyId,
    unit_name: u.unitName,
    rent_type: u.rentType,
    rent_amount: Number(u.rentAmount),
    status: u.status,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
  if (includeRelations && u.property) {
    (base as any).property = {
      id: u.property.id,
      name: u.property.name,
      type: u.property.type === 'mixed_use' ? 'mixed-use' : u.property.type,
      address: u.property.address,
      tax_rate: Number(u.property.taxRate),
      description: u.property.description,
      created_by: u.property.createdById,
      created_at: u.property.createdAt.toISOString(),
      updated_at: u.property.updatedAt.toISOString(),
    };
  }
  if (includeRelations && u.tenants) {
    (base as any).tenants = u.tenants.map((t: any) => ({
      id: t.id,
      full_name: t.fullName,
      phone: t.phone,
      id_number: t.idNumber,
      emergency_contact: t.emergencyContact,
      deposit_amount: Number(t.depositAmount),
      unit_id: t.unitId,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
    }));
  }
  return base;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const units = await prisma.unit.findMany({
      include: { property: true, tenants: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(units.map((u) => toUnitResponse(u, true)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

router.get(
  '/by-property/:propertyId',
  [param('propertyId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid property ID' });

      const units = await prisma.unit.findMany({
        where: { propertyId: req.params.propertyId },
        include: { property: true, tenants: true },
        orderBy: { unitName: 'asc' },
      });
      res.json(units.map((u) => toUnitResponse(u, true)));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch units' });
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

      const unit = await prisma.unit.findUnique({
        where: { id: req.params.id },
        include: { property: true, tenants: true },
      });

      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      res.json(toUnitResponse(unit, true));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch unit' });
    }
  },
);

router.post(
  '/',
  requireManage,
  [
    body('property_id').isUUID(),
    body('unit_name').trim().notEmpty(),
    body('rent_type').isIn(['monthly', 'yearly']),
    body('rent_amount').isFloat({ min: 0 }),
    body('status').optional().isIn(['occupied', 'vacant', 'maintenance']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { property_id, unit_name, rent_type, rent_amount, status } =
        req.body;

      const unit = await prisma.unit.create({
        data: {
          propertyId: property_id,
          unitName: unit_name,
          rentType: rent_type,
          rentAmount: rent_amount,
          status: status || 'vacant',
        },
      });

      res.status(201).json(toUnitResponse(unit));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create unit' });
    }
  },
);

router.patch(
  '/:id',
  requireManage,
  [
    param('id').isUUID(),
    body('unit_name').optional().trim().notEmpty(),
    body('rent_type').optional().isIn(['monthly', 'yearly']),
    body('rent_amount').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['occupied', 'vacant', 'maintenance']),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { unit_name, rent_type, rent_amount, status } = req.body;

      if (status !== undefined) {
        const activeTenant = await prisma.tenant.findFirst({
          where: { unitId: req.params.id, status: 'active' },
        });

        if (activeTenant && status !== 'occupied') {
          return res.status(409).json({
            error: `This unit has an active tenant (${activeTenant.fullName}). To change occupancy, end their tenancy via the tenant record instead of editing the unit directly.`,
          });
        }
        if (!activeTenant && status === 'occupied') {
          return res.status(409).json({
            error:
              'Cannot mark a unit as occupied with no active tenant assigned. Create a tenant for this unit instead.',
          });
        }
      }

      const updates: any = {};
      if (unit_name !== undefined) updates.unitName = unit_name;
      if (rent_type !== undefined) updates.rentType = rent_type;
      if (rent_amount !== undefined) updates.rentAmount = rent_amount;
      if (status !== undefined) updates.status = status;

      const unit = await prisma.unit.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.json(toUnitResponse(unit));
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Unit not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to update unit' });
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

      await prisma.unit.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Unit not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to delete unit' });
    }
  },
);

export { router as unitsRouter };
