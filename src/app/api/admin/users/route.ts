import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { userCreateSchema } from "@/lib/validation/misc";
import { createUser } from "@/lib/services/user-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireApiPermission("staff.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const users = await prisma.user.findMany({
      where: { branchId: user.branchId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ users });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("staff.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const input = userCreateSchema.parse(await req.json());
    const created = await createUser(user.branchId, input, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ id: created.id, name: created.name, email: created.email, role: created.role }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
