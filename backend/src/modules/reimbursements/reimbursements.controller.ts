import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';
import { notify } from '../../utils/notification';

const expenseEntrySchema = z.object({
  expenseHead: z.string().min(2),
  amount: z.number().positive(),
  expenseDate: z.string().datetime(),
  billType: z.enum(['INVOICE', 'CASH_VOUCHER']),
  documentUrl: z.string().min(5, 'Document URL is required for every expense entry'),
  cashVoucherReason: z.string().optional()
});

const createReimbursementSchema = z.object({
  projectName: z.string().min(2),
  travelActivityDetails: z.string().min(5),
  totalAmount: z.number().positive(),
  expenses: z.array(expenseEntrySchema).min(1, 'At least one expense entry is required')
});

async function generateReimbRef(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.reimbursementRequest.count({
    where: { referenceNumber: { startsWith: `REIMB/${year}/` } }
  });
  const padded = String(count + 1).padStart(4, '0');
  return `REIMB/${year}/${padded}`;
}

export async function createReimbursement(req: AuthRequest, res: Response): Promise<void> {
  const parse = createReimbursementSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }
  
  const data = parse.data;
  
  // Strict Validation: Expense dates must be within current or previous month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let calculatedTotal = 0;
  let totalCash = 0;

  for (const exp of data.expenses) {
    const expDate = new Date(exp.expenseDate);
    const expMonth = expDate.getMonth();
    const expYear = expDate.getFullYear();

    const isCurrentMonth = expMonth === currentMonth && expYear === currentYear;
    const isPreviousMonth = expMonth === previousMonth && expYear === previousMonthYear;

    if (!isCurrentMonth && !isPreviousMonth) {
      res.status(400).json({ success: false, message: 'Expense dates must be within the current or previous month only' });
      return;
    }

    if (exp.billType === 'CASH_VOUCHER') {
      if (exp.amount > 5000) {
        res.status(400).json({ success: false, message: 'Individual cash voucher cannot exceed ₹5,000' });
        return;
      }
      totalCash += exp.amount;
    }

    calculatedTotal += exp.amount;
  }

  // Float precision fix
  calculatedTotal = Math.round(calculatedTotal * 100) / 100;
  const passedTotal = Math.round(data.totalAmount * 100) / 100;

  if (calculatedTotal !== passedTotal) {
    res.status(400).json({ success: false, message: 'Total amount does not match the sum of individual expenses' });
    return;
  }

  // Cash > 10,000 rule (assuming the justification must be provided somewhere if total cash > 10k,
  // we will check if any cash voucher reason is missing if total > 10k, or just enforce a generic rule)
  if (totalCash > 10000) {
    const hasReason = data.expenses.some(e => e.billType === 'CASH_VOUCHER' && e.cashVoucherReason);
    if (!hasReason) {
      res.status(400).json({ success: false, message: 'Cash expenses exceeding ₹10,000 require a proper justification' });
      return;
    }
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const referenceNumber = await generateReimbRef();

  const reimb = await prisma.reimbursementRequest.create({
    data: {
      referenceNumber,
      employeeId: user.id,
      projectName: data.projectName,
      travelActivityDetails: data.travelActivityDetails,
      totalAmount: data.totalAmount,
      status: 'PENDING_MANAGER',
      expenseEntries: {
        create: data.expenses.map(e => ({
          expenseHead: e.expenseHead,
          amount: e.amount,
          expenseDate: new Date(e.expenseDate),
          billType: e.billType,
          documentUrl: e.documentUrl,
          cashVoucherReason: e.cashVoucherReason,
          // Simple TDS rule stub (e.g. if amount > 30000)
          tdsApplicable: e.amount > 30000,
          tdsFlag: e.amount > 30000
        }))
      }
    },
    include: { expenseEntries: true }
  });

  await logAction({
    entityType: 'ReimbursementRequest', entityId: reimb.id, action: 'CREATE',
    performedById: user.id, newValue: { referenceNumber, totalAmount: data.totalAmount },
    ipAddress: req.ip,
  });

  if (user.reportingManagerId) {
    const manager = await prisma.user.findUnique({ where: { id: user.reportingManagerId } });
    if (manager) {
      await notify({
        channel: 'email', to: manager.email,
        subject: `Reimbursement Submitted: ${referenceNumber}`,
        body: `Dear ${manager.name},\n${user.name} has submitted a reimbursement request of ₹${data.totalAmount} for ${data.projectName}.\nPlease log in to review.`
      });
    }
  }

  res.status(201).json({ success: true, data: reimb });
}

