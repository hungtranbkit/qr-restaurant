import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { createVariant } from "@/lib/services/menu-admin";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  priceDelta: z.number(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export async function POST(req: Request) {
  try {
    await requireApiPermission("menu.manage");
    const input = schema.parse(await req.json());
    const variant = await createVariant(input.menuItemId, input);
    return NextResponse.json(variant, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
