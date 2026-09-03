import "server-only";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { AppError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";

const DEFAULT_DEV_PASSWORD = "demo123";

export async function createUser(
  branchId: string,
  data: { name: string; email: string; role: Role; password?: string },
  actor: AuditActor,
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("Email đã được sử dụng", 409);

  const passwordHash = await hashPassword(data.password ?? DEFAULT_DEV_PASSWORD);
  const user = await prisma.user.create({
    data: { branchId, name: data.name, email: data.email, role: data.role, passwordHash },
  });

  await writeAuditLog({
    actor,
    action: "CREATE_USER",
    entityType: "User",
    entityId: user.id,
    after: { name: user.name, email: user.email, role: user.role },
  });

  return user;
}

export async function updateUser(
  id: string,
  data: Partial<{ name: string; role: Role; active: boolean }>,
  actor: AuditActor,
) {
  const before = await prisma.user.findUniqueOrThrow({ where: { id } });
  const user = await prisma.user.update({ where: { id }, data });

  if (data.role && data.role !== before.role) {
    await writeAuditLog({
      actor,
      action: "USER_ROLE_CHANGE",
      entityType: "User",
      entityId: id,
      before: { role: before.role },
      after: { role: user.role },
    });
  }
  if (data.active !== undefined && data.active !== before.active) {
    await writeAuditLog({
      actor,
      action: data.active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entityType: "User",
      entityId: id,
    });
  }

  return user;
}

export async function resetUserPassword(id: string, actor: AuditActor, newPassword = DEFAULT_DEV_PASSWORD) {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await writeAuditLog({
    actor,
    action: "RESET_PASSWORD",
    entityType: "User",
    entityId: id,
  });
  return newPassword;
}
