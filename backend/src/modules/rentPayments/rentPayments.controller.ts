import { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';

const recordPaymentSchema = z.object({
  paymentMonth: z.number().int().min(1).max(12),
  paymentYear: z.number().int().min(2020),
  rentAmount: z.number().positive(),
  advanceAmount: z.number().min(0).optional().default(0),
  paymentDate: z.string().datetime(),
  remark: z.string().optional(),
});

// POST /api/rooms/:id/payments
export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  const roomId = req.params['id'];

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  if (room.status !== 'ACTIVE') {
    res.status(400).json({ success: false, message: 'Payments can only be recorded for ACTIVE rooms' });
    return;
  }

  const parse = recordPaymentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const data = parse.data;

  // Check duplicate
  const existing = await prisma.rentPayment.findUnique({
    where: { roomId_paymentMonth_paymentYear: { roomId, paymentMonth: data.paymentMonth, paymentYear: data.paymentYear } },
  });
  if (existing) {
    res.status(409).json({ success: false, message: `Payment for ${data.paymentMonth}/${data.paymentYear} already recorded` });
    return;
  }

  const payment = await prisma.rentPayment.create({
    data: {
      roomId,
      paymentMonth: data.paymentMonth,
      paymentYear: data.paymentYear,
      rentAmount: new Prisma.Decimal(data.rentAmount),
      advanceAmount: new Prisma.Decimal(data.advanceAmount ?? 0),
      paymentDate: new Date(data.paymentDate),
      remark: data.remark,
      recordedById: req.user!.userId,
    },
    include: { recordedBy: { select: { name: true, employeeId: true } } },
  });

  await logAction({
    entityType: 'RentPayment', entityId: payment.id, action: 'CREATE',
    performedById: req.user!.userId,
    newValue: { roomId, paymentMonth: data.paymentMonth, paymentYear: data.paymentYear, rentAmount: data.rentAmount },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: payment });
}

// GET /api/rooms/:id/payments
export async function listPayments(req: AuthRequest, res: Response): Promise<void> {
  const roomId = req.params['id'];

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  const { year } = req.query as { year?: string };
  const where: Prisma.RentPaymentWhereInput = { roomId };
  if (year) where.paymentYear = parseInt(year);

  const payments = await prisma.rentPayment.findMany({
    where,
    orderBy: [{ paymentYear: 'desc' }, { paymentMonth: 'desc' }],
    include: { recordedBy: { select: { name: true } } },
  });

  res.json({ success: true, data: payments });
}
