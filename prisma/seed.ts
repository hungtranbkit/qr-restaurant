import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function qrToken() {
  return randomBytes(24).toString("base64url");
}

async function main() {
  console.log("Seeding QR Restaurant Ordering System demo data...");

  // ---------------------------------------------------------------------
  // Restaurant / Branch
  // ---------------------------------------------------------------------
  const restaurant = await prisma.restaurant.create({
    data: { name: "Demo Bistro", address: "12 Nguyễn Huệ, Q.1, TP.HCM", phone: "0909 123 456" },
  });
  const branch = await prisma.branch.create({
    data: {
      restaurantId: restaurant.id,
      name: "Demo Bistro - Chi nhánh trung tâm",
      address: "12 Nguyễn Huệ, Q.1, TP.HCM",
      taxRatePercent: new Prisma.Decimal(8),
      autoAvailableAfterPayment: true,
    },
  });

  // ---------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("demo123", 10);
  const users = await Promise.all(
    [
      { name: "Super Admin", email: "admin@example.local", role: "SUPER_ADMIN" as const },
      { name: "Quản lý Nhà hàng", email: "manager@example.local", role: "MANAGER" as const },
      { name: "Thu Ngân", email: "cashier@example.local", role: "CASHIER" as const },
      { name: "Phục vụ 01", email: "waiter@example.local", role: "WAITER" as const },
      { name: "Phục vụ 02", email: "waiter02@example.local", role: "WAITER" as const },
      { name: "Bếp 01", email: "kitchen@example.local", role: "KITCHEN" as const },
    ].map((u) => prisma.user.create({ data: { ...u, branchId: branch.id, passwordHash } })),
  );
  const [admin, manager, , waiter1] = users;

  // ---------------------------------------------------------------------
  // Areas & Tables
  // ---------------------------------------------------------------------
  const areaFloor1 = await prisma.area.create({ data: { branchId: branch.id, name: "Tầng 1", sortOrder: 1 } });
  const areaFloor2 = await prisma.area.create({ data: { branchId: branch.id, name: "Tầng 2", sortOrder: 2 } });
  const areaVip = await prisma.area.create({ data: { branchId: branch.id, name: "VIP", sortOrder: 3 } });
  const areaOutdoor = await prisma.area.create({ data: { branchId: branch.id, name: "Ngoài trời", sortOrder: 4 } });

  const tableDefs = [
    ...Array.from({ length: 8 }, (_, i) => ({ code: `A0${i + 1}`, areaId: areaFloor1.id, seats: 4 })),
    ...Array.from({ length: 6 }, (_, i) => ({ code: `B0${i + 1}`, areaId: areaFloor2.id, seats: 4 })),
    ...Array.from({ length: 3 }, (_, i) => ({ code: `VIP0${i + 1}`, areaId: areaVip.id, seats: 8 })),
    ...Array.from({ length: 4 }, (_, i) => ({ code: `O0${i + 1}`, areaId: areaOutdoor.id, seats: 2 })),
  ];
  const tables = await Promise.all(
    tableDefs.map((t) =>
      prisma.table.create({
        data: {
          branchId: branch.id,
          areaId: t.areaId,
          code: t.code,
          name: `Bàn ${t.code}`,
          seats: t.seats,
          qrToken: qrToken(),
        },
      }),
    ),
  );
  const tableByCode = new Map(tables.map((t) => [t.code, t]));

  // ---------------------------------------------------------------------
  // Kitchen stations
  // ---------------------------------------------------------------------
  const mainKitchen = await prisma.kitchenStation.create({
    data: { branchId: branch.id, code: "MAIN_KITCHEN", name: "Bếp chính" },
  });
  const bar = await prisma.kitchenStation.create({
    data: { branchId: branch.id, code: "BAR", name: "Quầy Bar" },
  });
  const dessert = await prisma.kitchenStation.create({
    data: { branchId: branch.id, code: "DESSERT", name: "Tráng miệng" },
  });

  // ---------------------------------------------------------------------
  // Menu categories
  // ---------------------------------------------------------------------
  const catStarter = await prisma.menuCategory.create({
    data: { branchId: branch.id, name: "Khai vị", sortOrder: 1 },
  });
  const catMain = await prisma.menuCategory.create({
    data: { branchId: branch.id, name: "Món chính", sortOrder: 2 },
  });
  const catNoodle = await prisma.menuCategory.create({
    data: { branchId: branch.id, name: "Mì", sortOrder: 3 },
  });
  const catDrink = await prisma.menuCategory.create({
    data: { branchId: branch.id, name: "Đồ uống", sortOrder: 4 },
  });
  const catDessert = await prisma.menuCategory.create({
    data: { branchId: branch.id, name: "Tráng miệng", sortOrder: 5 },
  });

  // ---------------------------------------------------------------------
  // Menu items
  // ---------------------------------------------------------------------
  type ItemDef = {
    categoryId: string;
    sku: string;
    name: string;
    description: string;
    basePrice: number;
    stationId: string;
    prepTime?: number;
  };

  const itemDefs: ItemDef[] = [
    { categoryId: catStarter.id, sku: "SV-001", name: "Gỏi cuốn tôm thịt", description: "Bánh tráng cuốn tôm, thịt, bún, rau thơm", basePrice: 45000, stationId: mainKitchen.id, prepTime: 8 },
    { categoryId: catStarter.id, sku: "SV-002", name: "Chả giò hải sản", description: "Chả giò chiên giòn nhân hải sản", basePrice: 55000, stationId: mainKitchen.id, prepTime: 10 },
    { categoryId: catStarter.id, sku: "SV-003", name: "Salad trộn dầu giấm", description: "Rau củ tươi trộn dầu giấm chua ngọt", basePrice: 40000, stationId: mainKitchen.id, prepTime: 6 },
    { categoryId: catStarter.id, sku: "SV-004", name: "Súp cua", description: "Súp cua trứng bắc thảo", basePrice: 45000, stationId: mainKitchen.id, prepTime: 8 },
    { categoryId: catMain.id, sku: "MC-001", name: "Cơm bò", description: "Cơm trắng, bò xào, trứng ốp la, rau ăn kèm", basePrice: 85000, stationId: mainKitchen.id, prepTime: 15 },
    { categoryId: catMain.id, sku: "MC-002", name: "Cơm gà xối mỡ", description: "Đùi gà chiên giòn xối mỡ, cơm trắng", basePrice: 75000, stationId: mainKitchen.id, prepTime: 15 },
    { categoryId: catMain.id, sku: "MC-003", name: "Cơm sườn nướng", description: "Sườn nướng mật ong, cơm trắng, đồ chua", basePrice: 80000, stationId: mainKitchen.id, prepTime: 15 },
    { categoryId: catMain.id, sku: "MC-004", name: "Bò lúc lắc", description: "Bò lúc lắc sốt tiêu đen, khoai tây chiên", basePrice: 120000, stationId: mainKitchen.id, prepTime: 18 },
    { categoryId: catMain.id, sku: "MC-005", name: "Gà chiên mắm", description: "Gà chiên giòn sốt mắm tỏi ớt", basePrice: 95000, stationId: mainKitchen.id, prepTime: 15 },
    { categoryId: catMain.id, sku: "MC-006", name: "Cá kho tộ", description: "Cá basa kho tộ đậm đà, cơm trắng", basePrice: 90000, stationId: mainKitchen.id, prepTime: 16 },
    { categoryId: catNoodle.id, sku: "MI-001", name: "Mì cay Hàn Quốc", description: "Mì cay kiểu Hàn với hải sản và rau củ", basePrice: 69000, stationId: mainKitchen.id, prepTime: 12 },
    { categoryId: catNoodle.id, sku: "MI-002", name: "Mì Ý sốt bò bằm", description: "Mì Ý sốt cà chua bò bằm", basePrice: 89000, stationId: mainKitchen.id, prepTime: 14 },
    { categoryId: catNoodle.id, sku: "MI-003", name: "Phở bò tái", description: "Phở bò tái nước dùng ninh xương", basePrice: 65000, stationId: mainKitchen.id, prepTime: 12 },
    { categoryId: catNoodle.id, sku: "MI-004", name: "Hủ tiếu Nam Vang", description: "Hủ tiếu khô/nước kiểu Nam Vang", basePrice: 60000, stationId: mainKitchen.id, prepTime: 12 },
    { categoryId: catNoodle.id, sku: "MI-005", name: "Mì xào hải sản", description: "Mì xào giòn với tôm mực", basePrice: 85000, stationId: mainKitchen.id, prepTime: 14 },
    { categoryId: catDrink.id, sku: "DR-001", name: "Trà đào cam sả", description: "Trà đào tươi mát, cam, sả", basePrice: 39000, stationId: bar.id, prepTime: 5 },
    { categoryId: catDrink.id, sku: "DR-002", name: "Coca Cola", description: "Nước ngọt có gas 330ml", basePrice: 20000, stationId: bar.id, prepTime: 1 },
    { categoryId: catDrink.id, sku: "DR-003", name: "Pepsi", description: "Nước ngọt có gas 330ml", basePrice: 20000, stationId: bar.id, prepTime: 1 },
    { categoryId: catDrink.id, sku: "DR-004", name: "Nước suối", description: "Nước suối tinh khiết 500ml", basePrice: 15000, stationId: bar.id, prepTime: 1 },
    { categoryId: catDrink.id, sku: "DR-005", name: "Cà phê sữa đá", description: "Cà phê phin truyền thống", basePrice: 29000, stationId: bar.id, prepTime: 5 },
    { categoryId: catDrink.id, sku: "DR-006", name: "Sinh tố bơ", description: "Sinh tố bơ sữa đặc béo ngậy", basePrice: 45000, stationId: bar.id, prepTime: 6 },
    { categoryId: catDessert.id, sku: "DS-001", name: "Kem vani", description: "Kem vani mát lạnh", basePrice: 25000, stationId: dessert.id, prepTime: 3 },
    { categoryId: catDessert.id, sku: "DS-002", name: "Chè khúc bạch", description: "Chè khúc bạch hạnh nhân, nhãn", basePrice: 35000, stationId: dessert.id, prepTime: 5 },
    { categoryId: catDessert.id, sku: "DS-003", name: "Bánh flan", description: "Bánh flan caramel béo mịn", basePrice: 25000, stationId: dessert.id, prepTime: 3 },
  ];

  const items: Record<string, Awaited<ReturnType<typeof prisma.menuItem.create>>> = {};
  for (const def of itemDefs) {
    const item = await prisma.menuItem.create({
      data: {
        categoryId: def.categoryId,
        sku: def.sku,
        name: def.name,
        description: def.description,
        basePrice: new Prisma.Decimal(def.basePrice),
        kitchenStationId: def.stationId,
        preparationTime: def.prepTime,
      },
    });
    items[def.sku] = item;
  }

  // Mark one item sold out for demo purposes.
  await prisma.menuItem.update({ where: { id: items["MC-004"].id }, data: { soldOut: true } });

  // ---------------------------------------------------------------------
  // Variants: Mì cay (size) + Trà đào (size)
  // ---------------------------------------------------------------------
  await prisma.menuVariant.createMany({
    data: [
      { menuItemId: items["MI-001"].id, name: "Small", priceDelta: 0, isDefault: true, sortOrder: 1 },
      { menuItemId: items["MI-001"].id, name: "Medium", priceDelta: 10000, sortOrder: 2 },
      { menuItemId: items["MI-001"].id, name: "Large", priceDelta: 20000, sortOrder: 3 },
      { menuItemId: items["DR-001"].id, name: "Size M", priceDelta: 0, isDefault: true, sortOrder: 1 },
      { menuItemId: items["DR-001"].id, name: "Size L", priceDelta: 10000, sortOrder: 2 },
    ],
  });

  // ---------------------------------------------------------------------
  // Modifier groups + options
  // ---------------------------------------------------------------------
  const spiceLevel = await prisma.modifierGroup.create({
    data: { name: "Mức cay", required: true, minSelect: 1, maxSelect: 1 },
  });
  await prisma.modifierOption.createMany({
    data: [
      { groupId: spiceLevel.id, name: "Cấp độ 1", priceDelta: 0, sortOrder: 1 },
      { groupId: spiceLevel.id, name: "Cấp độ 2", priceDelta: 0, sortOrder: 2 },
      { groupId: spiceLevel.id, name: "Cấp độ 3", priceDelta: 0, sortOrder: 3 },
      { groupId: spiceLevel.id, name: "Cấp độ 4", priceDelta: 0, sortOrder: 4 },
    ],
  });
  await prisma.menuItemModifierGroup.create({ data: { menuItemId: items["MI-001"].id, groupId: spiceLevel.id } });

  const comBoToppings = await prisma.modifierGroup.create({
    data: { name: "Tuỳ chọn", required: false, minSelect: 0, maxSelect: 3 },
  });
  await prisma.modifierOption.createMany({
    data: [
      { groupId: comBoToppings.id, name: "Không hành", priceDelta: 0, sortOrder: 1 },
      { groupId: comBoToppings.id, name: "Thêm trứng", priceDelta: 10000, sortOrder: 2 },
      { groupId: comBoToppings.id, name: "Thêm bò", priceDelta: 25000, sortOrder: 3 },
    ],
  });
  await prisma.menuItemModifierGroup.create({ data: { menuItemId: items["MC-001"].id, groupId: comBoToppings.id } });

  const iceLevel = await prisma.modifierGroup.create({
    data: { name: "Đá", required: false, minSelect: 0, maxSelect: 1 },
  });
  await prisma.modifierOption.createMany({
    data: [
      { groupId: iceLevel.id, name: "Bình thường", priceDelta: 0, sortOrder: 1 },
      { groupId: iceLevel.id, name: "Ít đá", priceDelta: 0, sortOrder: 2 },
      { groupId: iceLevel.id, name: "Không đá", priceDelta: 0, sortOrder: 3 },
    ],
  });
  const sugarLevel = await prisma.modifierGroup.create({
    data: { name: "Đường", required: false, minSelect: 0, maxSelect: 1 },
  });
  await prisma.modifierOption.createMany({
    data: [
      { groupId: sugarLevel.id, name: "Bình thường", priceDelta: 0, sortOrder: 1 },
      { groupId: sugarLevel.id, name: "Ít đường", priceDelta: 0, sortOrder: 2 },
      { groupId: sugarLevel.id, name: "Không đường", priceDelta: 0, sortOrder: 3 },
    ],
  });
  await prisma.menuItemModifierGroup.create({ data: { menuItemId: items["DR-001"].id, groupId: iceLevel.id, sortOrder: 1 } });
  await prisma.menuItemModifierGroup.create({ data: { menuItemId: items["DR-001"].id, groupId: sugarLevel.id, sortOrder: 2 } });

  // ---------------------------------------------------------------------
  // Historical demo activity: closed sessions + orders + payments today
  // so the dashboard has real numbers on first login.
  // ---------------------------------------------------------------------
  const demoMenu = [items["MC-001"], items["MI-001"], items["DR-002"], items["SV-001"], items["DS-003"], items["MI-003"]];
  const demoTableCodes = ["A02", "A03", "B01", "B02", "VIP01", "A05"];

  for (let i = 0; i < demoTableCodes.length; i++) {
    const table = tableByCode.get(demoTableCodes[i])!;
    const hoursAgo = 1 + i * 1.5;
    const openedAt = new Date(Date.now() - hoursAgo * 3600 * 1000);

    const session = await prisma.tableSession.create({
      data: {
        tableId: table.id,
        guestCount: 2 + (i % 3),
        openedAt,
        status: "CLOSED",
        closedAt: new Date(openedAt.getTime() + 40 * 60 * 1000),
        openedById: waiter1.id,
      },
    });

    const pick = [demoMenu[i % demoMenu.length], demoMenu[(i + 2) % demoMenu.length]];
    let subtotal = new Prisma.Decimal(0);
    const order = await prisma.order.create({
      data: {
        tableSessionId: session.id,
        source: i % 2 === 0 ? "STAFF" : "CUSTOMER",
        createdByUserId: i % 2 === 0 ? waiter1.id : undefined,
        status: "SERVED",
        submittedAt: openedAt,
        preparingAt: new Date(openedAt.getTime() + 2 * 60 * 1000),
        readyAt: new Date(openedAt.getTime() + 12 * 60 * 1000),
        servedAt: new Date(openedAt.getTime() + 15 * 60 * 1000),
      },
    });
    for (const menuItem of pick) {
      const qty = 1 + (i % 2);
      const unitPrice = new Prisma.Decimal(menuItem.salePrice ?? menuItem.basePrice);
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: menuItem.id,
          itemNameSnapshot: menuItem.name,
          unitPriceSnapshot: unitPrice,
          quantity: qty,
          status: "SERVED",
          kitchenStationId: menuItem.kitchenStationId,
        },
      });
      subtotal = subtotal.add(unitPrice.mul(qty));
    }
    const taxAmount = subtotal.mul(8).div(100);
    const total = subtotal.add(taxAmount);
    await prisma.tableSession.update({
      where: { id: session.id },
      data: { subtotal, taxAmount, total },
    });
    await prisma.payment.create({
      data: {
        tableSessionId: session.id,
        amount: total,
        method: i % 3 === 0 ? "CASH" : i % 3 === 1 ? "BANK_TRANSFER" : "CARD",
        status: "COMPLETED",
        paidAt: new Date(openedAt.getTime() + 40 * 60 * 1000),
        cashierId: manager.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      actorLabel: admin.name,
      action: "SEED",
      entityType: "System",
      after: { note: "Initial demo data seeded" },
    },
  });

  console.log("Seed complete.");
  console.log("Demo tables & QR tokens (first 5):");
  for (const t of tables.slice(0, 5)) {
    console.log(`  ${t.code}: /order/${t.qrToken}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
