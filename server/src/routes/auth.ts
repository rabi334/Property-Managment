import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authMiddleware, generateToken } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password, full_name, phone } = req.body;

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
          role: 'OWNER',
          phone: phone || null,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          phone: user.phone,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
          password_hash: '',
        },
        token,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Registration failed' });
    }
  },
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          phone: user.phone,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
          password_hash: '',
        },
        token,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Login failed' });
    }
  },
);

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      phone: user.phone,
      created_by: user.createdById,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      password_hash: '',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch(
  '/profile',
  authMiddleware,
  [
    body('full_name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { full_name, phone } = req.body;
      const updates: { fullName?: string; phone?: string } = {};
      if (full_name !== undefined) updates.fullName = full_name;
      if (phone !== undefined) updates.phone = phone;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updates,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
        password_hash: '',
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },
);

router.patch(
  '/password',
  authMiddleware,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 6 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { current_password, new_password } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const valid = await bcrypt.compare(current_password, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(new_password, 10);
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { passwordHash },
      });

      res.json({ message: 'Password updated successfully' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update password' });
    }
  },
);

export { router as authRouter };
