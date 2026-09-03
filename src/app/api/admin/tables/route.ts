import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { tableCreateSchema } from "@/lib/validation/misc";
import { createTable, listTablesForAdmin } from "@/lib/services/table-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireApiPermission("tables.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    return NextResponse.json({ tables: await listTablesForAdmin(user.branchId) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("tables.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const input = tableCreateSchema.parse(await req.json());
    const table = await createTable({
      branchId: user.branchId,
      areaId: input.areaId,
      code: input.code,
      name: input.name,
      seats: input.seats,
      actor: { type: "user", id: user.id, label: user.name },
    });
    return NextResponse.json(table, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
