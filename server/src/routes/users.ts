import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { requireOwner } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
const router = Router();

router.use(authMiddleware);

router.get('/', requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.fullName,
        role: u.role,
        phone: u.phone,
        created_at: u.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post(
  '/',
  requireOwner,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().notEmpty(),
    body('role').isIn(['MANAGER', 'VISITOR']),
    body('phone').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password, full_name, role, phone } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: full_name,
          role,
          phone: phone || null,
          createdById: req.user!.id,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create user' });
    }
  },
);

router.patch(
  '/:id',
  requireOwner,
  [
    param('id').isUUID(),
    body('full_name').optional().trim().notEmpty(),
    body('role').optional().isIn(['MANAGER', 'VISITOR']),
    body('phone').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      // Owners cannot demote themselves
      if (req.params.id === req.user!.id) {
        return res
          .status(400)
          .json({ error: 'Cannot edit your own account here' });
      }

      const { full_name, role, phone } = req.body;
      const updates: any = {};
      if (full_name !== undefined) updates.fullName = full_name;
      if (role !== undefined) updates.role = role;
      if (phone !== undefined) updates.phone = phone || null;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: updates,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      res.json({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
      });
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'User not found' });
      console.error(e);
      res.status(500).json({ error: 'Failed to update user' });
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
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      if (req.params.id === req.user!.id) {
        return res
          .status(400)
          .json({ error: 'Cannot delete your own account' });
      }

      // Prevent deleting any OWNER account
      const targetUser = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, role: true },
      });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (targetUser.role === 'OWNER') {
        return res
          .status(400)
          .json({ error: 'Owner accounts cannot be deleted' });
      }

      await prisma.user.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025')
        return res.status(404).json({ error: 'User not found' });
      if (e.code === 'P2003') {
        return res.status(409).json({
          error:
            'Cannot delete this user because they are referenced by existing records (payments/expenses/maintenance).',
        });
      }
      console.error(e);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  },
);

export { router as usersRouter };
