import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { listKitchenTickets } from "@/lib/services/kitchen-query";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const user = await requireApiPermission("kitchen.view");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const stationId = new URL(req.url).searchParams.get("stationId") ?? undefined;
    const tickets = await listKitchenTickets(user.branchId, stationId);
    return NextResponse.json({ tickets });
  } catch (err) {
    return toErrorResponse(err);
  }
}
