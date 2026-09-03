import { randomBytes } from "crypto";

/** Opaque, unguessable token embedded in a table's QR code — never a raw DB id. */
export function generateQrToken(): string {
  return randomBytes(24).toString("base64url");
}

export function buildOrderUrl(qrToken: string): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3200";
  return `${base}/order/${qrToken}`;
}
