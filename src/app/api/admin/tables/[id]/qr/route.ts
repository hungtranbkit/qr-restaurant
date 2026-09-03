import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireApiPermission } from "@/lib/auth/guard";
import { regenerateQrToken } from "@/lib/services/table-admin";
import { buildOrderUrl } from "@/lib/qr";
import { prisma } from "@/lib/db";
import { toErrorResponse, NotFoundError } from "@/lib/api-error";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("tables.manage");
    const { id } = await params;
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundError("Không tìm thấy bàn");
    const orderUrl = buildOrderUrl(table.qrToken);
    const dataUrl = await QRCode.toDataURL(orderUrl, { width: 480, margin: 1 });
    return NextResponse.json({ orderUrl, dataUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("tables.manage");
    const { id } = await params;
    const table = await regenerateQrToken(id, { type: "user", id: user.id, label: user.name });
    const orderUrl = buildOrderUrl(table.qrToken);
    const dataUrl = await QRCode.toDataURL(orderUrl, { width: 480, margin: 1 });
    return NextResponse.json({ orderUrl, dataUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
