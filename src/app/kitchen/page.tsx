import { requirePagePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { listKitchenStations } from "@/lib/services/kitchen-query";
import { KitchenBoardClient } from "./kitchen-board-client";

export default async function KitchenPage() {
  const user = await requirePagePermission("kitchen.view");
  if (!user.branchId) return null;

  const stations = await listKitchenStations(user.branchId);

  return (
    <KitchenBoardClient
      stations={stations}
      userName={user.name}
      userRole={user.role}
      canAdvance={hasPermission(user.role, "kitchen.manage")}
    />
  );
}
