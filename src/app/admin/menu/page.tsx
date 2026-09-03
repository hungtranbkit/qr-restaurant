import { requirePagePermission } from "@/lib/auth/guard";
import {
  listCategoriesForAdmin,
  listItemsForAdmin,
  listModifierGroupsForAdmin,
  listStationsForAdmin,
} from "@/lib/services/menu-admin-query";
import { MenuAdminClient } from "./menu-admin-client";

export default async function AdminMenuPage() {
  const user = await requirePagePermission("menu.manage");
  if (!user.branchId) return null;

  const [categories, items, modifierGroups, stations] = await Promise.all([
    listCategoriesForAdmin(user.branchId),
    listItemsForAdmin(user.branchId),
    listModifierGroupsForAdmin(),
    listStationsForAdmin(user.branchId),
  ]);

  return (
    <MenuAdminClient
      initialCategories={categories}
      initialItems={items}
      initialModifierGroups={modifierGroups}
      initialStations={stations}
      canEditPrice={true}
    />
  );
}
