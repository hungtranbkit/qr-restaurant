import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api } from "./helpers/client";
import { createTestTable, cleanupTable, getSeededMenuItem } from "./helpers/fixtures";

let tableA: Awaited<ReturnType<typeof createTestTable>>;
let tableB: Awaited<ReturnType<typeof createTestTable>>;

beforeAll(async () => {
  tableA = await createTestTable("SECA");
  tableB = await createTestTable("SECB");

  const coca = await getSeededMenuItem("DR-002");
  await api(`/api/customer/${tableA.qrToken}/orders`, {
    method: "POST",
    body: { items: [{ menuItemId: coca.id, modifierOptionIds: [], quantity: 1 }] },
  });
});

afterAll(async () => {
  await cleanupTable(tableA.id);
  await cleanupTable(tableB.id);
});

describe("Unauthorized access is blocked server-side", () => {
  it("never leaks table A's order data through table B's token", async () => {
    const res = await api(`/api/customer/${tableB.qrToken}/session`);
    const body = res.json as { session: unknown };
    expect(body.session).toBeNull(); // table B has no orders of its own
  });

  it("cannot submit an order to table B while presenting table A's context", async () => {
    // The route is entirely token-scoped server-side — there is no tableId
    // field a client could smuggle in to redirect an order elsewhere.
    const coca = await getSeededMenuItem("DR-002");
    const res = await api(`/api/customer/${tableB.qrToken}/orders`, {
      method: "POST",
      body: { tableId: tableA.id, items: [{ menuItemId: coca.id, modifierOptionIds: [], quantity: 1 }] },
    });
    expect(res.status).toBe(201);

    const bSession = await api(`/api/customer/${tableB.qrToken}/session`);
    const aSession = await api(`/api/customer/${tableA.qrToken}/session`);
    const bOrders = (bSession.json as { session: { orders: unknown[] } }).session.orders;
    const aOrders = (aSession.json as { session: { orders: unknown[] } }).session.orders;
    expect(bOrders).toHaveLength(1); // landed on B, not smuggled onto A
    expect(aOrders).toHaveLength(1); // A unaffected
  });

  it("blocks a customer (no session) from every staff/admin API", async () => {
    const endpoints = ["/api/staff/tables", "/api/admin/users", "/api/pos/queue", "/api/kitchen/tickets", "/api/staff/notifications"];
    for (const path of endpoints) {
      const res = await api(path);
      expect(res.status).toBe(401);
    }
  });

  it("blocks a customer from admin mutation endpoints without a session", async () => {
    const res = await api("/api/admin/tables", {
      method: "POST",
      body: { areaId: "x", code: "HACK", name: "Hack", seats: 2 },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a customer request for a table that doesn't exist", async () => {
    const res = await api(`/api/customer/does-not-exist-token/requests`, {
      method: "POST",
      body: { type: "CALL_STAFF" },
    });
    expect(res.status).toBe(404);
  });
});
