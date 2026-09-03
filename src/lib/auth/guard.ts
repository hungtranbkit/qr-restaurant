import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/rbac/permissions";

export class ForbiddenError extends Error {
  constructor(message = "Bạn không có quyền thực hiện thao tác này") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Vui lòng đăng nhập") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** For server components/pages: redirects to /login if not authenticated. */
export async function requireUser(loginPath = "/login"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  return user;
}

/** For server components/pages: redirects to /login and enforces a permission. */
export async function requirePagePermission(
  permission: Permission,
  loginPath = "/login",
): Promise<SessionUser> {
  const user = await requireUser(loginPath);
  if (!hasPermission(user.role, permission)) {
    redirect("/forbidden");
  }
  return user;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireApiPermission(permission: Permission): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!hasPermission(user.role, permission)) throw new ForbiddenError();
  return user;
}
