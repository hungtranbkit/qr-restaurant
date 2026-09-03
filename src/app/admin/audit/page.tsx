import { requirePagePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatClock } from "@/lib/format";
import { AUDIT_ACTION_LABEL } from "@/lib/status-labels";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string }>;
}) {
  await requirePagePermission("audit.view");
  const { entityType } = await searchParams;

  const [logs, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { actor: { select: { name: true, role: true } } },
    }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Nhật ký hệ thống</h1>
        <p className="text-sm text-muted-foreground">{logs.length} bản ghi gần đây</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
        <Link href="/admin/audit" className={`rounded-md px-3 py-1.5 font-medium ${!entityType ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
          Tất cả
        </Link>
        {entityTypes.map((e) => (
          <Link
            key={e.entityType}
            href={`/admin/audit?entityType=${e.entityType}`}
            className={`rounded-md px-3 py-1.5 font-medium ${entityType === e.entityType ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {e.entityType}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Người thực hiện</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>Lý do</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatClock(log.createdAt)}</TableCell>
                <TableCell className="text-sm">
                  {log.actor?.name ?? log.actorLabel}
                  {log.actor?.role && <Badge variant="outline" className="ml-1.5 text-[10px]">{log.actor.role}</Badge>}
                </TableCell>
                <TableCell className="text-sm">{AUDIT_ACTION_LABEL[log.action] ?? log.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.entityType}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.reason ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {logs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Chưa có bản ghi nào</p>}
      </div>
    </div>
  );
}
