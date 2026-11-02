import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of roles [${roles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
