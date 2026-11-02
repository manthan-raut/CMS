import { Router } from 'express';
import { requestClosure, approveClosure, rejectClosure } from './roomClosure.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', requireRole('PROJECT_MANAGER', 'HR_ADMIN', 'FINANCE_MANAGER'), requestClosure);
router.post('/:closureId/approve', requireRole('HOD', 'HR_ADMIN', 'FINANCE_MANAGER'), approveClosure);
router.post('/:closureId/reject', requireRole('HOD', 'HR_ADMIN', 'FINANCE_MANAGER'), rejectClosure);

export default router;
