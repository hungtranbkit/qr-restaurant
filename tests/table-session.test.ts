import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, loginAs, type Session } from "./helpers/client";
import { createTestTable, cleanupTable, getSeededMenuItem } from "./helpers/fixtures";

let table: Awaited<ReturnType<typeof createTestTable>>;
let waiter: Session;

beforeAll(async () => {
  table = await createTestTable("SESSION");
  waiter = await loginAs("waiter@example.local");
});

afterAll(async () => {
  await cleanupTable(table.id);
});

describe("TableSession lifecycle", () => {
  it("starts a table AVAILABLE with no open session", async () => {
    const res = await api(`/api/customer/${table.qrToken}/session`);
    const body = res.json as { table: { status: string }; session: unknown };
    expect(body.table.status).toBe("AVAILABLE");
    expect(body.session).toBeNull();
  });

  it("auto-opens a session on the first customer order and flips the table to WAITING_FOOD", async () => {
    const coca = await getSeededMenuItem("DR-002");
    const res = await api(`/api/customer/${table.qrToken}/orders`, {
      method: "POST",
      body: { items: [{ menuItemId: coca.id, modifierOptionIds: [], quantity: 1 }] },
    });
    expect(res.status).toBe(201);

    const session = await api(`/api/customer/${table.qrToken}/session`);
    const body = session.json as { table: { status: string }; session: { status: string; orders: unknown[] } };
    expect(body.table.status).toBe("WAITING_FOOD");
    expect(body.session.status).toBe("OPEN");
    expect(body.session.orders).toHaveLength(1);
  });

  it("supports multiple orders within the same session (customer orders again later)", async () => {
    const kem = await getSeededMenuItem("DS-001");
    const first = await api(`/api/customer/${table.qrToken}/session`);
    const firstSessionId = (first.json as { session: { id: string } }).session.id;

    const res = await api(`/api/customer/${table.qrToken}/orders`, {
      method: "POST",
      body: { items: [{ menuItemId: kem.id, modifierOptionIds: [], quantity: 1 }] },
    });
    expect(res.status).toBe(201);

    const second = await api(`/api/customer/${table.qrToken}/session`);
    const body = second.json as { session: { id: string; orders: { orderNumber: number }[] } };
    expect(body.session.id).toBe(firstSessionId); // same session, not a new one
    expect(body.session.orders).toHaveLength(2);
  });

  it("blocks new orders once payment has been requested", async () => {
    await api(`/api/customer/${table.qrToken}/payment-request`, { method: "POST", body: { method: "CASH" } });

    const coca = await getSeededMenuItem("DR-002");
    const res = await api(`/api/customer/${table.qrToken}/orders`, {
      method: "POST",
      body: { items: [{ menuItemId: coca.id, modifierOptionIds: [], quantity: 1 }] },
    });
    expect(res.status).toBe(409);
  });

  it("rejects opening an already-open table a second time (staff side)", async () => {
    const res = await api(`/api/staff/tables/${table.id}/open`, {
      method: "POST",
      cookie: waiter.cookie,
      body: { guestCount: 2 },
    });
    // Table already has an open session — service returns the existing one rather than erroring,
    // but it must not create a second concurrent session.
    expect(res.status).toBe(200);
    const sessionsRes = await api(`/api/customer/${table.qrToken}/session`);
    const body = sessionsRes.json as { session: { orders: unknown[] } };
    expect(body.session.orders).toHaveLength(2); // unchanged — no duplicate session was created
  });
});
