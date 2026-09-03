import "server-only";
import { EventEmitter } from "events";
import type { RealtimeEvent, RealtimeEventType } from "./events";

// Survive Next.js dev HMR by stashing the emitter on globalThis, same
// pattern as the Prisma client singleton.
const globalForBus = globalThis as unknown as { __qrRestaurantBus?: EventEmitter };

const emitter = globalForBus.__qrRestaurantBus ?? new EventEmitter();
emitter.setMaxListeners(0);
if (process.env.NODE_ENV !== "production") globalForBus.__qrRestaurantBus = emitter;

const CHANNEL = "event";

export function publishEvent<T>(event: Omit<RealtimeEvent<T>, "ts">) {
  const full: RealtimeEvent<T> = { ...event, ts: Date.now() };
  emitter.emit(CHANNEL, full);
}

export function subscribeAll(listener: (event: RealtimeEvent) => void): () => void {
  emitter.on(CHANNEL, listener);
  return () => emitter.off(CHANNEL, listener);
}

/** Convenience helper used by services after any mutation that affects table status. */
export function publishTableStatusUpdated(branchId: string, tableId: string, payload: unknown) {
  publishEvent({ type: "TABLE_STATUS_UPDATED", branchId, tableId, payload });
}

export const RealtimeEventTypes: RealtimeEventType[] = [
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "KITCHEN_TICKET_CREATED",
  "KITCHEN_TICKET_UPDATED",
  "CUSTOMER_REQUEST_CREATED",
  "CUSTOMER_REQUEST_UPDATED",
  "TABLE_STATUS_UPDATED",
  "PAYMENT_REQUEST_CREATED",
  "PAYMENT_COMPLETED",
  "MENU_ITEM_UPDATED",
];
