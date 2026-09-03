import "server-only";
import { prisma } from "@/lib/db";
import { publishEvent } from "@/lib/realtime/bus";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";

export async function createMenuCategory(
  branchId: string,
  data: { name: string; description?: string; image?: string; sortOrder: number },
) {
  return prisma.menuCategory.create({ data: { branchId, ...data } });
}

export async function updateMenuCategory(
  id: string,
  data: Partial<{ name: string; description: string; image: string; sortOrder: number; active: boolean }>,
) {
  return prisma.menuCategory.update({ where: { id }, data });
}

export async function createMenuItem(
  branchId: string,
  data: {
    categoryId: string;
    sku: string;
    name: string;
    description?: string;
    image?: string;
    basePrice: number;
    salePrice?: number | null;
    kitchenStationId?: string | null;
    preparationTime?: number | null;
  },
  actor: AuditActor,
) {
  const item = await prisma.menuItem.create({ data });
  await writeAuditLog({
    actor,
    action: "CREATE_MENU_ITEM",
    entityType: "MenuItem",
    entityId: item.id,
    after: { name: item.name, basePrice: item.basePrice.toString() },
  });
  publishEvent({ type: "MENU_ITEM_UPDATED", branchId, payload: { menuItemId: item.id } });
  return item;
}

export async function updateMenuItem(
  branchId: string,
  id: string,
  data: Partial<{
    categoryId: string;
    sku: string;
    name: string;
    description: string;
    image: string;
    basePrice: number;
    salePrice: number | null;
    kitchenStationId: string | null;
    preparationTime: number | null;
    active: boolean;
    soldOut: boolean;
  }>,
  actor: AuditActor,
) {
  const before = await prisma.menuItem.findUniqueOrThrow({ where: { id } });
  const item = await prisma.menuItem.update({ where: { id }, data });

  if (data.basePrice !== undefined && Number(before.basePrice) !== data.basePrice) {
    await writeAuditLog({
      actor,
      action: "MENU_PRICE_CHANGE",
      entityType: "MenuItem",
      entityId: id,
      before: { basePrice: before.basePrice.toString() },
      after: { basePrice: item.basePrice.toString() },
    });
  }
  if (data.soldOut !== undefined && before.soldOut !== data.soldOut) {
    await writeAuditLog({
      actor,
      action: "SOLD_OUT_CHANGE",
      entityType: "MenuItem",
      entityId: id,
      before: { soldOut: before.soldOut },
      after: { soldOut: item.soldOut },
    });
  }

  publishEvent({ type: "MENU_ITEM_UPDATED", branchId, payload: { menuItemId: id, soldOut: item.soldOut, active: item.active } });
  return item;
}

export async function createVariant(
  menuItemId: string,
  data: { name: string; priceDelta: number; isDefault?: boolean; sortOrder?: number },
) {
  if (data.isDefault) {
    await prisma.menuVariant.updateMany({ where: { menuItemId }, data: { isDefault: false } });
  }
  return prisma.menuVariant.create({ data: { menuItemId, ...data } });
}

export async function deleteVariant(id: string) {
  return prisma.menuVariant.delete({ where: { id } });
}

export async function createModifierGroup(data: {
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
}) {
  return prisma.modifierGroup.create({ data });
}

export async function createModifierOption(
  groupId: string,
  data: { name: string; priceDelta: number; sortOrder?: number },
) {
  return prisma.modifierOption.create({ data: { groupId, ...data } });
}

export async function linkModifierGroupToItem(menuItemId: string, groupId: string, sortOrder = 0) {
  return prisma.menuItemModifierGroup.create({ data: { menuItemId, groupId, sortOrder } });
}

export async function unlinkModifierGroupFromItem(menuItemId: string, groupId: string) {
  return prisma.menuItemModifierGroup.delete({ where: { menuItemId_groupId: { menuItemId, groupId } } });
}

export async function createKitchenStation(branchId: string, code: string, name: string) {
  return prisma.kitchenStation.create({ data: { branchId, code, name } });
}
