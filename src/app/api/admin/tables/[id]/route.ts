import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { tableUpdateSchema } from "@/lib/validation/misc";
import { updateTable } from "@/lib/services/table-admin";
import { toErrorResponse } from "@/lib/api-error";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("tables.manage");
    const { id } = await params;
    const input = tableUpdateSchema.parse(await req.json());
    const table = await updateTable(id, input, { type: "user", id: user.id, label: user.name });
    return NextResponse.json(table);
  } catch (err) {
    return toErrorResponse(err);
  }
}
