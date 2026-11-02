import { Router } from 'express';
import { createAdvanceRequest, listAdvanceRequests, getAdvanceRequest, approveAdvanceRequest, rejectAdvanceRequest, processPayment } from './advanceRequests.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(authenticate);

// List and view
router.get('/', listAdvanceRequests);
router.get('/:id', getAdvanceRequest);

// Create advance request (any employee)
router.post('/', createAdvanceRequest);

// Manager approval/rejection
router.post('/:id/approve', requireRole('REPORTING_MANAGER'), approveAdvanceRequest);
router.post('/:id/reject', requireRole('REPORTING_MANAGER'), rejectAdvanceRequest);

// Finance processing
router.post('/:id/process-payment', requireRole('FINANCE_MANAGER'), processPayment);

export default router;
