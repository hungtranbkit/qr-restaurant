import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api } from "./helpers/client";
import { createTestTable, cleanupTable, getSeededMenuItem } from "./helpers/fixtures";
import { db } from "./helpers/client";

let table: Awaited<ReturnType<typeof createTestTable>>;

beforeAll(async () => {
  table = await createTestTable("PRICE");
});

afterAll(async () => {
  await cleanupTable(table.id);
});

describe("Server-side order pricing (never trusts client-sent prices)", () => {
  it("computes unit price + variant + modifiers correctly, server-side", async () => {
    const comBo = await getSeededMenuItem("MC-001"); // Cơm bò, has "Tuỳ chọn" modifier group
    const khongHanh = comBo.modifierGroups[0].group.options.find((o) => o.name === "Không hành")!;
    const themTrung = comBo.modifierGroups[0].group.options.find((o) => o.name === "Thêm trứng")!;

    const res = await api(`/api/customer/${table.qrToken}/orders`, {
      method: "POST",
      body: {
        items: [
          {
            menuItemId: comBo.id,
            modifierOptionIds: [khongHanh.id, themTrung.id],
            quantity: 3,
          },
        ],
      },
    });
    expect(res.status).toBe(201);

    const session = await api(`/api/customer/${table.qrToken}/session`);
    const body = session.json as { session: { subtotal: number; taxAmount: number; total: number } };

    const expectedUnit = Number(comBo.salePrice ?? comBo.basePrice) + Number(themTrung.priceDelta) + Number(khongHanh.priceDelta);
    const expectedSubtotal = expectedUnit * 3;
    expect(body.session.subtotal).toBeCloseTo(expectedSubtotal, 5);

    const branch = await db.branch.findUniqueOrThrow({ where: { id: table.branchId } });
    const expectedTax = Math.round(((expectedSubtotal * Number(branch.taxRatePercent)) / 100) * 100) / 100;
    expect(body.session.taxAmount).toBeCloseTo(expectedTax, 1);
    expect(body.session.total).toBeCloseTo(expectedSubtotal + body.session.taxAmount, 1);
  });

  it("applies variant price delta (e.g. Mì cay Medium size)", async () => {
    const miCay = await getSeededMenuItem("MI-001");
    const medium = miCay.variants.find((v) => v.name === "Medium")!;
    const spiceLevel2 = miCay.modifierGroups[0].group.options.find((o) => o.name === "Cấp độ 2")!;

    const t2 = await createTestTable("VARIANT");
    const res = await api(`/api/customer/${t2.qrToken}/orders`, {
      method: "POST",
      body: {
        items: [{ menuItemId: miCay.id, variantId: medium.id, modifierOptionIds: [spiceLevel2.id], quantity: 1 }],
      },
    });
    expect(res.status).toBe(201);

    const session = await api(`/api/customer/${t2.qrToken}/session`);
    const body = session.json as { session: { subtotal: number } };
    const expected = Number(miCay.salePrice ?? miCay.basePrice) + Number(medium.priceDelta);
    expect(body.session.subtotal).toBeCloseTo(expected, 5);
    await cleanupTable(t2.id);
  });

  it("ignores/rejects any client-supplied price — server always recalculates", async () => {
    const coca = await getSeededMenuItem("DR-002");
    const t3 = await createTestTable("NOPRICE");
    // The API schema doesn't even accept a price field, but assert the
    // response total reflects the real DB price regardless of any extra
    // fields a malicious client might smuggle into the payload.
    const res = await api(`/api/customer/${t3.qrToken}/orders`, {
      method: "POST",
      body: {
        items: [
          {
            menuItemId: coca.id,
            modifierOptionIds: [],
            quantity: 1,
            // Intentionally smuggling a bogus client-supplied price — the
            // `body` is untyped JSON here, so this reaches the server as-is
            // and the server must ignore it entirely.
            unitPrice: 1,
            totalPrice: 1,
          },
        ],
      },
    });
    expect(res.status).toBe(201);
    const session = await api(`/api/customer/${t3.qrToken}/session`);
    const body = session.json as { session: { subtotal: number } };
    expect(body.session.subtotal).toBeCloseTo(Number(coca.salePrice ?? coca.basePrice), 5);
    await cleanupTable(t3.id);
  });

  it("rejects a required modifier group left unfilled (Mì cay requires a spice level)", async () => {
    const miCay = await getSeededMenuItem("MI-001");
    const t4 = await createTestTable("REQMOD");
    const res = await api(`/api/customer/${t4.qrToken}/orders`, {
      method: "POST",
      body: { items: [{ menuItemId: miCay.id, modifierOptionIds: [], quantity: 1 }] },
    });
    expect(res.status).toBe(422);
    await cleanupTable(t4.id);
  });

  it("rejects ordering a sold-out item", async () => {
    const soldOutItem = await getSeededMenuItem("MC-004"); // seeded as soldOut: true
    const t5 = await createTestTable("SOLDOUT");
    const res = await api(`/api/customer/${t5.qrToken}/orders`, {
      method: "POST",
      body: { items: [{ menuItemId: soldOutItem.id, modifierOptionIds: [], quantity: 1 }] },
    });
    expect(res.status).toBe(409);
    await cleanupTable(t5.id);
  });

  it("keeps a historical price snapshot even after the menu price changes later", async () => {
    const admin = await import("./helpers/client").then((m) => m.loginAs("admin@example.local"));
    const coca = await getSeededMenuItem("DR-002");
    const t6 = await createTestTable("SNAPSHOT");
    await api(`/api/customer/${t6.qrToken}/orders`, {
      method: "POST",
      body: { items: [{ menuItemId: coca.id, modifierOptionIds: [], quantity: 1 }] },
    });
    const before = await api(`/api/customer/${t6.qrToken}/session`);
    const beforeTotal = (before.json as { session: { subtotal: number } }).session.subtotal;

    // Manager doubles the price after the order was placed.
    await api(`/api/admin/menu/items/${coca.id}`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: { basePrice: Number(coca.basePrice) * 2 },
    });

    const after = await api(`/api/customer/${t6.qrToken}/session`);
    const afterTotal = (after.json as { session: { subtotal: number } }).session.subtotal;
    expect(afterTotal).toBe(beforeTotal); // snapshot unaffected by the later price change

    // restore price for other tests / demo consistency
    await api(`/api/admin/menu/items/${coca.id}`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: { basePrice: Number(coca.basePrice) },
    });
    await cleanupTable(t6.id);
  });
});
