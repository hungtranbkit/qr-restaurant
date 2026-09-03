import "server-only";
import { prisma } from "@/lib/db";

export async function listCategoriesForAdmin(branchId: string) {
  const categories = await prisma.menuCategory.findMany({
    where: { branchId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    active: c.active,
    itemCount: c._count.items,
  }));
}

export async function listItemsForAdmin(branchId: string) {
  const items = await prisma.menuItem.findMany({
    where: { category: { branchId } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: true,
      kitchenStation: true,
      variants: { orderBy: { sortOrder: "asc" } },
      modifierGroups: { include: { group: true } },
    },
  });
  return items.map((i) => ({
    id: i.id,
    sku: i.sku,
    name: i.name,
    description: i.description,
    image: i.image,
    categoryId: i.categoryId,
    categoryName: i.category.name,
    basePrice: Number(i.basePrice),
    salePrice: i.salePrice ? Number(i.salePrice) : null,
    active: i.active,
    soldOut: i.soldOut,
    kitchenStationId: i.kitchenStationId,
    kitchenStationName: i.kitchenStation?.name ?? null,
    preparationTime: i.preparationTime,
    variants: i.variants.map((v) => ({
      id: v.id,
      name: v.name,
      priceDelta: Number(v.priceDelta),
      isDefault: v.isDefault,
    })),
    modifierGroupIds: i.modifierGroups.map((g) => g.groupId),
    modifierGroupNames: i.modifierGroups.map((g) => g.group.name),
  }));
}

export async function listModifierGroupsForAdmin() {
  const groups = await prisma.modifierGroup.findMany({
    orderBy: { name: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    required: g.required,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceDelta: Number(o.priceDelta),
      active: o.active,
    })),
  }));
}

export async function listStationsForAdmin(branchId: string) {
  return prisma.kitchenStation.findMany({ where: { branchId }, orderBy: { code: "asc" } });
}
