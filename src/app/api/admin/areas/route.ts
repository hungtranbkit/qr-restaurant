import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { areaCreateSchema } from "@/lib/validation/misc";
import { createArea } from "@/lib/services/table-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("tables.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const input = areaCreateSchema.parse(await req.json());
    const area = await createArea(user.branchId, input.name, input.sortOrder);
    return NextResponse.json(area, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
