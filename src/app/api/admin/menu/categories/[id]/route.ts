import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { updateMenuCategory } from "@/lib/services/menu-admin";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("menu.manage");
    const { id } = await params;
    const input = schema.parse(await req.json());
    const category = await updateMenuCategory(id, input);
    return NextResponse.json(category);
  } catch (err) {
    return toErrorResponse(err);
  }
}
