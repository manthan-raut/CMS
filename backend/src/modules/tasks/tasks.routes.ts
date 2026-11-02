import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import {
  createTask,
  listTasks,
  getTask,
  updateTaskStatus,
  deleteTask,
} from './tasks.controller';

const router = Router();

router.use(authenticate);

// Seniors only can assign tasks
router.post('/', requireRole('HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER'), createTask);

// All authenticated users can list and retrieve tasks (permissions checked in controller)
router.get('/', listTasks);
router.get('/:id', getTask);

// Assignee updates task status/remarks
router.patch('/:id/update', updateTaskStatus);

// Creator deletes task
router.delete('/:id', deleteTask);

export default router;
