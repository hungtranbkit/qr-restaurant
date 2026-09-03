import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { createModifierOption } from "@/lib/services/menu-admin";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  priceDelta: z.number().default(0),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export async function POST(req: Request) {
  try {
    await requireApiPermission("menu.manage");
    const input = schema.parse(await req.json());
    const option = await createModifierOption(input.groupId, input);
    return NextResponse.json(option, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