export async function listReimbursements(req: AuthRequest, res: Response): Promise<void> {
  const { status, employeeId, projectName, expenseHead } = req.query as Record<string, string>;
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
      where.employeeId = userId;
    }
  }
  
  if (employeeId && (userRole === 'FINANCE_MANAGER' || userRole === 'HR_ADMIN')) {
    where.employeeId = employeeId;
  }

  if (expenseHead) {
    where.expenseEntries = { some: { expenseHead } };
  }

  const requests = await prisma.reimbursementRequest.findMany({
    where,
    include: { 
      employee: { select: { name: true, employeeId: true } },
      expenseEntries: true 
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: requests });
}

export async function getReimbursement(req: AuthRequest, res: Response): Promise<void> {
  const request = await prisma.reimbursementRequest.findUnique({
    where: { id: req.params['id'] },
    include: { 
      employee: { select: { name: true, employeeId: true, email: true } },
      expenseEntries: true
    }
  });

  if (!request) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

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

export async function approveReimbursement(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const request = await prisma.reimbursementRequest.findUnique({ where: { id } });
  
  if (!request || request.status !== 'PENDING_MANAGER') {
    res.status(400).json({ success: false, message: 'Request not found or not in PENDING_MANAGER status' });
    return;
  }

  await prisma.reimbursementRequest.update({
    where: { id },
    data: { status: 'PENDING_FINANCE', managerRemark: req.body.remark || 'Approved' }
  });

  await logAction({
    entityType: 'ReimbursementRequest', entityId: id, action: 'APPROVE',
    performedById: req.user!.userId, oldValue: { status: 'PENDING_MANAGER' }, newValue: { status: 'PENDING_FINANCE' },
    ipAddress: req.ip,
  });

  const finances = await prisma.user.findMany({ where: { role: 'FINANCE_MANAGER' } });
  for (const f of finances) {
    await notify({
      channel: 'email', to: f.email,
      subject: `Reimbursement Pending Finance: ${request.referenceNumber}`,
      body: `A reimbursement of ₹${request.totalAmount} has been approved by the manager and is pending your processing.`
    });
  }

  res.json({ success: true, message: 'Approved and forwarded to Finance' });
}

export async function rejectReimbursement(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { remark } = req.body;
  if (!remark) {
    res.status(400).json({ success: false, message: 'Remark is required to reject' });
    return;
  }

  const request = await prisma.reimbursementRequest.findUnique({ where: { id }, include: { employee: true } });
  if (!request || request.status !== 'PENDING_MANAGER') {
    res.status(400).json({ success: false, message: 'Request not found or not in PENDING_MANAGER status' });
    return;
  }

  await prisma.reimbursementRequest.update({
    where: { id },
    data: { status: 'REJECTED', managerRemark: remark }
  });

  await logAction({
    entityType: 'ReimbursementRequest', entityId: id, action: 'REJECT',
    performedById: req.user!.userId, oldValue: { status: 'PENDING_MANAGER' }, newValue: { status: 'REJECTED', remark },
    ipAddress: req.ip,
  });

  await notify({
    channel: 'email', to: request.employee.email,
    subject: `Reimbursement Rejected: ${request.referenceNumber}`,
    body: `Your reimbursement of ₹${request.totalAmount} was rejected by your manager.\nReason: ${remark}`
  });

  res.json({ success: true, message: 'Request rejected' });
}

export async function processPayment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { remark } = req.body;

  const request = await prisma.reimbursementRequest.findUnique({ where: { id }, include: { employee: true } });
  if (!request || request.status !== 'PENDING_FINANCE') {
    res.status(400).json({ success: false, message: 'Request not found or not pending finance' });
    return;
  }

  const updated = await prisma.reimbursementRequest.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date(), financeRemark: remark }
  });

  await logAction({
    entityType: 'ReimbursementRequest', entityId: id, action: 'PROCESS_PAYMENT',
    performedById: req.user!.userId, oldValue: { status: 'PENDING_FINANCE' }, newValue: { status: 'PAID', remark },
    ipAddress: req.ip,
  });

  await notify({
    channel: 'email', to: request.employee.email,
    subject: `Reimbursement Payment Processed: ${request.referenceNumber}`,
    body: `Your reimbursement of ₹${request.totalAmount} has been paid.`
  });

  res.json({ success: true, data: updated });
}
