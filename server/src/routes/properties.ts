import { Router } from 'express';
import type { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, getOwnerId } from '../middleware/auth';
import { requireManage, requireOwner } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { serializePropertyType } from '../utils/serialize';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

function toPropertyResponse(p: any) {
  const type = serializePropertyType(p.type);
  return {
    id: p.id,
    name: p.name,
    type,
    address: p.address,
    tax_rate: Number(p.taxRate),
    description: p.description,
    image_url: p.imageUrl ?? null,
    created_by: p.createdById,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = getOwnerId(req.user);
    const properties = await prisma.property.findMany({
      where: { createdById: ownerId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(properties.map(toPropertyResponse));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: 'Invalid ID' });

      const ownerId = getOwnerId(req.user);
      const property = await prisma.property.findFirst({
        where: { id: req.params.id, createdById: ownerId },
        include: {
          units: true,
        },
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      const units = property.units.map((u) => ({
        id: u.id,
        property_id: u.propertyId,
        unit_name: u.unitName,
        rent_type: u.rentType,
        rent_amount: Number(u.rentAmount),
        status: u.status,
        created_at: u.createdAt.toISOString(),
        updated_at: u.updatedAt.toISOString(),
      }));

      res.json({
        ...toPropertyResponse(property),
        units,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch property' });
    }
  },
);

router.post(
  '/',
  requireManage,
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['apartment', 'commercial', 'mixed-use', 'mixed_use']),
    body('address').trim().notEmpty(),
    body('tax_rate').isFloat({ min: 0, max: 100 }),
    body('description').optional().trim(),
    body('image_url').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { name, type, address, tax_rate, description, image_url } =
        req.body;
      const dbType = type === 'mixed-use' ? 'mixed_use' : type;
      const ownerId = getOwnerId(req.user);

      const property = await prisma.property.create({
        data: {
          name,
          type: dbType,
          address,
          taxRate: tax_rate,
          description: description || null,
          imageUrl: image_url || null,
          createdById: ownerId,
        },
      });

      res.status(201).json(toPropertyResponse(property));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create property' });
    }
  },
);

router.patch(
  '/:id',
  requireManage,
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('type')
      .optional()
      .isIn(['apartment', 'commercial', 'mixed-use', 'mixed_use']),
    body('address').optional().trim().notEmpty(),
    body('tax_rate').optional().isFloat({ min: 0, max: 100 }),
    body('description').optional().trim(),
    body('image_url').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const ownerId = getOwnerId(req.user);
      const existing = await prisma.property.findFirst({
        where: { id: req.params.id, createdById: ownerId },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Property not found' });
      }

      const { name, type, address, tax_rate, description, image_url } =
        req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (type !== undefined)
        updates.type = type === 'mixed-use' ? 'mixed_use' : type;
      if (address !== undefined) updates.address = address;
      if (tax_rate !== undefined) updates.taxRate = tax_rate;
      if (description !== undefined) updates.description = description;
      if (image_url !== undefined) updates.imageUrl = image_url || null;

      const property = await prisma.property.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.json(toPropertyResponse(property));
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Property not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to update property' });
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
      const existing = await prisma.property.findFirst({
        where: { id: req.params.id, createdById: ownerId },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Property not found' });
      }

      await prisma.property.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'Property not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  },
);

export { router as propertiesRouter };

