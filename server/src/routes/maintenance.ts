import { Router } from 'express';
import type { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, getOwnerId } from '../middleware/auth';
import { requireManage, requireOwner } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

function toMaintenanceResponse(m: any, includeUnit = false) {
  const base = {
    id: m.id,
    unit_id: m.unitId,
    title: m.title,
    description: m.description,
    status: m.status,
    created_by: m.createdById,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
  if (includeUnit && m.unit) {
    (base as any).unit = {
      id: m.unit.id,
      property_id: m.unit.propertyId,
      unit_name: m.unit.unitName,
      rent_type: m.unit.rentType,
      rent_amount: Number(m.unit.rentAmount),
      status: m.unit.status,
      created_at: m.unit.createdAt.toISOString(),
      updated_at: m.unit.updatedAt.toISOString(),
      property: m.unit.property
        ? {
            id: m.unit.property.id,
            name: m.unit.property.name,
            type: m.unit.property.type === 'mixed_use' ? 'mixed-use' : m.unit.property.type,
            address: m.unit.property.address,
            tax_rate: Number(m.unit.property.taxRate),
            description: m.unit.property.description,
            created_by: m.unit.property.createdById,
            created_at: m.unit.property.createdAt.toISOString(),
            updated_at: m.unit.property.updatedAt.toISOString(),
          }
        : null,
    };
  }
  return base;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = getOwnerId(req.user);
    const items = await prisma.maintenanceRequest.findMany({
      where: { unit: { property: { createdById: ownerId } } },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items.map((m) => toMaintenanceResponse(m, true)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid ID' });

      const ownerId = getOwnerId(req.user);
      const item = await prisma.maintenanceRequest.findFirst({
        where: {
          id: req.params.id,
          unit: { property: { createdById: ownerId } },
        },
        include: { unit: { include: { property: true } } },
      });

      if (!item) {
        return res.status(404).json({ error: 'Maintenance request not found' });
      }

      res.json(toMaintenanceResponse(item, true));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch maintenance request' });
    }
  }
);

router.get('/by-unit/:unitId', [param('unitId').isUUID()], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid unit ID' });

    const ownerId = getOwnerId(req.user);
    const items = await prisma.maintenanceRequest.findMany({
      where: {
        unitId: req.params.unitId,
        unit: { property: { createdById: ownerId } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items.map((m) => toMaintenanceResponse(m)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

router.post(
  '/',
  requireManage,
  [
    body('unit_id').isUUID(),
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { unit_id, title, description, status } = req.body;
      const ownerId = getOwnerId(req.user);

      const unit = await prisma.unit.findFirst({
        where: { id: unit_id, property: { createdById: ownerId } },
      });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });

      const item = await prisma.maintenanceRequest.create({
        data: {
          unitId: unit_id,
          title,
          description,
          status: status || 'pending',
          createdById: req.user!.id,
        },
      });

      res.status(201).json(toMaintenanceResponse(item));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create maintenance request' });
    }
  }
);

router.patch(
  '/:id',
  requireManage,
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const ownerId = getOwnerId(req.user);
      const existing = await prisma.maintenanceRequest.findFirst({
        where: { id: req.params.id, unit: { property: { createdById: ownerId } } },
      });
      if (!existing) return res.status(404).json({ error: 'Maintenance request not found' });

      const { title, description, status } = req.body;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;

      const item = await prisma.maintenanceRequest.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.json(toMaintenanceResponse(item));
    } catch (e: any) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Maintenance request not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to update maintenance request' });
    }
  }
);

router.delete('/:id', requireOwner, [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid ID' });

    const ownerId = getOwnerId(req.user);
    const existing = await prisma.maintenanceRequest.findFirst({
      where: { id: req.params.id, unit: { property: { createdById: ownerId } } },
    });
    if (!existing) return res.status(404).json({ error: 'Maintenance request not found' });

    await prisma.maintenanceRequest.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Maintenance request not found' });
    console.error(e);
    res.status(500).json({ error: 'Failed to delete maintenance request' });
  }
});

export { router as maintenanceRouter };

