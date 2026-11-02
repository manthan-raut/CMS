import { Router } from 'express';
import { recordPayment, listPayments } from './rentPayments.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router({ mergeParams: true }); // Inherits :id from parent router

router.use(authenticate);

router.get('/', listPayments);
router.post('/', requireRole('FINANCE_MANAGER'), recordPayment);

export default router;
