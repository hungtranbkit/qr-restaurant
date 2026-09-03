import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/guard";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Không tìm thấy dữ liệu") {
    super(message, 404);
  }
}

/** Wraps a route handler body, translating thrown errors into JSON responses. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", issues: err.issues },
      { status: 422 },
    );
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
}
