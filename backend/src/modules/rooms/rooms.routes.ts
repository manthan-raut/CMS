import { Router } from 'express';
import { createRoom, listRooms, getRoom, approveRoom, rejectRoom, editRoom } from './rooms.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(authenticate);

// Any authenticated user can list/view rooms
router.get('/', listRooms);
router.get('/:id', getRoom);

// Project Manager can create rooms
router.post('/', requireRole('PROJECT_MANAGER', 'HR_ADMIN', 'FINANCE_MANAGER'), createRoom);

// Edit room
router.put('/:id', requireRole('PROJECT_MANAGER', 'HR_ADMIN', 'FINANCE_MANAGER'), editRoom);

// HOD approves or rejects
router.post('/:id/approve', requireRole('HOD', 'HR_ADMIN', 'FINANCE_MANAGER'), approveRoom);
router.post('/:id/reject', requireRole('HOD', 'HR_ADMIN', 'FINANCE_MANAGER'), rejectRoom);

export default router;
