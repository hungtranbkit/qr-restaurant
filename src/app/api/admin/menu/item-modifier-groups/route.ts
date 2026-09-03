import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { linkModifierGroupToItem, unlinkModifierGroupFromItem } from "@/lib/services/menu-admin";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({ menuItemId: z.string().min(1), groupId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    await requireApiPermission("menu.manage");
    const { menuItemId, groupId } = schema.parse(await req.json());
    await linkModifierGroupToItem(menuItemId, groupId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireApiPermission("menu.manage");
    const { menuItemId, groupId } = schema.parse(await req.json());
    await unlinkModifierGroupFromItem(menuItemId, groupId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
