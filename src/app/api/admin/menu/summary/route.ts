import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import {
  listCategoriesForAdmin,
  listItemsForAdmin,
  listModifierGroupsForAdmin,
  listStationsForAdmin,
} from "@/lib/services/menu-admin-query";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const user = await requireApiPermission("menu.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const type = new URL(req.url).searchParams.get("type");

    switch (type) {
      case "categories":
        return NextResponse.json({ data: await listCategoriesForAdmin(user.branchId) });
      case "items":
        return NextResponse.json({ data: await listItemsForAdmin(user.branchId) });
      case "modifierGroups":
        return NextResponse.json({ data: await listModifierGroupsForAdmin() });
      case "stations":
        return NextResponse.json({ data: await listStationsForAdmin(user.branchId) });
      default:
        throw new AppError("type không hợp lệ", 400);
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
