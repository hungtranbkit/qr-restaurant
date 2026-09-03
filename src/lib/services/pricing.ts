import "server-only";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api-error";
import type { CartLineInput } from "@/lib/validation/order";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export interface ResolvedOrderLine {
  menuItemId: string;
  itemNameSnapshot: string;
  variantNameSnapshot: string | null;
  unitPriceSnapshot: Prisma.Decimal;
  quantity: number;
  note?: string;
  kitchenStationId: string | null;
  modifiers: { nameSnapshot: string; priceDeltaSnapshot: Prisma.Decimal }[];
  lineTotal: Prisma.Decimal;
}

/**
 * Resolves one cart line against the live menu, entirely server-side.
 * The client never supplies a price — only ids and quantity — so this is
 * the single place order pricing is computed.
 */
export async function resolveCartLine(
  tx: Prisma.TransactionClient,
  line: CartLineInput,
  branchId: string,
): Promise<ResolvedOrderLine> {
  const menuItem = await tx.menuItem.findUnique({
    where: { id: line.menuItemId },
    include: {
      category: true,
      variants: true,
      modifierGroups: { include: { group: { include: { options: true } } } },
    },
  });

  if (!menuItem || menuItem.category.branchId !== branchId) {
    throw new AppError(`Món không tồn tại`, 404);
  }
  if (!menuItem.active) throw new AppError(`Món "${menuItem.name}" hiện không khả dụng`, 409);
  if (menuItem.soldOut) throw new AppError(`Món "${menuItem.name}" đã hết hàng`, 409);

  let unitPrice = D(menuItem.salePrice ?? menuItem.basePrice);
  let variantNameSnapshot: string | null = null;

  if (line.variantId) {
    const variant = menuItem.variants.find((v) => v.id === line.variantId);
    if (!variant || !variant.active) {
      throw new AppError(`Phiên bản món không hợp lệ`, 422);
    }
    unitPrice = unitPrice.add(D(variant.priceDelta));
    variantNameSnapshot = variant.name;
  } else {
    const requiredVariant = menuItem.variants.some((v) => v.active);
    if (requiredVariant && menuItem.variants.length > 0 && !menuItem.variants.some((v) => v.isDefault)) {
      // Item has variants but none marked default and none chosen — reject to avoid ambiguous pricing.
      throw new AppError(`Vui lòng chọn phiên bản cho "${menuItem.name}"`, 422);
    }
    const defaultVariant = menuItem.variants.find((v) => v.isDefault && v.active);
    if (defaultVariant) {
      unitPrice = unitPrice.add(D(defaultVariant.priceDelta));
      variantNameSnapshot = defaultVariant.name;
    }
  }

  // Validate modifier selections against each group's required/min/max rules.
  const selectedIds = new Set(line.modifierOptionIds);
  const modifiers: { nameSnapshot: string; priceDeltaSnapshot: Prisma.Decimal }[] = [];
  const allowedGroupIds = new Set(menuItem.modifierGroups.map((g) => g.groupId));

  for (const link of menuItem.modifierGroups) {
    const group = link.group;
    const groupOptionIds = new Set(group.options.map((o) => o.id));
    const chosen = group.options.filter((o) => selectedIds.has(o.id) && groupOptionIds.has(o.id));

    if (group.required && chosen.length < Math.max(1, group.minSelect)) {
      throw new AppError(`Vui lòng chọn "${group.name}" cho "${menuItem.name}"`, 422);
    }
    if (chosen.length < group.minSelect) {
      throw new AppError(`"${group.name}" cần chọn tối thiểu ${group.minSelect}`, 422);
    }
    if (chosen.length > group.maxSelect) {
      throw new AppError(`"${group.name}" chỉ được chọn tối đa ${group.maxSelect}`, 422);
    }
    for (const opt of chosen) {
      if (!opt.active) throw new AppError(`Tuỳ chọn không khả dụng`, 422);
      modifiers.push({ nameSnapshot: opt.name, priceDeltaSnapshot: D(opt.priceDelta) });
    }
  }

  // Reject any modifier option id that doesn't belong to an allowed group for this item.
  for (const id of selectedIds) {
    const belongs = menuItem.modifierGroups.some((link) =>
      link.group.options.some((o) => o.id === id),
    );
    if (!belongs || !allowedGroupIds.has(
      menuItem.modifierGroups.find((l) => l.group.options.some((o) => o.id === id))?.groupId ?? "",
    )) {
      throw new AppError(`Tuỳ chọn không hợp lệ cho món này`, 422);
    }
  }

  const modifiersTotal = modifiers.reduce((sum, m) => sum.add(m.priceDeltaSnapshot), D(0));
  const lineTotal = unitPrice.add(modifiersTotal).mul(line.quantity);

  return {
    menuItemId: menuItem.id,
    itemNameSnapshot: menuItem.name,
    variantNameSnapshot,
    unitPriceSnapshot: unitPrice,
    quantity: line.quantity,
    note: line.note,
    kitchenStationId: menuItem.kitchenStationId,
    modifiers,
    lineTotal,
  };
}

/**
 * Recomputes and persists subtotal/discount/tax/total for a TableSession
 * from its live orders — never trusts a client-sent total.
 */
export async function recalcTableSessionTotals(
  tx: Prisma.TransactionClient,
  tableSessionId: string,
) {
  const session = await tx.tableSession.findUniqueOrThrow({
    where: { id: tableSessionId },
    include: { table: { include: { branch: true } } },
  });

  const orders = await tx.order.findMany({
    where: { tableSessionId, status: { not: "CANCELLED" } },
    include: { items: { where: { status: { not: "CANCELLED" } }, include: { modifiers: true } } },
  });

  let subtotal = D(0);
  for (const order of orders) {
    for (const item of order.items) {
      const modifiersTotal = item.modifiers.reduce((s, m) => s.add(D(m.priceDeltaSnapshot)), D(0));
      subtotal = subtotal.add(D(item.unitPriceSnapshot).add(modifiersTotal).mul(item.quantity));
    }
  }

  let discountAmount = D(0);
  if (session.discountType && session.discountValue) {
    const value = D(session.discountValue);
    discountAmount =
      session.discountType === "PERCENTAGE"
        ? subtotal.mul(value).div(100)
        : value;
    if (discountAmount.gt(subtotal)) discountAmount = subtotal;
  }

  const taxable = subtotal.sub(discountAmount);
  const taxAmount = taxable.mul(D(session.table.branch.taxRatePercent)).div(100);
  const total = taxable.add(taxAmount);

  return tx.tableSession.update({
    where: { id: tableSessionId },
    data: { subtotal, discountAmount, taxAmount, total },
  });
}
