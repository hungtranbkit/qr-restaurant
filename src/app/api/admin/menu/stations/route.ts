import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { createKitchenStation } from "@/lib/services/menu-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

const schema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(30),
  name: z.string().trim().min(1).max(60),
});

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("menu.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const { code, name } = schema.parse(await req.json());
    const station = await createKitchenStation(user.branchId, code, name);
    return NextResponse.json(station, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
