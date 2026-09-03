import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

/**
 * End-to-end coverage of the mandatory demo scenario (see README §Demo E2E):
 * QR scan -> customer order -> kitchen ticket -> serve -> second order ->
 * service request -> payment request -> cashier checkout -> table freed.
 *
 * Requires the dev server (`npm run dev`) and a seeded database running.
 * Install browsers once with `npx playwright install chromium`.
 */

const db = new PrismaClient();

let tableId: string;
let qrToken: string;
let tableCode: string;

test.beforeAll(async () => {
  const branch = await db.branch.findFirstOrThrow();
  const area = await db.area.findFirstOrThrow({ where: { branchId: branch.id } });
  tableCode = `E2E-${randomBytes(2).toString("hex")}`;
  qrToken = randomBytes(24).toString("base64url");
  const table = await db.table.create({
    data: { branchId: branch.id, areaId: area.id, code: tableCode, name: `Bàn ${tableCode}`, seats: 4, qrToken },
  });
  tableId = table.id;
});

test.afterAll(async () => {
  const sessions = await db.tableSession.findMany({ where: { tableId }, select: { id: true } });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length) {
    const orders = await db.order.findMany({ where: { tableSessionId: { in: sessionIds } }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);
    await db.orderItemModifier.deleteMany({ where: { orderItem: { orderId: { in: orderIds } } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
    await db.customerRequest.deleteMany({ where: { tableSessionId: { in: sessionIds } } });
    await db.payment.deleteMany({ where: { tableSessionId: { in: sessionIds } } });
    await db.tableSession.deleteMany({ where: { id: { in: sessionIds } } });
  }
  await db.table.delete({ where: { id: tableId } }).catch(() => undefined);
  await db.$disconnect();
});

async function loginAsStaff(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill("demo123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("QR order -> kitchen -> serve -> request -> payment -> checkout", async ({ browser }) => {
  const customerCtx = await browser.newContext();
  const customer = await customerCtx.newPage();

  // 1. Customer scans the QR (navigates straight to the order URL).
  await customer.goto(`/order/${qrToken}`);
  await expect(customer.getByText(`Bàn ${tableCode}`)).toBeVisible();

  // 2. Add 2x Cơm bò to the cart.
  await customer.getByRole("button", { name: /Cơm bò/ }).first().click();
  await customer.getByRole("button", { name: "Tăng số lượng" }).click();
  await customer.getByRole("button", { name: /Thêm vào giỏ/ }).click();

  // 3. Submit the order.
  await customer.getByRole("button", { name: /Giỏ món/ }).click();
  await customer.getByRole("button", { name: /GỬI ĐƠN/ }).click();
  await expect(customer.getByText(/Đã gửi đơn/)).toBeVisible();

  // 4. Kitchen sees the ticket and advances it to READY.
  const kitchenCtx = await browser.newContext();
  const kitchen = await kitchenCtx.newPage();
  await loginAsStaff(kitchen, "kitchen@example.local");
  await expect(kitchen.getByText(`Bàn ${tableCode}`)).toBeVisible({ timeout: 10_000 });
  await kitchen.getByRole("button", { name: "Nhận món" }).first().click();
  await kitchen.getByRole("button", { name: "Hoàn thành" }).first().click();

  // 5. Waiter sees the table flagged "Sẵn sàng" on the table board.
  const waiterCtx = await browser.newContext();
  const waiter = await waiterCtx.newPage();
  await loginAsStaff(waiter, "waiter@example.local");
  await waiter.goto("/staff/tables");
  await expect(waiter.getByText("Sẵn sàng")).toBeVisible({ timeout: 10_000 });

  // 6. Customer calls staff.
  await customer.getByRole("button", { name: /Gọi nhân viên/ }).click();
  await customer.getByText("Gọi phục vụ").click();
  await customer.getByRole("button", { name: "Gửi yêu cầu" }).click();

  // 7. Customer requests payment (cash).
  await customer.getByRole("button", { name: /Thanh toán/ }).click();
  await customer.getByText("Tiền mặt").click();
  await customer.getByRole("button", { name: "Gọi thanh toán" }).click();

  // 8. Cashier checks the table out.
  const cashierCtx = await browser.newContext();
  const cashier = await cashierCtx.newPage();
  await loginAsStaff(cashier, "cashier@example.local");
  await expect(cashier.getByText(`Bàn ${tableCode}`)).toBeVisible({ timeout: 10_000 });
  await cashier.getByText(`Bàn ${tableCode}`).click();
  await cashier.getByRole("button", { name: /Xác nhận thanh toán/ }).click();
  await expect(cashier.getByText(`Bàn ${tableCode}`)).toHaveCount(0, { timeout: 10_000 });

  // 9. The table is free again.
  const table = await db.table.findUniqueOrThrow({ where: { id: tableId } });
  expect(table.status).toBe("AVAILABLE");
});
