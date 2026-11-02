import { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AuthRequest } from '../../middleware/authenticate';
import { logAction } from '../../utils/auditLog';
import { notify } from '../../utils/notification';

// ── Validation Schema ──────────────────────────────────────────────────────

const createRoomSchema = z.object({
  // Property info
  projectName: z.string().min(2),
  city: z.string().min(2),
  address: z.string().min(5),
  googleMapLocation: z.string().optional(),
  facilities: z.string().optional(),
  electricityIncluded: z.boolean().optional().default(false),
  waterIncluded: z.boolean().optional().default(false),
  otherUtilities: z.string().optional(),
  startDate: z.string().datetime(),
  monthlyRent: z.number().positive(),
  deposit: z.number().min(0).optional().default(0),
  occupancyCapacity: z.number().int().min(1).optional().default(1),
  remark: z.string().optional(),

  // Agreement
  agreementFileUrl: z.string().url().optional(),
  agreementStartDate: z.string().datetime().optional(),
  agreementEndDate: z.string().datetime().optional(),
  agreementRemark: z.string().optional(),

  // Broker (optional)
  brokerId: z.string().optional(),
  broker: z.object({
    name: z.string().min(2),
    mobile: z.string(),
    brokerageCharges: z.number().min(0).optional().default(0),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
  }).optional(),

  // Owner (required)
  ownerId: z.string().optional(),
  owner: z.object({
    name: z.string().min(2),
    mobile: z.string(),
    aadhaar: z.string().optional(),
    pan: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
  }).optional(),
});

// ── Helper: generate room number ────────────────────────────────────────────
async function generateRoomNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.room.count({ where: { status: { not: 'PENDING_APPROVAL' } } });
  const seq = String(count + 1).padStart(3, '0');
  return `PMGIS-${year}-${seq}`;
}

// POST /api/rooms
export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  const parse = createRoomSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const data = parse.data;

  // Resolve or create Owner
  let ownerId = data.ownerId;
  if (!ownerId) {
    if (!data.owner) {
      res.status(400).json({ success: false, message: 'Owner details are required when ownerId is not provided' });
      return;
    }
    const created = await prisma.owner.create({ data: data.owner });
    ownerId = created.id;
  }

  // Resolve or create Broker
  let brokerId = data.brokerId;
  if (!brokerId && data.broker) {
    const created = await prisma.broker.create({ data: { ...data.broker, brokerageCharges: new Prisma.Decimal(data.broker.brokerageCharges ?? 0) } });
    brokerId = created.id;
  }

  const room = await prisma.room.create({
    data: {
      projectName: data.projectName,
      city: data.city,
      address: data.address,
      googleMapLocation: data.googleMapLocation,
      facilities: data.facilities,
      electricityIncluded: data.electricityIncluded,
      waterIncluded: data.waterIncluded,
      otherUtilities: data.otherUtilities,
      startDate: new Date(data.startDate),
      monthlyRent: new Prisma.Decimal(data.monthlyRent),
      deposit: new Prisma.Decimal(data.deposit ?? 0),
      occupancyCapacity: data.occupancyCapacity,
      remark: data.remark,
      agreementFileUrl: data.agreementFileUrl,
      agreementStartDate: data.agreementStartDate ? new Date(data.agreementStartDate) : undefined,
      agreementEndDate: data.agreementEndDate ? new Date(data.agreementEndDate) : undefined,
      agreementRemark: data.agreementRemark,
      brokerId,
      ownerId: ownerId!,
      createdById: req.user!.userId,
      status: 'PENDING_APPROVAL',
    },
    include: { owner: true, broker: true, createdBy: { select: { name: true, employeeId: true } } },
  });

  await logAction({
    entityType: 'Room',
    entityId: room.id,
    action: 'CREATE',
    performedById: req.user!.userId,
    newValue: { projectName: room.projectName, city: room.city, monthlyRent: room.monthlyRent.toString() },
    ipAddress: req.ip,
  });

  // Notify HOD
  const hods = await prisma.user.findMany({ where: { role: 'HOD', status: 'ACTIVE' } });
  for (const hod of hods) {
    await notify({
      channel: 'email',
      to: hod.email,
      subject: 'New Room Awaiting Approval — Precision Mapping GIS',
      body: `Dear ${hod.name},\nA new room has been submitted for approval.\nProject: ${room.projectName} | City: ${room.city} | Monthly Rent: ₹${room.monthlyRent}\nSubmitted by: ${room.createdBy.name} (${room.createdBy.employeeId})\nPlease log in to approve or reject.`,
    });
  }

  res.status(201).json({ success: true, data: room });
}

// GET /api/rooms
export async function listRooms(req: AuthRequest, res: Response): Promise<void> {
  const { status, city, projectName, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: Prisma.RoomWhereInput = {};
  if (status) where.status = status as 'PENDING_APPROVAL' | 'ACTIVE' | 'PENDING_CLOSURE' | 'CLOSED';
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (projectName) where.projectName = { contains: projectName, mode: 'insensitive' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, mobile: true } },
        broker: { select: { id: true, name: true, mobile: true } },
        createdBy: { select: { id: true, name: true, employeeId: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.room.count({ where }),
  ]);

  res.json({ success: true, data: rooms, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
}

// GET /api/rooms/:id
export async function getRoom(req: AuthRequest, res: Response): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: req.params['id'] },
    include: {
      owner: true,
      broker: true,
      createdBy: { select: { id: true, name: true, employeeId: true, role: true } },
      approvedBy: { select: { id: true, name: true } },
      payments: { orderBy: [{ paymentYear: 'desc' }, { paymentMonth: 'desc' }] },
      closureRequests: { orderBy: { createdAt: 'desc' }, include: { requestedBy: { select: { name: true } }, reviewedBy: { select: { name: true } } } },
    },
  });

  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  res.json({ success: true, data: room });
}

