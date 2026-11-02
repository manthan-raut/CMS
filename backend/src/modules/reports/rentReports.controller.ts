import { Response } from 'express';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { Prisma } from '@prisma/client';

// ── Helper: month name ──────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// T2.19 — GET /api/reports/rent/monthly-rent-payable?month=&year=
export async function monthlyRentPayable(req: AuthRequest, res: Response): Promise<void> {
  const { month, year } = req.query as { month?: string; year?: string };
  const now = new Date();
  const m = month ? parseInt(month) : now.getMonth() + 1;
  const y = year ? parseInt(year) : now.getFullYear();

  const activeRooms = await prisma.room.findMany({
    where: { status: 'ACTIVE' },
    include: { owner: { select: { name: true, bankName: true, accountNumber: true, ifscCode: true } } },
    orderBy: { projectName: 'asc' },
  });

  const paymentsMade = await prisma.rentPayment.findMany({
    where: { paymentMonth: m, paymentYear: y },
    select: { roomId: true, rentAmount: true, advanceAmount: true },
  });

  const paidMap = new Map(paymentsMade.map(p => [p.roomId, p]));

  const rows = activeRooms.map(room => {
    const payment = paidMap.get(room.id);
    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      projectName: room.projectName,
      city: room.city,
      ownerName: room.owner.name,
      monthlyRent: room.monthlyRent,
      paymentStatus: payment ? 'PAID' : 'UNPAID',
      paidAmount: payment?.rentAmount ?? null,
    };
  });

  const totalRent = rows.reduce((s, r) => s + parseFloat(r.monthlyRent.toString()), 0);
  const totalPaid = rows.filter(r => r.paymentStatus === 'PAID').reduce((s, r) => s + parseFloat((r.paidAmount ?? 0).toString()), 0);

  res.json({
    success: true,
    data: { month: m, year: y, rows, summary: { totalRooms: rows.length, totalRentPayable: totalRent, totalPaid, totalUnpaid: totalRent - totalPaid } },
  });
}

// T2.20 — GET /api/reports/rent/monthly-advance-payable?month=&year=
export async function monthlyAdvancePayable(req: AuthRequest, res: Response): Promise<void> {
  const { month, year } = req.query as { month?: string; year?: string };
  const now = new Date();
  const m = month ? parseInt(month) : now.getMonth() + 1;
  const y = year ? parseInt(year) : now.getFullYear();

  const payments = await prisma.rentPayment.findMany({
    where: { paymentMonth: m, paymentYear: y, advanceAmount: { gt: 0 } },
    include: { room: { select: { roomNumber: true, projectName: true, city: true } } },
    orderBy: { paymentDate: 'desc' },
  });

  const total = payments.reduce((s, p) => s + parseFloat(p.advanceAmount.toString()), 0);
  res.json({ success: true, data: { month: m, year: y, rows: payments, summary: { totalAdvance: total } } });
}

// T2.21 — GET /api/reports/rent/project-wise-rooms?projectName=
export async function projectWiseRooms(req: AuthRequest, res: Response): Promise<void> {
  const { projectName } = req.query as { projectName?: string };

  const where: Prisma.RoomWhereInput = {};
  if (projectName) where.projectName = { contains: projectName, mode: 'insensitive' };

  const rooms = await prisma.room.groupBy({
    by: ['projectName', 'status'],
    _count: { id: true },
    _sum: { monthlyRent: true },
    where,
    orderBy: { projectName: 'asc' },
  });

  res.json({ success: true, data: rooms });
}

// T2.22 — GET /api/reports/rent/year-wise-payments?year=
export async function yearWisePayments(req: AuthRequest, res: Response): Promise<void> {
  const { year } = req.query as { year?: string };
  const y = year ? parseInt(year) : new Date().getFullYear();

  const payments = await prisma.rentPayment.groupBy({
    by: ['paymentMonth'],
    where: { paymentYear: y },
    _sum: { rentAmount: true, advanceAmount: true },
    _count: { id: true },
    orderBy: { paymentMonth: 'asc' },
  });

  const rows = payments.map(p => ({
    month: p.paymentMonth,
    monthName: MONTHS[p.paymentMonth - 1],
    paymentsCount: p._count.id,
    totalRent: p._sum.rentAmount,
    totalAdvance: p._sum.advanceAmount,
  }));

  const grandTotal = rows.reduce((s, r) => s + parseFloat((r.totalRent ?? 0).toString()), 0);
  res.json({ success: true, data: { year: y, rows, summary: { grandTotalRent: grandTotal } } });
}

