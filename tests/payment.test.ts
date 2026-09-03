import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, loginAs, type Session } from "./helpers/client";
import { createTestTable, cleanupTable, getSeededMenuItem } from "./helpers/fixtures";

let table: Awaited<ReturnType<typeof createTestTable>>;
let cashier: Session;
let manager: Session;
let sessionId: string;

beforeAll(async () => {
  table = await createTestTable("PAY");
  cashier = await loginAs("cashier@example.local");
  manager = await loginAs("manager@example.local");

  const comBo = await getSeededMenuItem("MC-001");
  const khongHanh = comBo.modifierGroups[0].group.options.find((o) => o.name === "Không hành")!;
  await api(`/api/customer/${table.qrToken}/orders`, {
    method: "POST",
    body: { items: [{ menuItemId: comBo.id, modifierOptionIds: [khongHanh.id], quantity: 2 }] },
  });
  const s = await api(`/api/customer/${table.qrToken}/session`);
  sessionId = (s.json as { session: { id: string } }).session.id;
});

afterAll(async () => {
  await cleanupTable(table.id);
});

describe("Checkout & payment", () => {
  it("lets the customer request payment, which surfaces the table on the POS queue", async () => {
    const reqRes = await api(`/api/customer/${table.qrToken}/payment-request`, {
      method: "POST",
      body: { method: "CASH" },
    });
    expect(reqRes.status).toBe(200);

    const queue = await api("/api/pos/queue", { cookie: cashier.cookie });
    const items = (queue.json as { queue: { id: string; status: string }[] }).queue;
    expect(items.some((q) => q.id === sessionId && q.status === "PAYMENT_REQUESTED")).toBe(true);
  });

  it("lets a manager apply a discount before checkout", async () => {
    const res = await api("/api/discount", {
      method: "POST",
      cookie: manager.cookie,
      body: { tableSessionId: sessionId, discountType: "PERCENTAGE", discountValue: 10, reason: "khách quen" },
    });
    expect(res.status).toBe(200);
    const body = res.json as { discountAmount: string };
    expect(Number(body.discountAmount)).toBeGreaterThan(0);
  });

  it("completes checkout, closes the session and frees the table", async () => {
    const res = await api("/api/checkout", {
      method: "POST",
      cookie: cashier.cookie,
      body: { tableSessionId: sessionId, method: "CASH" },
    });
    expect(res.status).toBe(200);

    const tableState = await api(`/api/staff/tables/${table.id}`, { cookie: cashier.cookie });
    const body = tableState.json as { table: { status: string }; session: unknown };
    expect(body.table.status).toBe("AVAILABLE");
    expect(body.session).toBeNull();
  });

  it("rejects a second checkout on the same (now closed) session", async () => {
    const res = await api("/api/checkout", {
      method: "POST",
      cookie: cashier.cookie,
      body: { tableSessionId: sessionId, method: "CASH" },
    });
    expect(res.status).toBe(409);
  });

  it("lets a manager void the completed payment", async () => {
    const payments = await api("/api/pos/queue", { cookie: cashier.cookie }); // sanity: queue call still works post-close
    expect(payments.status).toBe(200);

    const paymentRow = await import("./helpers/client").then((m) =>
      m.db.payment.findFirstOrThrow({ where: { tableSessionId: sessionId } }),
    );
    const res = await api(`/api/payments/${paymentRow.id}/void`, {
      method: "POST",
      cookie: manager.cookie,
      body: { reason: "nhầm số tiền" },
    });
    expect(res.status).toBe(200);
    expect((res.json as { status: string }).status).toBe("VOIDED");
  });
});
