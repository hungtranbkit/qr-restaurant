import { requirePagePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/db";
import { formatVnd, formatClock } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/status-labels";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentVoidButton } from "./payment-void-button";

export default async function AdminPaymentsPage() {
  const user = await requirePagePermission("payments.view");
  if (!user.branchId) return null;

  const payments = await prisma.payment.findMany({
    where: { tableSession: { table: { branchId: user.branchId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tableSession: { include: { table: { select: { code: true } } } },
      cashier: { select: { name: true } },
    },
  });

  const canVoid = hasPermission(user.role, "payment.void");

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Lịch sử thanh toán</h1>
        <p className="text-sm text-muted-foreground">{payments.length} giao dịch gần đây</p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bàn</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Phương thức</TableHead>
              <TableHead>Thu ngân</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              {canVoid && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.tableSession.table.code}</TableCell>
                <TableCell>{formatVnd(p.amount.toString())}</TableCell>
                <TableCell>{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.cashier?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "VOIDED" ? "outline" : "secondary"}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.paidAt ? formatClock(p.paidAt) : "—"}
                </TableCell>
                {canVoid && (
                  <TableCell>{p.status === "COMPLETED" && <PaymentVoidButton paymentId={p.id} />}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {payments.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Chưa có giao dịch nào</p>}
      </div>
    </div>
  );
}
