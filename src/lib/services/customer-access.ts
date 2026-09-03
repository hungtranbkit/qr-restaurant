import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError, AppError } from "@/lib/api-error";
import type {
  ClientMenuCategory,
  ClientTableSession,
  ClientOrder,
} from "@/types/customer";

/** Resolves a table from its public QR token. Never accept a raw table id from a client. */
export async function resolveTableByToken(qrToken: string) {
  const table = await prisma.table.findUnique({
    where: { qrToken },
    include: { branch: { include: { restaurant: true } }, area: true },
  });
  if (!table) throw new NotFoundError("Không tìm thấy bàn. Vui lòng quét lại mã QR.");
  if (!table.active || table.status === "DISABLED") {
    throw new AppError("Bàn hiện không khả dụng", 409);
  }
  return table;
}

export async function getSessionWithOrders(tableSessionId: string) {
  return prisma.tableSession.findUnique({
    where: { id: tableSessionId },
    include: {
      orders: {
        orderBy: { createdAt: "asc" },
        include: { items: { include: { modifiers: true } } },
      },
      customerRequests: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function getOpenOrPendingSessionForTable(tableId: string) {
  return prisma.tableSession.findFirst({
    where: { tableId, status: { in: ["OPEN", "PAYMENT_REQUESTED"] } },
    orderBy: { openedAt: "desc" },
    include: {
      orders: {
        orderBy: { createdAt: "asc" },
        include: { items: { include: { modifiers: true } } },
      },
      customerRequests: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function getBranchMenu(branchId: string) {
  return prisma.menuCategory.findMany({
    where: { branchId, active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
          modifierGroups: {
            orderBy: { sortOrder: "asc" },
            include: { group: { include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } },
          },
        },
      },
    },
  });
}

type RawMenu = Awaited<ReturnType<typeof getBranchMenu>>;
type RawSession = NonNullable<Awaited<ReturnType<typeof getOpenOrPendingSessionForTable>>>;

/** Converts Prisma Decimal fields to plain numbers so the payload can cross into a client component. */
export function toClientMenu(categories: RawMenu): ClientMenuCategory[] {
  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      image: item.image,
      basePrice: Number(item.basePrice),
      salePrice: item.salePrice ? Number(item.salePrice) : null,
      soldOut: item.soldOut,
      variants: item.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceDelta: Number(v.priceDelta),
        isDefault: v.isDefault,
      })),
      modifierGroups: item.modifierGroups.map((link) => ({
        id: link.group.id,
        name: link.group.name,
        required: link.group.required,
        minSelect: link.group.minSelect,
        maxSelect: link.group.maxSelect,
        options: link.group.options.map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: Number(o.priceDelta),
        })),
      })),
    })),
  }));
}

export function toClientOrder(order: RawSession["orders"][number]): ClientOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    source: order.source,
    items: order.items.map((item) => ({
      id: item.id,
      itemNameSnapshot: item.itemNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      unitPriceSnapshot: Number(item.unitPriceSnapshot),
      quantity: item.quantity,
      note: item.note,
      status: item.status,
      modifiers: item.modifiers.map((m) => ({
        id: m.id,
        nameSnapshot: m.nameSnapshot,
        priceDeltaSnapshot: Number(m.priceDeltaSnapshot),
      })),
    })),
  };
}

export function toClientSession(session: RawSession | null): ClientTableSession | null {
  if (!session) return null;
  return {
    id: session.id,
    status: session.status,
    guestCount: session.guestCount,
    subtotal: Number(session.subtotal),
    discountAmount: Number(session.discountAmount),
    taxAmount: Number(session.taxAmount),
    total: Number(session.total),
    orders: session.orders.map(toClientOrder),
    customerRequests: session.customerRequests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
