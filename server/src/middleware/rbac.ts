import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type Role = 'OWNER' | 'MANAGER' | 'VISITOR';

/** Require at least one of the given roles */
export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (allowedRoles.includes(req.user.role as Role)) {
      next();
      return;
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/** Require OWNER or MANAGER (can manage/edit) */
export const requireManage = requireRoles('OWNER', 'MANAGER');

/** Require OWNER only */
export const requireOwner = requireRoles('OWNER');
