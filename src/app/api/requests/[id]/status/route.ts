import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { updateCustomerRequestStatus } from "@/lib/services/request";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({ status: z.enum(["ACCEPTED", "COMPLETED", "CANCELLED"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("request.manage");
    const { id } = await params;
    const { status } = schema.parse(await req.json());
    const request = await updateCustomerRequestStatus(id, status, {
      type: "user",
      id: user.id,
      label: user.name,
    });
    return NextResponse.json({ id: request.id, status: request.status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
