import { Router } from 'express';
import { createUser, listUsers, getUser, deactivateUser, resetPassword } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// HR_ADMIN and FINANCE_MANAGER can create users
router.post('/', requireRole('HR_ADMIN', 'FINANCE_MANAGER'), createUser);

// Any authenticated user can list/view users
router.get('/', listUsers);
router.get('/:id', getUser);

// Deactivate and reset-password restricted to HR_ADMIN and FINANCE_MANAGER
router.patch('/:id/deactivate', requireRole('HR_ADMIN', 'FINANCE_MANAGER'), deactivateUser);
router.post('/:id/reset-password', requireRole('HR_ADMIN', 'FINANCE_MANAGER'), resetPassword);

export default router;
