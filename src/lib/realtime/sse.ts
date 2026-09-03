import "server-only";
import { subscribeAll } from "@/lib/realtime/bus";
import type { RealtimeEvent } from "@/lib/realtime/events";

const encoder = new TextEncoder();
const HEARTBEAT_MS = 20_000;

/** Builds an SSE Response, forwarding only events that pass `filter`. */
export function createSseResponse(filter: (event: RealtimeEvent) => boolean): Response {
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // controller already closed; cleanup happens in cancel()
        }
      };

      send(`retry: 3000\n\n`);
      unsubscribe = subscribeAll((event) => {
        if (!filter(event)) return;
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });
      heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
