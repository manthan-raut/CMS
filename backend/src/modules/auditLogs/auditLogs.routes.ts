import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.use(requireRole('HR_ADMIN', 'FINANCE_MANAGER'));

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, action } = req.query;

    const whereClause: any = {};
    if (entityType) {
      whereClause.entityType = { contains: String(entityType), mode: 'insensitive' };
    }
    if (action) {
      whereClause.action = { contains: String(action), mode: 'insensitive' };
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
