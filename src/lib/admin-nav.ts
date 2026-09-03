import type { Permission } from "@/lib/rbac/permissions";

export interface AdminNavItem {
  label: string;
  href: string;
  permission: Permission;
}
export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  { label: "", items: [{ label: "Dashboard", href: "/admin", permission: "dashboard.view" }] },
  {
    label: "Vận hành",
    items: [
      { label: "Bàn", href: "/admin/tables", permission: "tables.manage" },
      { label: "Đơn hàng", href: "/admin/orders", permission: "orders.view" },
      { label: "Bếp", href: "/kitchen", permission: "kitchen.view" },
    ],
  },
  {
    label: "Thực đơn",
    items: [{ label: "Menu & Tuỳ chọn", href: "/admin/menu", permission: "menu.manage" }],
  },
  {
    label: "Quản lý",
    items: [{ label: "Người dùng", href: "/admin/users", permission: "staff.manage" }],
  },
  {
    label: "Tài chính",
    items: [
      { label: "Thanh toán", href: "/admin/payments", permission: "payments.view" },
      { label: "Báo cáo", href: "/admin/reports", permission: "reports.view" },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Nhật ký", href: "/admin/audit", permission: "audit.view" },
      { label: "Cài đặt", href: "/admin/settings", permission: "settings.manage" },
    ],
  },
];
