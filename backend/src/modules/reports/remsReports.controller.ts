import { Response } from 'express';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';

// Shared utility for date ranges
function getDateFilter(from?: string, to?: string) {
  const filter: any = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

export async function projectWiseExpense(req: AuthRequest, res: Response) {
  const { project, from, to, expenseHead, employeeId, status } = req.query as any;

  const whereReimb: any = {};
  if (project) whereReimb.projectName = { contains: project, mode: 'insensitive' };
  if (status) whereReimb.status = status;
  if (employeeId) whereReimb.employeeId = employeeId;
  const dateFilter = getDateFilter(from, to);
  if (dateFilter) whereReimb.createdAt = dateFilter;

  const reimbursements = await prisma.reimbursementRequest.findMany({
    where: whereReimb,
    include: {
      employee: { select: { name: true, employeeId: true } },
      expenseEntries: expenseHead ? { where: { expenseHead } } : true
    }
  });

  // Filter out reimbursements that have no matching expense entries if expenseHead was specified
  const filtered = expenseHead ? reimbursements.filter(r => r.expenseEntries.length > 0) : reimbursements;
  
  res.json({ success: true, data: filtered });
}

export async function expenseHeadWise(req: AuthRequest, res: Response) {
  const { from, to, expenseHead } = req.query as any;

  const where: any = {};
  if (expenseHead) where.expenseHead = expenseHead;
  const dateFilter = getDateFilter(from, to);
  if (dateFilter) where.createdAt = dateFilter;

  const entries = await prisma.expenseEntry.groupBy({
    by: ['expenseHead'],
    where,
    _sum: { amount: true },
    _count: { id: true }
  });

  res.json({ success: true, data: entries });
}

export async function projectAndHeadWise(req: AuthRequest, res: Response) {
  const { project, from, to, expenseHead } = req.query as any;
  const dateFilter = getDateFilter(from, to);

  const whereEntry: any = {};
  if (expenseHead) whereEntry.expenseHead = expenseHead;
  if (dateFilter) whereEntry.createdAt = dateFilter;

  const entries = await prisma.expenseEntry.findMany({
    where: {
      ...whereEntry,
      reimbursementRequest: project ? { projectName: { contains: project, mode: 'insensitive' } } : undefined
    },
    include: {
      reimbursementRequest: { select: { projectName: true } }
    }
  });

  const grouped: Record<string, Record<string, number>> = {};
  
  for (const e of entries) {
    const proj = e.reimbursementRequest.projectName;
    const head = e.expenseHead;
    if (!grouped[proj]) grouped[proj] = {};
    if (!grouped[proj][head]) grouped[proj][head] = 0;
    grouped[proj][head] += Number(e.amount);
  }

  res.json({ success: true, data: grouped });
}

export async function employeeWise(req: AuthRequest, res: Response) {
  const { employeeId, project, from, to, expenseHead } = req.query as any;
  
  const whereReimb: any = {};
  if (employeeId) whereReimb.employeeId = employeeId;
  if (project) whereReimb.projectName = { contains: project, mode: 'insensitive' };
  const dateFilter = getDateFilter(from, to);
  if (dateFilter) whereReimb.createdAt = dateFilter;

  const requests = await prisma.reimbursementRequest.findMany({
    where: whereReimb,
    include: { employee: true, expenseEntries: true }
  });

  const empStats: any = {};

  for (const r of requests) {
    const emp = r.employee.name;
    if (!empStats[emp]) empStats[emp] = { total: 0, heads: {} };
    
    for (const e of r.expenseEntries) {
      if (expenseHead && e.expenseHead !== expenseHead) continue;
      
      const amt = Number(e.amount);
      empStats[emp].total += amt;
      empStats[emp].heads[e.expenseHead] = (empStats[emp].heads[e.expenseHead] || 0) + amt;
    }
  }

  // Calculate % contribution
  Object.keys(empStats).forEach(emp => {
    const total = empStats[emp].total;
    empStats[emp].percentages = {};
    if (total > 0) {
      Object.keys(empStats[emp].heads).forEach(h => {
        empStats[emp].percentages[h] = ((empStats[emp].heads[h] / total) * 100).toFixed(2) + '%';
      });
    }
  });

  res.json({ success: true, data: empStats });
}

export async function managerApprovalStats(req: AuthRequest, res: Response) {
  const { managerId, from, to } = req.query as any;
  
  // We look at the audit log to see manager actions
  const where: any = {
    entityType: { in: ['AdvanceRequest', 'ReimbursementRequest'] },
    action: { in: ['APPROVE', 'REJECT'] },
  };
  
  if (managerId) where.performedById = managerId;
  const dateFilter = getDateFilter(from, to);
  if (dateFilter) where.createdAt = dateFilter;

  const logs = await prisma.auditLog.findMany({
    where,
    include: { performedBy: { select: { name: true } } }
  });

  const stats: any = {};
  for (const log of logs) {
    const mgr = log.performedBy.name;
    if (!stats[mgr]) stats[mgr] = { APPROVED: 0, REJECTED: 0, TOTAL: 0 };
    
    stats[mgr][log.action]++;
    stats[mgr].TOTAL++;
  }

  res.json({ success: true, data: stats });
}

export async function advanceVsSettlement(req: AuthRequest, res: Response) {
  const { employeeId, from, to } = req.query as any;

  const where: any = { status: 'PAID' }; // Only settled advances and reimbursements
  if (employeeId) where.employeeId = employeeId;
  const dateFilter = getDateFilter(from, to);
  if (dateFilter) where.createdAt = dateFilter;

  const advances = await prisma.advanceRequest.findMany({ where, include: { employee: true } });
  const reimbs = await prisma.reimbursementRequest.findMany({ where, include: { employee: true } });

  const result: any = {};
  
  advances.forEach(a => {
    const emp = a.employee.name;
    if (!result[emp]) result[emp] = { advanceTaken: 0, expenseSubmitted: 0, balance: 0 };
    result[emp].advanceTaken += Number(a.amount);
  });

  reimbs.forEach(r => {
    const emp = r.employee.name;
    if (!result[emp]) result[emp] = { advanceTaken: 0, expenseSubmitted: 0, balance: 0 };
    result[emp].expenseSubmitted += Number(r.totalAmount);
  });

  Object.keys(result).forEach(emp => {
    result[emp].balance = result[emp].advanceTaken - result[emp].expenseSubmitted;
  });

  res.json({ success: true, data: result });
}

export async function pendingApprovals(_req: AuthRequest, res: Response) {
  const pendingAdvances = await prisma.advanceRequest.findMany({
    where: { status: { in: ['PENDING_MANAGER', 'PENDING_FINANCE'] } },
    include: { employee: { select: { name: true } } }
  });

  const pendingReimbs = await prisma.reimbursementRequest.findMany({
    where: { status: { in: ['PENDING_MANAGER', 'PENDING_FINANCE'] } },
    include: { employee: { select: { name: true } } }
  });

  const now = new Date().getTime();
  
  const mapWithAgeing = (item: any, type: string) => {
    const ageDays = Math.floor((now - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24));
    return { ...item, type, ageDays };
  };

  const data = [
    ...pendingAdvances.map(a => mapWithAgeing(a, 'ADVANCE')),
    ...pendingReimbs.map(r => mapWithAgeing(r, 'REIMBURSEMENT'))
  ];

  res.json({ success: true, data });
}

export async function paymentStatus(req: AuthRequest, res: Response) {
  const { from, to, status } = req.query as any;

  const where: any = {};
  if (status) where.status = status;
  const dateFilter = getDateFilter(from, to);
  if (dateFilter) where.paidAt = dateFilter;

  const advances = await prisma.advanceRequest.findMany({ where, include: { employee: true } });
  const reimbs = await prisma.reimbursementRequest.findMany({ where, include: { employee: true } });

  res.json({
    success: true,
    data: {
      advances,
      reimbursements: reimbs
    }
  });
}