// POST /api/rooms/:id/approve
export async function approveRoom(req: AuthRequest, res: Response): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: req.params['id'] } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  if (room.status !== 'PENDING_APPROVAL') {
    res.status(400).json({ success: false, message: 'Room is not in PENDING_APPROVAL status' });
    return;
  }

  const roomNumber = await generateRoomNumber();
  const updated = await prisma.room.update({
    where: { id: room.id },
    data: { status: 'ACTIVE', approvedById: req.user!.userId, roomNumber },
  });

  await logAction({
    entityType: 'Room', entityId: room.id, action: 'APPROVE',
    performedById: req.user!.userId,
    oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'ACTIVE', roomNumber },
    ipAddress: req.ip,
  });

  // Notify room creator
  const creator = await prisma.user.findUnique({ where: { id: room.createdById } });
  if (creator) {
    await notify({ channel: 'email', to: creator.email, subject: 'Room Approved', body: `Dear ${creator.name},\nYour room (${updated.projectName}, ${updated.city}) has been APPROVED.\nRoom Number: ${roomNumber}` });
  }

  res.json({ success: true, data: updated });
}

// POST /api/rooms/:id/reject
export async function rejectRoom(req: AuthRequest, res: Response): Promise<void> {
  const { remark } = req.body as { remark?: string };
  if (!remark) {
    res.status(400).json({ success: false, message: 'Remark (reason) is required to reject a room' });
    return;
  }

  const room = await prisma.room.findUnique({ where: { id: req.params['id'] } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  if (room.status !== 'PENDING_APPROVAL') {
    res.status(400).json({ success: false, message: 'Room is not in PENDING_APPROVAL status' });
    return;
  }

  await prisma.room.update({
    where: { id: room.id },
    data: { remark },
  });

  await logAction({
    entityType: 'Room', entityId: room.id, action: 'REJECT',
    performedById: req.user!.userId,
    oldValue: { remark: room.remark }, newValue: { remark },
    ipAddress: req.ip,
  });

  const creator = await prisma.user.findUnique({ where: { id: room.createdById } });
  if (creator) {
    await notify({ channel: 'email', to: creator.email, subject: 'Room Rejected', body: `Dear ${creator.name},\nYour room submission for ${room.projectName}, ${room.city} has been REJECTED.\nReason: ${remark}` });
  }

  res.json({ success: true, message: 'Room rejected' });
}

// PUT /api/rooms/:id
export async function editRoom(req: AuthRequest, res: Response): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: req.params['id'] } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  const parse = createRoomSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
    return;
  }

  const { ownerId, brokerId, owner, broker, ...restData } = parse.data;
  
  // Check critical fields
  let status = room.status;
  let reNotifyHOD = false;
  if (
    (restData.monthlyRent && new Prisma.Decimal(restData.monthlyRent).cmp(room.monthlyRent) !== 0) ||
    (restData.deposit !== undefined && new Prisma.Decimal(restData.deposit).cmp(room.deposit) !== 0) ||
    (restData.startDate && new Date(restData.startDate).getTime() !== room.startDate.getTime())
  ) {
    status = 'PENDING_APPROVAL';
    reNotifyHOD = true;
  }

  // Build update data
  const updateData: Prisma.RoomUpdateInput = {
    ...restData,
    status,
    startDate: restData.startDate ? new Date(restData.startDate) : undefined,
    agreementStartDate: restData.agreementStartDate ? new Date(restData.agreementStartDate) : undefined,
    agreementEndDate: restData.agreementEndDate ? new Date(restData.agreementEndDate) : undefined,
    monthlyRent: restData.monthlyRent !== undefined ? new Prisma.Decimal(restData.monthlyRent) : undefined,
    deposit: restData.deposit !== undefined ? new Prisma.Decimal(restData.deposit) : undefined,
  };

  // Remove undefined fields
  Object.keys(updateData).forEach(key => updateData[key as keyof Prisma.RoomUpdateInput] === undefined && delete updateData[key as keyof Prisma.RoomUpdateInput]);

  const updated = await prisma.room.update({
    where: { id: room.id },
    data: updateData,
  });

  await logAction({
    entityType: 'Room', entityId: room.id, action: 'UPDATE',
    performedById: req.user!.userId,
    oldValue: { status: room.status }, newValue: { status },
    ipAddress: req.ip,
  });

  if (reNotifyHOD) {
    const hods = await prisma.user.findMany({ where: { role: 'HOD', status: 'ACTIVE' } });
    for (const hod of hods) {
      await notify({
        channel: 'email',
        to: hod.email,
        subject: 'Room Re-submitted for Approval',
        body: `Dear ${hod.name},\nA room (${updated.projectName}, ${updated.city}) had its critical fields updated and requires re-approval.\nPlease log in to review.`,
      });
    }
  }

  res.json({ success: true, data: updated });
}
