"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to a Server-Sent-Events endpoint and calls `onEvent` for every
 * message received. Reconnects automatically on drop (the browser's
 * EventSource already retries, this just guards against stale closures).
 */
export function useSse(url: string | null, onEvent: (type: string, data: unknown) => void) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);

    const eventTypes = [
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

    const listeners = eventTypes.map((type) => {
      const listener = (e: MessageEvent) => {
        try {
          handlerRef.current(type, JSON.parse(e.data));
        } catch {
          handlerRef.current(type, null);
        }
      };
      es.addEventListener(type, listener);
      return { type, listener };
    });

    return () => {
      for (const { type, listener } of listeners) es.removeEventListener(type, listener);
      es.close();
    };
  }, [url]);
}
