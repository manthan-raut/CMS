import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';

const createTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  assignedToId: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
  updateRemark: z.string().optional(),
});

// POST /api/tasks
export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  const parse = createTaskSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const { title, description, assignedToId, priority, dueDate } = parse.data;

  // Verify assignee exists
  const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!assignee) {
    res.status(404).json({ success: false, message: 'Assignee user not found' });
    return;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedToId,
      assignedById: req.user!.userId,
      status: 'PENDING',
    },
    include: {
      assignedTo: { select: { id: true, name: true, employeeId: true } },
      assignedBy: { select: { id: true, name: true, employeeId: true } },
    },
  });

  // Write audit log
  await logAction({
    entityType: 'Task',
    entityId: task.id,
    action: 'CREATE',
    performedById: req.user!.userId,
    newValue: { title, assignedTo: assignee.name },
    ipAddress: req.ip,
  });

  // Get creator profile
  const creator = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  const creatorName = creator?.name || 'A Senior User';

  // Create assignee notification
  await prisma.notification.create({
    data: {
      userId: assignedToId,
      message: `You have been assigned a new task: "${title}" by ${creatorName}.`,
    },
  });

  res.status(201).json({ success: true, data: task });
}

// GET /api/tasks
export async function listTasks(req: AuthRequest, res: Response): Promise<void> {
  const role = req.user!.role;
  const userId = req.user!.userId;

  let whereClause: any = {};

  if (role === 'EMPLOYEE') {
    // Employees can only see their own tasks
    whereClause.assignedToId = userId;
  } else if (role === 'HOD' || role === 'HR_ADMIN') {
    // HODs and Admins can see all tasks, but allow filtering if passed
    const { assignedToId, status } = req.query as { assignedToId?: string; status?: string };
    if (assignedToId) whereClause.assignedToId = assignedToId;
    if (status) whereClause.status = status;
  } else {
    // Other seniors see tasks assigned by them or to them
    whereClause.OR = [
      { assignedToId: userId },
      { assignedById: userId }
    ];
    const { assignedToId, status } = req.query as { assignedToId?: string; status?: string };
    if (assignedToId || status) {
      // Apply filters on top of OR logic
      whereClause = {
        AND: [
          { OR: [{ assignedToId: userId }, { assignedById: userId }] },
          assignedToId ? { assignedToId } : {},
          status ? { status } : {}
        ]
      };
    }
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true, employeeId: true } },
      assignedBy: { select: { id: true, name: true, email: true, role: true, employeeId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: tasks });
}

// GET /api/tasks/:id
export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: req.params['id'] },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true, employeeId: true } },
      assignedBy: { select: { id: true, name: true, email: true, role: true, employeeId: true } },
    },
  });

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  const userId = req.user!.userId;
  const role = req.user!.role;

  // Check access permissions
  if (role === 'EMPLOYEE' && task.assignedToId !== userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (role !== 'HOD' && role !== 'HR_ADMIN' && role !== 'EMPLOYEE' && task.assignedToId !== userId && task.assignedById !== userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: task });
}

// PATCH /api/tasks/:id/update
export async function updateTaskStatus(req: AuthRequest, res: Response): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: req.params['id'] } });
  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  const userId = req.user!.userId;
  // Only the assignee can update status/remarks
  if (task.assignedToId !== userId) {
    res.status(403).json({ success: false, message: 'Only the assigned user can update this task status' });
    return;
  }

  const parse = updateTaskSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const { status, updateRemark } = parse.data;

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status,
      updateRemark: updateRemark || task.updateRemark,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  });

  // Log action
  await logAction({
    entityType: 'Task',
    entityId: task.id,
    action: 'UPDATE',
    performedById: userId,
    oldValue: { status: task.status, updateRemark: task.updateRemark },
    newValue: { status, updateRemark },
    ipAddress: req.ip,
  });

  // Notify task creator
  await prisma.notification.create({
    data: {
      userId: task.assignedById,
      message: `Task "${task.title}" status was updated to ${status} by ${updated.assignedTo.name}.`,
    },
  });

  res.json({ success: true, data: updated });
}

// DELETE /api/tasks/:id
export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: req.params['id'] } });
  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  // Only the creator can delete the task
  if (task.assignedById !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the assigner can delete this task' });
    return;
  }

  await prisma.task.delete({ where: { id: task.id } });

  // Log action
  await logAction({
    entityType: 'Task',
    entityId: task.id,
    action: 'DELETE',
    performedById: req.user!.userId,
    oldValue: { title: task.title },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Task deleted successfully' });
}
