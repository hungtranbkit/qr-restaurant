import { NextResponse } from "next/server";
import {
  resolveTableByToken,
  getOpenOrPendingSessionForTable,
  toClientSession,
} from "@/lib/services/customer-access";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const table = await resolveTableByToken(token);
    const session = await getOpenOrPendingSessionForTable(table.id);
    return NextResponse.json({
      table: { id: table.id, code: table.code, name: table.name, status: table.status, seats: table.seats },
      session: toClientSession(session),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
