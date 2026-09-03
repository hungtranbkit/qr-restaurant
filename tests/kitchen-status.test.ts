import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, loginAs, type Session } from "./helpers/client";
import { createTestTable, cleanupTable, getSeededMenuItem } from "./helpers/fixtures";

let table: Awaited<ReturnType<typeof createTestTable>>;
let kitchen: Session;
let orderId: string;

beforeAll(async () => {
  table = await createTestTable("KDS");
  kitchen = await loginAs("kitchen@example.local");

  const coca = await getSeededMenuItem("DR-002");
  const res = await api(`/api/customer/${table.qrToken}/orders`, {
    method: "POST",
    body: { items: [{ menuItemId: coca.id, modifierOptionIds: [], quantity: 1 }] },
  });
  orderId = (res.json as { orderId: string }).orderId;
});

afterAll(async () => {
  await cleanupTable(table.id);
});

describe("Kitchen ticket status transitions", () => {
  it("shows the new order on the kitchen board as SUBMITTED", async () => {
    const res = await api("/api/kitchen/tickets", { cookie: kitchen.cookie });
    const tickets = (res.json as { tickets: { id: string; status: string }[] }).tickets;
    expect(tickets.some((t) => t.id === orderId && t.status === "SUBMITTED")).toBe(true);
  });

  it("advances SUBMITTED -> PREPARING", async () => {
    const res = await api(`/api/orders/${orderId}/status`, {
      method: "POST",
      cookie: kitchen.cookie,
      body: { status: "PREPARING" },
    });
    expect(res.status).toBe(200);
    expect((res.json as { status: string }).status).toBe("PREPARING");
  });

  it("rejects skipping straight to SERVED from PREPARING", async () => {
    const res = await api(`/api/orders/${orderId}/status`, {
      method: "POST",
      cookie: kitchen.cookie,
      body: { status: "SERVED" },
    });
    expect(res.status).toBe(409);
  });

  it("advances PREPARING -> READY", async () => {
    const res = await api(`/api/orders/${orderId}/status`, {
      method: "POST",
      cookie: kitchen.cookie,
      body: { status: "READY" },
    });
    expect(res.status).toBe(200);
  });

  it("rejects going backwards from READY to PREPARING", async () => {
    const res = await api(`/api/orders/${orderId}/status`, {
      method: "POST",
      cookie: kitchen.cookie,
      body: { status: "PREPARING" },
    });
    expect(res.status).toBe(409);
  });

  it("advances READY -> SERVED", async () => {
    const res = await api(`/api/orders/${orderId}/status`, {
      method: "POST",
      cookie: kitchen.cookie,
      body: { status: "SERVED" },
    });
    expect(res.status).toBe(200);
  });

  it("removes a SERVED order from the kitchen board", async () => {
    const res = await api("/api/kitchen/tickets", { cookie: kitchen.cookie });
    const tickets = (res.json as { tickets: { id: string }[] }).tickets;
    expect(tickets.some((t) => t.id === orderId)).toBe(false);
  });

  it("rejects any further transition once SERVED", async () => {
    const res = await api(`/api/orders/${orderId}/status`, {
      method: "POST",
      cookie: kitchen.cookie,
      body: { status: "READY" },
    });
    expect(res.status).toBe(409);
  });
});
