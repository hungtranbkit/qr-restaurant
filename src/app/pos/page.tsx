import { requirePagePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { listCheckoutQueue } from "@/lib/services/pos-query";
import { PosClient } from "./pos-client";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await requirePagePermission("payments.view");
  if (!user.branchId) return null;

  const { session } = await searchParams;
  const queue = await listCheckoutQueue(user.branchId);

  return (
    <PosClient
      initialQueue={queue}
      initialSelectedId={session ?? queue[0]?.id ?? null}
      canProcessPayment={hasPermission(user.role, "payment.process")}
      canVoidPayment={hasPermission(user.role, "payment.void")}
      canApplyDiscount={hasPermission(user.role, "discount.apply")}
    />
  );
}
