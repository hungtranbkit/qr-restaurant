import type { Role } from "@prisma/client";

/**
 * All permissions recognized by the system. Keep this list the single
 * source of truth — UI and API authorization both read from it, so a
 * missing permission here means a route is unguardable, not just hidden.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "menu.manage",
  "menu.priceEdit",
  "tables.manage", // area/table CRUD + QR
  "tables.view",
  "table.open",
  "table.transfer",
  "orders.view",
  "orders.create",
  "orders.manage", // cancel item / cancel order
  "staff.manage", // user CRUD
  "reports.view",
  "payments.view", // payment history
  "discount.apply",
  "payment.process", // checkout / mark paid
  "payment.void",
  "audit.view",
  "request.view",
  "request.manage", // accept / complete customer requests
  "kitchen.view",
  "kitchen.manage", // ticket status transitions
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    "dashboard.view",
    "menu.manage",
    "menu.priceEdit",
    "tables.manage",
    "tables.view",
    "table.open",
    "table.transfer",
    "orders.view",
    "orders.create",
    "orders.manage",
    "staff.manage",
    "reports.view",
    "payments.view",
    "discount.apply",
    "payment.process",
    "payment.void",
    "audit.view",
    "request.view",
    "request.manage",
    "kitchen.view",
    "settings.manage",
  ],
  CASHIER: [
    "tables.view",
    "orders.view",
    "payments.view",
    "payment.process",
    "request.view",
  ],
  WAITER: [
    "tables.view",
    "table.open",
    "table.transfer",
    "orders.view",
    "orders.create",
    "request.view",
    "request.manage",
  ],
  KITCHEN: ["kitchen.view", "kitchen.manage"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
