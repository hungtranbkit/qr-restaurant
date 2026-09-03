import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { listTableBoard } from "@/lib/services/staff-query";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireApiPermission("tables.view");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const tables = await listTableBoard(user.branchId);
    return NextResponse.json({ tables });
  } catch (err) {
    return toErrorResponse(err);
  }
}
