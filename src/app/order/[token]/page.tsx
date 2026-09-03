import { AlertTriangle } from "lucide-react";
import {
  resolveTableByToken,
  getBranchMenu,
  getOpenOrPendingSessionForTable,
  toClientMenu,
  toClientSession,
} from "@/lib/services/customer-access";
import { OrderPageClient } from "./order-page-client";

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let table;
  try {
    table = await resolveTableByToken(token);
  } catch {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="size-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Không tìm thấy bàn</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Mã QR không hợp lệ hoặc bàn hiện không khả dụng. Vui lòng gọi nhân viên để được hỗ trợ.
        </p>
      </div>
    );
  }

  const [rawCategories, rawSession] = await Promise.all([
    getBranchMenu(table.branchId),
    getOpenOrPendingSessionForTable(table.id),
  ]);

  return (
    <OrderPageClient
      token={token}
      table={{ id: table.id, code: table.code, name: table.name, seats: table.seats, status: table.status }}
      restaurantName={table.branch.restaurant.name}
      categories={toClientMenu(rawCategories)}
      initialSession={toClientSession(rawSession)}
    />
  );
}
