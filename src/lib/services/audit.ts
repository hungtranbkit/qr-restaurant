import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditActor =
  | { type: "user"; id: string; label: string }
  | { type: "customer"; label: string };

export async function writeAuditLog(params: {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorUserId: params.actor.type === "user" ? params.actor.id : null,
      actorLabel: params.actor.label,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: toJson(params.before),
      after: toJson(params.after),
      reason: params.reason,
    },
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
