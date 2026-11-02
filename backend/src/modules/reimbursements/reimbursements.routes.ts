import { Router } from 'express';
import { createReimbursement, listReimbursements, getReimbursement, approveReimbursement, rejectReimbursement, processPayment } from './reimbursements.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(authenticate);

// List and view
router.get('/', listReimbursements);
router.get('/:id', getReimbursement);

// Create reimbursement (any employee)
router.post('/', createReimbursement);

// Manager approval/rejection
router.post('/:id/approve', requireRole('REPORTING_MANAGER'), approveReimbursement);
router.post('/:id/reject', requireRole('REPORTING_MANAGER'), rejectReimbursement);

// Finance processing
router.post('/:id/process-payment', requireRole('FINANCE_MANAGER'), processPayment);

export default router;
