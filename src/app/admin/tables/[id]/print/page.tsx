import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { buildOrderUrl } from "@/lib/qr";
import { PrintButton } from "./print-button";

export default async function TableQrPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("tables.manage");
  const { id } = await params;

  const table = await prisma.table.findUnique({
    where: { id },
    include: { branch: { include: { restaurant: true } } },
  });
  if (!table) notFound();

  const orderUrl = buildOrderUrl(table.qrToken);
  const dataUrl = await QRCode.toDataURL(orderUrl, { width: 600, margin: 1 });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-6 print:bg-white print:p-0">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-sm print:w-full print:max-w-none print:border-0 print:shadow-none">
        <p className="text-lg font-semibold">{table.branch.restaurant.name}</p>
        <p className="text-3xl font-bold tracking-wide">BÀN {table.code}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR bàn ${table.code}`} className="size-64" />
        <p className="text-sm text-muted-foreground">Quét QR để gọi món</p>
      </div>
      <PrintButton />
    </div>
  );
}
