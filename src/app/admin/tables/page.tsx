import { requirePagePermission } from "@/lib/auth/guard";
import { listTablesForAdmin } from "@/lib/services/table-admin";
import { listAreas } from "@/lib/services/staff-query";
import { AdminTablesClient } from "./admin-tables-client";

export default async function AdminTablesPage() {
  const user = await requirePagePermission("tables.manage");
  if (!user.branchId) return null;

  const [tables, areas] = await Promise.all([
    listTablesForAdmin(user.branchId),
    listAreas(user.branchId),
  ]);

  return <AdminTablesClient initialTables={tables} areas={areas} />;
}
