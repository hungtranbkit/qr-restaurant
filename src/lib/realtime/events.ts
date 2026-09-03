/**
 * Shared types for the realtime event layer. Events are published in-process
 * (see bus.ts) and fanned out to subscribers over Server-Sent Events.
 */

export type RealtimeEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "KITCHEN_TICKET_CREATED"
  | "KITCHEN_TICKET_UPDATED"
  | "CUSTOMER_REQUEST_CREATED"
  | "CUSTOMER_REQUEST_UPDATED"
  | "TABLE_STATUS_UPDATED"
  | "PAYMENT_REQUEST_CREATED"
  | "PAYMENT_COMPLETED"
  | "MENU_ITEM_UPDATED";

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  branchId: string;
  tableId?: string;
  tableSessionId?: string;
  payload: T;
  ts: number;
}
