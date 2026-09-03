import { requirePagePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { UsersAdminClient } from "./users-admin-client";

export default async function AdminUsersPage() {
  const user = await requirePagePermission("staff.manage");
  if (!user.branchId) return null;

  const users = await prisma.user.findMany({
    where: { branchId: user.branchId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return (
    <UsersAdminClient
      initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      currentUserId={user.id}
    />
  );
}
