import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { listCheckoutQueue } from "@/lib/services/pos-query";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireApiPermission("payments.view");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const queue = await listCheckoutQueue(user.branchId);
    return NextResponse.json({ queue });
  } catch (err) {
    return toErrorResponse(err);
  }
}
