import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/misc";
import { toErrorResponse } from "@/lib/api-error";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/services/audit";
import { roleHomePath } from "@/lib/auth/role-home";

export async function POST(req: Request) {
  try {
    const key = clientKeyFromRequest(req, "login");
    if (!rateLimit(key, 10, 60_000)) {
      return NextResponse.json({ error: "Quá nhiều lần thử. Vui lòng thử lại sau." }, { status: 429 });
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    await createSession(user.id);
    await writeAuditLog({
      actor: { type: "user", id: user.id, label: user.name },
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
      redirectTo: roleHomePath(user.role),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
