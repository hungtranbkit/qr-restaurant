import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "crypto";
import { api, loginAs, type Session } from "./helpers/client";
import { createTestTable, cleanupTable } from "./helpers/fixtures";

let table: Awaited<ReturnType<typeof createTestTable>>;
let admin: Session;

beforeAll(async () => {
  table = await createTestTable("QR");
  admin = await loginAs("admin@example.local");
});

afterAll(async () => {
  await cleanupTable(table.id);
});

describe("QR token validation (public customer route)", () => {
  it("resolves a valid table token to its order page", async () => {
    const res = await api(`/order/${table.qrToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(table.code);
  });

  it("exposes the table over the session API for a valid token", async () => {
    const res = await api(`/api/customer/${table.qrToken}/session`);
    expect(res.status).toBe(200);
    const body = res.json as { table: { code: string } };
    expect(body.table.code).toBe(table.code);
  });

  it("rejects a random/garbage token with 404 at the API layer", async () => {
    const res = await api(`/api/customer/${randomBytes(24).toString("base64url")}/session`);
    expect(res.status).toBe(404);
  });

  it("never exposes the raw table id in the QR URL", () => {
    // The token is a 24-byte random base64url string, not a cuid — asserts the
    // route contract (/order/{secure-token}) rather than /order?tableId=1.
    expect(table.qrToken).not.toBe(table.id);
    expect(table.qrToken.length).toBeGreaterThanOrEqual(32);
  });

  it("invalidates the old token after an admin regenerates the QR code", async () => {
    const before = await api(`/api/customer/${table.qrToken}/session`);
    expect(before.status).toBe(200);

    const regen = await api(`/api/admin/tables/${table.id}/qr`, { method: "POST", cookie: admin.cookie });
    expect(regen.status).toBe(200);
    const newToken = (regen.json as { orderUrl: string }).orderUrl.split("/order/")[1];
    expect(newToken).not.toBe(table.qrToken);

    const oldStillWorks = await api(`/api/customer/${table.qrToken}/session`);
    expect(oldStillWorks.status).toBe(404);

    const newWorks = await api(`/api/customer/${newToken}/session`);
    expect(newWorks.status).toBe(200);

    table = { ...table, qrToken: newToken };
  });

  it("rejects ordering on a disabled table", async () => {
    const disabled = await createTestTable("DISABLED");
    await api(`/api/admin/tables/${disabled.id}`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: { active: false },
    });
    const res = await api(`/api/customer/${disabled.qrToken}/session`);
    expect(res.status).toBe(409);
    await cleanupTable(disabled.id);
  });
});
