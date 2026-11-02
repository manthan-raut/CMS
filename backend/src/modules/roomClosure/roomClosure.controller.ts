import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';
import { notify } from '../../utils/notification';

const requestClosureSchema = z.object({
  closureDate: z.string().datetime(),
  reason: z.string().min(5),
  remark: z.string().optional(),
});

// POST /api/rooms/:id/closure
export async function requestClosure(req: AuthRequest, res: Response): Promise<void> {
  const roomId = req.params['id'];

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  if (room.status !== 'ACTIVE') {
    res.status(400).json({ success: false, message: 'Only ACTIVE rooms can be closed' });
    return;
  }

  const parse = requestClosureSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const { closureDate, reason, remark } = parse.data;

  const closure = await prisma.roomClosure.create({
    data: {
      roomId,
      closureDate: new Date(closureDate),
      reason,
      remark,
      requestedById: req.user!.userId,
      status: 'PENDING',
    },
  });

  await prisma.room.update({ where: { id: roomId }, data: { status: 'PENDING_CLOSURE' } });

  await logAction({
    entityType: 'RoomClosure', entityId: closure.id, action: 'REQUEST',
    performedById: req.user!.userId,
    newValue: { roomId, reason, closureDate },
    ipAddress: req.ip,
  });

  // Notify HOD
  const hods = await prisma.user.findMany({ where: { role: 'HOD', status: 'ACTIVE' } });
  for (const hod of hods) {
    await notify({
      channel: 'email', to: hod.email,
      subject: 'Room Closure Request — Action Required',
      body: `Dear ${hod.name},\nA room closure has been requested.\nProject: ${room.projectName} | City: ${room.city}\nReason: ${reason}\nPlease review and approve or reject.`,
    });
  }

  res.status(201).json({ success: true, data: closure });
}

// POST /api/rooms/:id/closure/:closureId/approve
export async function approveClosure(req: AuthRequest, res: Response): Promise<void> {
  const { id: roomId, closureId } = req.params as { id: string; closureId: string };
  const { reviewRemark } = req.body as { reviewRemark?: string };

  const closure = await prisma.roomClosure.findFirst({ where: { id: closureId, roomId } });
  if (!closure) {
    res.status(404).json({ success: false, message: 'Closure request not found' });
    return;
  }
  if (closure.status !== 'PENDING') {
    res.status(400).json({ success: false, message: 'Closure request already reviewed' });
    return;
  }

  await prisma.$transaction([
    prisma.roomClosure.update({
      where: { id: closureId },
      data: { status: 'APPROVED', reviewedById: req.user!.userId, reviewRemark },
    }),
    prisma.room.update({ where: { id: roomId }, data: { status: 'CLOSED' } }),
  ]);

  await logAction({
    entityType: 'RoomClosure', entityId: closureId, action: 'APPROVE',
    performedById: req.user!.userId,
    oldValue: { status: 'PENDING' }, newValue: { status: 'APPROVED' },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Room closure approved' });
}

// POST /api/rooms/:id/closure/:closureId/reject
export async function rejectClosure(req: AuthRequest, res: Response): Promise<void> {
  const { id: roomId, closureId } = req.params as { id: string; closureId: string };
  const { reviewRemark } = req.body as { reviewRemark?: string };

  if (!reviewRemark) {
    res.status(400).json({ success: false, message: 'Review remark (reason) is required to reject a closure request' });
    return;
  }

  const closure = await prisma.roomClosure.findFirst({ where: { id: closureId, roomId } });
  if (!closure) {
    res.status(404).json({ success: false, message: 'Closure request not found' });
    return;
  }
  if (closure.status !== 'PENDING') {
    res.status(400).json({ success: false, message: 'Closure request already reviewed' });
    return;
  }

  await prisma.$transaction([
    prisma.roomClosure.update({
      where: { id: closureId },
      data: { status: 'REJECTED', reviewedById: req.user!.userId, reviewRemark },
    }),
    prisma.room.update({ where: { id: roomId }, data: { status: 'ACTIVE' } }),
  ]);

  await logAction({
    entityType: 'RoomClosure', entityId: closureId, action: 'REJECT',
    performedById: req.user!.userId,
    oldValue: { status: 'PENDING' }, newValue: { status: 'REJECTED' },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Room closure rejected — room restored to ACTIVE' });
}
