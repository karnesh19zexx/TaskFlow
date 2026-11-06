import { after } from "next/server";
import { SignJWT } from "jose";
import { REALTIME_AUDIENCE, type PublishPayload, type RealtimeEvent } from "@/lib/realtime-events";

const REALTIME_URL = process.env.REALTIME_INTERNAL_URL ?? process.env.NEXT_PUBLIC_REALTIME_URL;
const REALTIME_SECRET = process.env.REALTIME_SECRET;

export const isRealtimeEnabled = () => Boolean(REALTIME_URL && REALTIME_SECRET);

/**
 * Fans an event out to everyone viewing the project. Runs after the response is sent and never
 * throws: the database is the source of truth, and clients resync on reconnect if an event is lost.
 */
export function publish(projectId: string, event: RealtimeEvent) {
  if (!REALTIME_URL || !REALTIME_SECRET) return;
  const payload: PublishPayload = { projectId, event };
  after(async () => {
    try {
      const res = await fetch(`${REALTIME_URL}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${REALTIME_SECRET}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) console.warn(`[realtime] publish ${event.type} failed: HTTP ${res.status}`);
    } catch (error) {
      console.warn(`[realtime] publish ${event.type} failed`, error);
    }
  });
}

export async function createRealtimeTicket(
  projectId: string,
  user: { id: string; name: string; imageUrl: string | null },
) {
  if (!REALTIME_SECRET) throw new Error("REALTIME_SECRET is not configured");
  return new SignJWT({ projectId, name: user.name, imageUrl: user.imageUrl })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setAudience(REALTIME_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(new TextEncoder().encode(REALTIME_SECRET));
}
