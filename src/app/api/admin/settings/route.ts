import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { toErrorResponse, AppError } from "@/lib/api-error";

const schema = z.object({
  taxRatePercent: z.number().min(0).max(30),
  autoAvailableAfterPayment: z.boolean(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireApiPermission("settings.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const input = schema.parse(await req.json());

    const branch = await prisma.branch.update({
      where: { id: user.branchId },
      data: input,
    });

    await writeAuditLog({
      actor: { type: "user", id: user.id, label: user.name },
      action: "UPDATE_SETTINGS",
      entityType: "Branch",
      entityId: branch.id,
      after: input,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
