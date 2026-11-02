import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';
import { notify } from '../../utils/notification';

// ── Helper: generate employeeId ────────────────────────────────────────────
async function generateEmployeeId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.user.count();
  const seq = String(count + 1).padStart(4, '0');
  return `EMP-${year}-${seq}`;
}

// ── Helper: generate temp password ─────────────────────────────────────────
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// ── Validation Schemas ──────────────────────────────────────────────────────
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().optional(),
  role: z.enum(['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE']),
  reportingManagerId: z.string().optional(),
});

// POST /api/users
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const parse = createUserSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const { name, email, mobile, role, reportingManagerId } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already in use' });
    return;
  }

  const employeeId = await generateEmployeeId();
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: { name, email, mobile, role, employeeId, passwordHash, reportingManagerId },
    select: { id: true, employeeId: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  await logAction({
    entityType: 'User',
    entityId: user.id,
    action: 'CREATE',
    performedById: req.user!.userId,
    newValue: { name, email, role, employeeId },
    ipAddress: req.ip,
  });

  await notify({
    channel: 'both',
    to: email,
    subject: 'Welcome to Precision Mapping GIS — Your Account Credentials',
    body: `Hello ${name}, your account has been created.\nEmployee ID: ${employeeId}\nTemporary Password: ${tempPassword}\nPlease change your password after first login.`,
  });

  res.status(201).json({ success: true, data: user });
}

// GET /api/users
export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  const { role, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (role) where['role'] = role;
  if (status) where['status'] = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      select: { id: true, employeeId: true, name: true, email: true, role: true, status: true, mobile: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data: users, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
}

// GET /api/users/:id
export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] },
    select: { id: true, employeeId: true, name: true, email: true, mobile: true, role: true, status: true, reportingManagerId: true, createdAt: true, updatedAt: true },
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
}

// PATCH /api/users/:id/deactivate
export async function deactivateUser(req: AuthRequest, res: Response): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: req.params['id'] } });
  if (!target) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  if (target.status === 'INACTIVE') {
    res.status(400).json({ success: false, message: 'User is already inactive' });
    return;
  }

  await prisma.user.update({ where: { id: target.id }, data: { status: 'INACTIVE' } });

  await logAction({
    entityType: 'User',
    entityId: target.id,
    action: 'DEACTIVATE',
    performedById: req.user!.userId,
    oldValue: { status: 'ACTIVE' },
    newValue: { status: 'INACTIVE' },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'User deactivated successfully' });
}

// POST /api/users/:id/reset-password
export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: req.params['id'] } });
  if (!target) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });

  await logAction({
    entityType: 'User',
    entityId: target.id,
    action: 'RESET_PASSWORD',
    performedById: req.user!.userId,
    ipAddress: req.ip,
  });

  await notify({
    channel: 'both',
    to: target.email,
    subject: 'Precision Mapping GIS — Password Reset',
    body: `Hello ${target.name}, your password has been reset.\nNew Temporary Password: ${tempPassword}\nPlease change your password after login.`,
  });

  res.json({ success: true, message: 'Password reset successfully. New credentials sent to user.' });
}