// T2.23 — GET /api/reports/rent/room-ledger?roomId=
export async function roomLedger(req: AuthRequest, res: Response): Promise<void> {
  const { roomId } = req.query as { roomId?: string };
  if (!roomId) {
    res.status(400).json({ success: false, message: 'roomId is required' });
    return;
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: true, broker: true,
      createdBy: { select: { name: true } },
      payments: { orderBy: [{ paymentYear: 'asc' }, { paymentMonth: 'asc' }] },
      closureRequests: { include: { requestedBy: { select: { name: true } }, reviewedBy: { select: { name: true } } } },
    },
  });

  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  const totalPaid = room.payments.reduce((s, p) => s + parseFloat(p.rentAmount.toString()), 0);
  res.json({ success: true, data: { room, summary: { totalPayments: room.payments.length, totalAmountPaid: totalPaid } } });
}

// T2.24 — GET /api/reports/rent/active-rooms?project=&city=&from=&to=
export async function activeRoomsReport(req: AuthRequest, res: Response): Promise<void> {
  const { project, city, from, to } = req.query as Record<string, string>;

  const where: Prisma.RoomWhereInput = { status: 'ACTIVE' };
  if (project) where.projectName = { contains: project, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (from || to) {
    where.startDate = {};
    if (from) (where.startDate as { gte?: Date }).gte = new Date(from);
    if (to) (where.startDate as { lte?: Date }).lte = new Date(to);
  }

  const rooms = await prisma.room.findMany({
    where,
    include: { owner: { select: { name: true, mobile: true } }, createdBy: { select: { name: true } } },
    orderBy: { projectName: 'asc' },
  });

  const totalMonthlyRent = rooms.reduce((s, r) => s + parseFloat(r.monthlyRent.toString()), 0);
  res.json({ success: true, data: rooms, summary: { total: rooms.length, totalMonthlyRent } });
}

// T2.25 — GET /api/reports/rent/closed-rooms?project=&city=&closedFrom=&closedTo=
export async function closedRoomsReport(req: AuthRequest, res: Response): Promise<void> {
  const { project, city, closedFrom, closedTo } = req.query as Record<string, string>;

  const closureWhere: Prisma.RoomClosureWhereInput = { status: 'APPROVED' };
  if (closedFrom || closedTo) {
    closureWhere.closureDate = {};
    if (closedFrom) (closureWhere.closureDate as { gte?: Date }).gte = new Date(closedFrom);
    if (closedTo) (closureWhere.closureDate as { lte?: Date }).lte = new Date(closedTo);
  }

  const roomWhere: Prisma.RoomWhereInput = { status: 'CLOSED' };
  if (project) roomWhere.projectName = { contains: project, mode: 'insensitive' };
  if (city) roomWhere.city = { contains: city, mode: 'insensitive' };

  const rooms = await prisma.room.findMany({
    where: { ...roomWhere, closureRequests: { some: closureWhere } },
    include: {
      owner: { select: { name: true } },
      closureRequests: { where: closureWhere, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ success: true, data: rooms, summary: { total: rooms.length } });
}

// T2.26 — GET /api/reports/rent/pending-hod-approval
export async function pendingHodApproval(req: AuthRequest, res: Response): Promise<void> {
  const { requestType } = req.query as { requestType?: string };

  const pendingRooms = requestType !== 'closure'
    ? await prisma.room.findMany({
        where: { status: 'PENDING_APPROVAL' },
        include: { createdBy: { select: { name: true } }, owner: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const pendingClosures = requestType !== 'room'
    ? await prisma.roomClosure.findMany({
        where: { status: 'PENDING' },
        include: { room: { select: { roomNumber: true, projectName: true, city: true } }, requestedBy: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  res.json({
    success: true,
    data: { pendingRooms, pendingClosures },
    summary: { pendingRoomsCount: pendingRooms.length, pendingClosuresCount: pendingClosures.length },
  });
}

// T2.27 — GET /api/reports/rent/rent-due
export async function rentDueReport(req: AuthRequest, res: Response): Promise<void> {
  const { month, year } = req.query as { month?: string; year?: string };
  const now = new Date();
  const m = month ? parseInt(month) : now.getMonth() + 1;
  const y = year ? parseInt(year) : now.getFullYear();

  const activeRooms = await prisma.room.findMany({
    where: { status: 'ACTIVE' },
    include: {
      owner: { select: { name: true } },
      payments: { where: { paymentMonth: m, paymentYear: y } },
    },
    orderBy: { projectName: 'asc' },
  });

  const rows = activeRooms.map(room => {
    const payment = room.payments[0];
    const isPaid = !!payment;
    const paidAmount = payment ? parseFloat(payment.rentAmount.toString()) : 0;
    const dueAmount = parseFloat(room.monthlyRent.toString()) - paidAmount;
    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      projectName: room.projectName,
      city: room.city,
      ownerName: room.owner.name,
      monthlyRent: room.monthlyRent,
      paidAmount,
      dueAmount: Math.max(0, dueAmount),
      status: isPaid ? 'PAID' : 'UNPAID',
    };
  });

  const summary = {
    total: rows.length,
    paid: rows.filter(r => r.status === 'PAID').length,
    unpaid: rows.filter(r => r.status === 'UNPAID').length,
    totalDueAmount: rows.reduce((s, r) => s + r.dueAmount, 0),
    totalPaidAmount: rows.reduce((s, r) => s + r.paidAmount, 0),
  };

  res.json({ success: true, data: { month: m, year: y, rows, summary } });
}

// T2.28 — GET /api/reports/rent/agreement-expiry?days=30|60|90
export async function agreementExpiryReport(req: AuthRequest, res: Response): Promise<void> {
  const days = parseInt((req.query as { days?: string }).days ?? '30');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const rooms = await prisma.room.findMany({
    where: { status: 'ACTIVE', agreementEndDate: { lte: cutoff, not: null } },
    include: { owner: { select: { name: true, mobile: true } } },
    orderBy: { agreementEndDate: 'asc' },
  });

  res.json({ success: true, data: rooms, summary: { total: rooms.length, withinDays: days } });
}

// T2.29 — GET /api/reports/rent/owner-wise?ownerId=&year=
export async function ownerWiseReport(req: AuthRequest, res: Response): Promise<void> {
  const { ownerId, year } = req.query as { ownerId?: string; year?: string };
  const y = year ? parseInt(year) : new Date().getFullYear();

  const where: Prisma.RoomWhereInput = {};
  if (ownerId) where.ownerId = ownerId;

  const rooms = await prisma.room.findMany({
    where,
    include: {
      owner: { select: { name: true, mobile: true, bankName: true, accountNumber: true, ifscCode: true } },
      payments: { where: { paymentYear: y }, orderBy: { paymentMonth: 'asc' } },
    },
    orderBy: { projectName: 'asc' },
  });

  res.json({ success: true, data: rooms });
}

// T2.30 — GET /api/reports/rent/city-wise
export async function cityWiseReport(_req: AuthRequest, res: Response): Promise<void> {
  const data = await prisma.room.groupBy({
    by: ['city', 'status'],
    _count: { id: true },
    _sum: { monthlyRent: true },
    orderBy: { city: 'asc' },
  });

  res.json({ success: true, data });
}

// T2.31 — GET /api/reports/rent/brokerage?brokerId=&status=&projectName=
export async function brokerageReport(req: AuthRequest, res: Response): Promise<void> {
  const { brokerId, status, projectName } = req.query as Record<string, string>; // eslint-disable-line

  const where: Prisma.RoomWhereInput = { brokerId: { not: null } };
  if (brokerId) where.brokerId = brokerId;
  if (status) where.status = status as 'PENDING_APPROVAL' | 'ACTIVE' | 'PENDING_CLOSURE' | 'CLOSED';
  if (projectName) where.projectName = { contains: projectName, mode: 'insensitive' };

  const rooms = await prisma.room.findMany({
    where,
    include: { broker: true, owner: { select: { name: true } } },
    orderBy: { projectName: 'asc' },
  });

  const totalBrokerage = rooms.reduce((s, r) => s + parseFloat((r.broker?.brokerageCharges ?? 0).toString()), 0);
  res.json({ success: true, data: rooms, summary: { totalRooms: rooms.length, totalBrokerage } });
}

// T2.15 — GET /api/rooms/unpaid-alert
export async function unpaidAlert(_req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();

  const paidThisMonth = await prisma.rentPayment.findMany({
    where: { paymentMonth: m, paymentYear: y },
    select: { roomId: true },
  });
  const paidIds = new Set(paidThisMonth.map(p => p.roomId));

  const unpaid = await prisma.room.findMany({
    where: { status: 'ACTIVE', id: { notIn: Array.from(paidIds) } },
    select: { id: true, roomNumber: true, projectName: true, city: true, monthlyRent: true },
    orderBy: { projectName: 'asc' },
  });

  res.json({ success: true, data: unpaid, summary: { count: unpaid.length, month: m, year: y } });
}
