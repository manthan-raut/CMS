import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface LogActionParams {
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
}

export async function logAction(params: LogActionParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      performedById: params.performedById,
      oldValue: (params.oldValue ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      newValue: (params.newValue ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}
