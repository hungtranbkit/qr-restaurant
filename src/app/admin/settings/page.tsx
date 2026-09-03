import { requirePagePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const user = await requirePagePermission("settings.manage");
  if (!user.branchId) return null;

  const branch = await prisma.branch.findUniqueOrThrow({ where: { id: user.branchId } });

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">{branch.name}</p>
      </div>
      <SettingsForm
        taxRatePercent={Number(branch.taxRatePercent)}
        autoAvailableAfterPayment={branch.autoAvailableAfterPayment}
      />
    </div>
  );
}
