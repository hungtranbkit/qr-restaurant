import { describe, it, expect, beforeAll } from "vitest";
import { loginAs, api, type Session } from "./helpers/client";

let admin: Session;
let manager: Session;
let cashier: Session;
let waiter: Session;
let kitchen: Session;

beforeAll(async () => {
  admin = await loginAs("admin@example.local");
  manager = await loginAs("manager@example.local");
  cashier = await loginAs("cashier@example.local");
  waiter = await loginAs("waiter@example.local");
  kitchen = await loginAs("kitchen@example.local");
});

describe("Authentication", () => {
  it("rejects a wrong password", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: { email: "admin@example.local", password: "wrong-password" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown email", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: { email: "nobody@example.local", password: "demo123" },
    });
    expect(res.status).toBe(401);
  });
});

describe("Page-level RBAC redirects", () => {
  it("redirects unauthenticated users to /login", async () => {
    const res = await api("/staff/tables");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows MANAGER into /admin", async () => {
    const res = await api("/admin", { cookie: manager.cookie });
    expect(res.status).toBe(200);
  });

  it("blocks WAITER from /admin (redirects to /forbidden)", async () => {
    const res = await api("/admin", { cookie: waiter.cookie });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/forbidden");
  });

  it("blocks KITCHEN from /pos", async () => {
    const res = await api("/pos", { cookie: kitchen.cookie });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/forbidden");
  });

  it("blocks CASHIER from /admin/users (no staff.manage)", async () => {
    const res = await api("/admin/users", { cookie: cashier.cookie });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/forbidden");
  });

  it("allows WAITER into /staff/tables", async () => {
    const res = await api("/staff/tables", { cookie: waiter.cookie });
    expect(res.status).toBe(200);
  });

  it("allows KITCHEN into /kitchen", async () => {
    const res = await api("/kitchen", { cookie: kitchen.cookie });
    expect(res.status).toBe(200);
  });
});

describe("API-level RBAC (server-side, not just hidden buttons)", () => {
  it("rejects an unauthenticated API call with 401", async () => {
    const res = await api("/api/staff/tables");
    expect(res.status).toBe(401);
  });

  it("rejects WAITER calling payment.void-only endpoint with 403", async () => {
    const res = await api("/api/payments/nonexistent-id/void", {
      method: "POST",
      cookie: waiter.cookie,
      body: { reason: "test" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects WAITER calling checkout (payment.process-only) with 403", async () => {
    const res = await api("/api/checkout", {
      method: "POST",
      cookie: waiter.cookie,
      body: { tableSessionId: "nonexistent", method: "CASH" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects WAITER managing staff (staff.manage-only) with 403", async () => {
    const res = await api("/api/admin/users", {
      method: "POST",
      cookie: waiter.cookie,
      body: { name: "x", email: "x@example.local", role: "WAITER" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects KITCHEN creating orders (orders.create-only) with 403", async () => {
    const res = await api("/api/staff/tables/nonexistent/orders", {
      method: "POST",
      cookie: kitchen.cookie,
      body: { items: [] },
    });
    expect(res.status).toBe(403);
  });

  it("allows SUPER_ADMIN and MANAGER equal access to the dashboard API surface", async () => {
    const [a, m] = await Promise.all([
      api("/admin", { cookie: admin.cookie }),
      api("/admin", { cookie: manager.cookie }),
    ]);
    expect(a.status).toBe(200);
    expect(m.status).toBe(200);
  });
});
