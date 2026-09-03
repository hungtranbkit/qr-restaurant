import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { createModifierGroup } from "@/lib/services/menu-admin";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).max(20).default(0),
  maxSelect: z.number().int().min(1).max(20).default(1),
});

export async function POST(req: Request) {
  try {
    await requireApiPermission("menu.manage");
    const input = schema.parse(await req.json());
    const group = await createModifierGroup(input);
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
