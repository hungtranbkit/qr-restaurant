import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/rbac/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/guard";
import { transitionOrderStatus } from "@/lib/services/order";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({
  status: z.enum(["SUBMITTED", "PREPARING", "READY", "SERVED", "CANCELLED"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    // Kitchen advances NEW->PREPARING->READY; waiter/manager/admin confirm SERVED or cancel.
    if (!hasAnyPermission(user.role, ["kitchen.manage", "orders.manage", "orders.create"])) {
      throw new ForbiddenError();
    }

    const { id } = await params;
    const { status } = schema.parse(await req.json());
    const order = await transitionOrderStatus(id, status, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ id: order.id, status: order.status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
