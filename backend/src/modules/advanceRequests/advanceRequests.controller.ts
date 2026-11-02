import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';
import { notify } from '../../utils/notification';

const createAdvanceSchema = z.object({
  projectName: z.string().min(2),
  purpose: z.string().min(5),
  amount: z.number().positive(),
  expenseHead: z.string().min(2),
  expectedDate: z.string().datetime(),
  supportingDocUrl: z.string().optional(),
});

async function generateAdvanceRef(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.advanceRequest.count({
    where: { referenceNumber: { startsWith: `ADV/${year}/` } }
  });
  const padded = String(count + 1).padStart(4, '0');
  return `ADV/${year}/${padded}`;
}

export async function createAdvanceRequest(req: AuthRequest, res: Response): Promise<void> {
  const parse = createAdvanceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }
  
  const data = parse.data;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const referenceNumber = await generateAdvanceRef();

  const advance = await prisma.advanceRequest.create({
    data: {
      referenceNumber,
      employeeId: user.id,
      projectName: data.projectName,
      purpose: data.purpose,
      amount: data.amount,
      expenseHead: data.expenseHead,
      expectedDate: new Date(data.expectedDate),
      supportingDocUrl: data.supportingDocUrl,
      status: 'PENDING_MANAGER',
    }
  });

  await logAction({
    entityType: 'AdvanceRequest', entityId: advance.id, action: 'CREATE',
    performedById: user.id, newValue: { referenceNumber, amount: data.amount },
    ipAddress: req.ip,
  });

  if (user.reportingManagerId) {
    const manager = await prisma.user.findUnique({ where: { id: user.reportingManagerId } });
    if (manager) {
      await notify({
        channel: 'email', to: manager.email,
        subject: `Advance Request Submitted: ${referenceNumber}`,
        body: `Dear ${manager.name},\n${user.name} has submitted an advance request of ₹${data.amount} for ${data.projectName}.\nPlease log in to review.`
      });
    }
  }

  res.status(201).json({ success: true, data: advance });
}

export async function listAdvanceRequests(req: AuthRequest, res: Response): Promise<void> {
  const { status, employeeId, projectName } = req.query as Record<string, string>;
  const userRole = req.user!.role;
  const userId = req.user!.userId;

  const where: any = {};
  if (status) where.status = status;
  if (projectName) where.projectName = { contains: projectName, mode: 'insensitive' };
  
  // Role-based visibility
  if (userRole === 'EMPLOYEE' || userRole === 'PROJECT_MANAGER' || userRole === 'HOD' || userRole === 'REPORTING_MANAGER') {
    if (userRole === 'REPORTING_MANAGER') {
      const team = await prisma.user.findMany({ where: { reportingManagerId: userId }, select: { id: true } });
      const teamIds = team.map(t => t.id);
      where.OR = [
        { employeeId: userId },
        { employeeId: { in: teamIds } }
      ];
    } else {
      // HOD might also be an employee submitting requests
      where.employeeId = userId;
    }
  }
  
  // If specific employee filter is provided (Finance/Admin can use this)
  if (employeeId && (userRole === 'FINANCE_MANAGER' || userRole === 'HR_ADMIN')) {
    where.employeeId = employeeId;
  }

  const requests = await prisma.advanceRequest.findMany({
    where,
    include: { employee: { select: { name: true, employeeId: true } } },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: requests });
}

export async function getAdvanceRequest(req: AuthRequest, res: Response): Promise<void> {
  const request = await prisma.advanceRequest.findUnique({
    where: { id: req.params['id'] },
    include: { employee: { select: { name: true, employeeId: true, email: true } } }
  });

  if (!request) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  // Role-based check
  if (req.user!.role !== 'FINANCE_MANAGER' && req.user!.role !== 'HR_ADMIN') {
    if (request.employeeId !== req.user!.userId) {
      const user = await prisma.user.findUnique({ where: { id: request.employeeId } });
      if (user?.reportingManagerId !== req.user!.userId) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }
  }

  res.json({ success: true, data: request });
}

export async function approveAdvanceRequest(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const request = await prisma.advanceRequest.findUnique({ where: { id } });
  
  if (!request || request.status !== 'PENDING_MANAGER') {
    res.status(400).json({ success: false, message: 'Request not found or not in PENDING_MANAGER status' });
    return;
  }

  await prisma.advanceRequest.update({
    where: { id },
    data: { status: 'PENDING_FINANCE', managerRemark: req.body.remark || 'Approved' }
  });

  await logAction({
    entityType: 'AdvanceRequest', entityId: id, action: 'APPROVE',
    performedById: req.user!.userId, oldValue: { status: 'PENDING_MANAGER' }, newValue: { status: 'PENDING_FINANCE' },
    ipAddress: req.ip,
  });

  // Notify Finance
  const finances = await prisma.user.findMany({ where: { role: 'FINANCE_MANAGER' } });
  for (const f of finances) {
    await notify({
      channel: 'email', to: f.email,
      subject: `Advance Request Pending Finance: ${request.referenceNumber}`,
      body: `An advance request of ₹${request.amount} has been approved by the manager and is pending your processing.`
    });
  }

  res.json({ success: true, message: 'Approved and forwarded to Finance' });
}

export async function rejectAdvanceRequest(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { remark } = req.body;
  if (!remark) {
    res.status(400).json({ success: false, message: 'Remark is required to reject' });
    return;
  }

  const request = await prisma.advanceRequest.findUnique({ where: { id }, include: { employee: true } });
  if (!request || request.status !== 'PENDING_MANAGER') {
    res.status(400).json({ success: false, message: 'Request not found or not in PENDING_MANAGER status' });
    return;
  }

  await prisma.advanceRequest.update({
    where: { id },
    data: { status: 'REJECTED', managerRemark: remark }
  });

  await logAction({
    entityType: 'AdvanceRequest', entityId: id, action: 'REJECT',
    performedById: req.user!.userId, oldValue: { status: 'PENDING_MANAGER' }, newValue: { status: 'REJECTED', remark },
    ipAddress: req.ip,
  });

  await notify({
    channel: 'email', to: request.employee.email,
    subject: `Advance Request Rejected: ${request.referenceNumber}`,
    body: `Your advance request of ₹${request.amount} was rejected by your manager.\nReason: ${remark}`
  });

  res.json({ success: true, message: 'Request rejected' });
}

export async function processPayment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { remark } = req.body;

  const request = await prisma.advanceRequest.findUnique({ where: { id }, include: { employee: true } });
  if (!request || request.status !== 'PENDING_FINANCE') {
    res.status(400).json({ success: false, message: 'Request not found or not pending finance' });
    return;
  }

  const updated = await prisma.advanceRequest.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date(), financeRemark: remark }
  });

  await logAction({
    entityType: 'AdvanceRequest', entityId: id, action: 'PROCESS_PAYMENT',
    performedById: req.user!.userId, oldValue: { status: 'PENDING_FINANCE' }, newValue: { status: 'PAID', remark },
    ipAddress: req.ip,
  });

  await notify({
    channel: 'email', to: request.employee.email,
    subject: `Advance Payment Processed: ${request.referenceNumber}`,
    body: `Your advance request of ₹${request.amount} has been paid.`
  });

  res.json({ success: true, data: updated });
}
