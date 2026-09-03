import { requirePagePermission } from "@/lib/auth/guard";
import { listTableBoard, listAreas } from "@/lib/services/staff-query";
import { TableBoardClient } from "./table-board-client";

export default async function StaffTablesPage() {
  const user = await requirePagePermission("tables.view");
  if (!user.branchId) return null;

  const [tables, areas] = await Promise.all([listTableBoard(user.branchId), listAreas(user.branchId)]);

  return <TableBoardClient initialTables={tables} areas={areas} canOpenTable={true} />;
}
