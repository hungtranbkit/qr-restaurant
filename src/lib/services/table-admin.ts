import "server-only";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-error";
import { generateQrToken, buildOrderUrl } from "@/lib/qr";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";

export async function listTablesForAdmin(branchId: string) {
  const tables = await prisma.table.findMany({
    where: { branchId },
    orderBy: [{ area: { sortOrder: "asc" } }, { code: "asc" }],
    include: { area: true },
  });
  return tables.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    seats: t.seats,
    status: t.status,
    active: t.active,
    areaId: t.areaId,
    areaName: t.area.name,
    orderUrl: buildOrderUrl(t.qrToken),
  }));
}

export async function createArea(branchId: string, name: string, sortOrder: number) {
  return prisma.area.create({ data: { branchId, name, sortOrder } });
}

export async function updateArea(id: string, data: { name?: string; sortOrder?: number; active?: boolean }) {
  return prisma.area.update({ where: { id }, data });
}

export async function createTable(params: {
  branchId: string;
  areaId: string;
  code: string;
  name: string;
  seats: number;
  actor: AuditActor;
}) {
  const existing = await prisma.table.findFirst({
    where: { branchId: params.branchId, code: params.code },
  });
  if (existing) throw new AppError(`Mã bàn "${params.code}" đã tồn tại`, 409);

  const table = await prisma.table.create({
    data: {
      branchId: params.branchId,
      areaId: params.areaId,
      code: params.code,
      name: params.name,
      seats: params.seats,
      qrToken: generateQrToken(),
      status: "AVAILABLE",
    },
  });
  await writeAuditLog({
    actor: params.actor,
    action: "CREATE_TABLE",
    entityType: "Table",
    entityId: table.id,
    after: { code: table.code, name: table.name },
  });
  return table;
}

export async function updateTable(
  id: string,
  data: { areaId?: string; name?: string; seats?: number; active?: boolean },
  actor: AuditActor,
) {
  const before = await prisma.table.findUniqueOrThrow({ where: { id } });
  const table = await prisma.table.update({
    where: { id },
    data: {
      ...data,
      status: data.active === false ? "DISABLED" : data.active === true && before.status === "DISABLED" ? "AVAILABLE" : undefined,
    },
  });
  await writeAuditLog({
    actor,
    action: "UPDATE_TABLE",
    entityType: "Table",
    entityId: id,
    before,
    after: table,
  });
  return table;
}

export async function regenerateQrToken(id: string, actor: AuditActor) {
  const before = await prisma.table.findUniqueOrThrow({ where: { id } });
  const table = await prisma.table.update({
    where: { id },
    data: { qrToken: generateQrToken() },
  });
  await writeAuditLog({
    actor,
    action: "QR_REGENERATE",
    entityType: "Table",
    entityId: id,
    before: { qrToken: `${before.qrToken.slice(0, 6)}…` },
    after: { qrToken: `${table.qrToken.slice(0, 6)}…` },
  });
  return table;
}
