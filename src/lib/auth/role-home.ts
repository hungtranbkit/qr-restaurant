import type { Role } from "@prisma/client";

export function roleHomePath(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "MANAGER":
      return "/admin";
    case "CASHIER":
      return "/pos";
    case "WAITER":
      return "/staff";
    case "KITCHEN":
      return "/kitchen";
    default:
      return "/login";
  }
}
