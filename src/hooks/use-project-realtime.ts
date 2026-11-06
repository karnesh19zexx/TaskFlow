"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api-client";
import type {
  ClientToServerEvents,
  PresenceUser,
  RealtimeEvent,
  ServerToClientEvents,
} from "@/lib/realtime-events";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL;
const RETRY_DELAY_MS = 5000;

export type RealtimeStatus = "disabled" | "connecting" | "live" | "offline";

interface Handlers {
  onEvent: (event: RealtimeEvent) => void;
  /** Called after a reconnect, to catch up on anything missed while offline. */
  onResync: () => void;
}

export function useProjectRealtime(projectId: string, handlers: Handlers) {
  const [status, setStatus] = useState<RealtimeStatus>(REALTIME_URL ? "connecting" : "disabled");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!REALTIME_URL) return;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let hasConnected = false;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(REALTIME_URL, {
      // Fetch a fresh ticket on every (re)connect, so membership is re-checked each time.
      auth: (cb) => {
        api<{ token: string }>(`/api/projects/${projectId}/realtime-token`, { method: "POST" })
          .then(({ token }) => cb({ token }))
          .catch(() => cb({}));
      },
    });

    socket.on("connect", () => {
      setStatus("live");
      if (hasConnected) handlersRef.current.onResync();
      hasConnected = true;
    });
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", () => {
      setStatus("offline");
      // Rejected handshakes are not retried by socket.io itself.
      if (!socket.active) retryTimer = setTimeout(() => socket.connect(), RETRY_DELAY_MS);
    });
    socket.on("event", (event) => handlersRef.current.onEvent(event));
    socket.on("presence", setPresence);

    return () => {
      clearTimeout(retryTimer);
      socket.disconnect();
    };
  }, [projectId]);

  return { status, presence };
}
