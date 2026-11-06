/**
 * TaskFlow realtime service: a small, stateless Socket.io server.
 *
 * - Browsers connect with a short-lived ticket (JWT) issued by the Next.js app after it has checked
 *   project membership, and join that project's room. No database access is needed here.
 * - The Next.js app publishes domain events over an authenticated HTTP endpoint (POST /publish),
 *   which are fanned out to the project's room.
 * - Presence (who's viewing the board) is derived from the sockets in each room.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { Server } from "socket.io";
import { jwtVerify } from "jose";
import {
  REALTIME_AUDIENCE,
  projectRoom,
  type ClientToServerEvents,
  type PresenceUser,
  type PublishPayload,
  type RealtimeTicketClaims,
  type ServerToClientEvents,
} from "../src/lib/realtime-events";

const PORT = Number(process.env.PORT ?? process.env.REALTIME_PORT ?? 4000);
const SECRET = process.env.REALTIME_SECRET;
const ORIGINS = (process.env.REALTIME_CORS_ORIGIN ?? "http://localhost:3000").split(",").map((o) => o.trim());
const MAX_BODY_BYTES = 256 * 1024;

if (!SECRET) {
  console.error("[realtime] REALTIME_SECRET is required");
  process.exit(1);
}
const ticketKey = new TextEncoder().encode(SECRET);
const expectedAuth = Buffer.from(`Bearer ${SECRET}`);

interface SocketData extends PresenceUser {
  projectId: string;
}

function isAuthorized(req: IncomingMessage) {
  const header = Buffer.from(req.headers.authorization ?? "");
  return header.length === expectedAuth.length && timingSafeEqual(header, expectedAuth);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Payload too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isPublishPayload(value: unknown): value is PublishPayload {
  const v = value as PublishPayload | null;
  return typeof v?.projectId === "string" && typeof v.event?.type === "string" && typeof v.event.actorId === "string";
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, { ok: true, connections: io.engine.clientsCount });
  }
  if (req.method === "POST" && req.url === "/publish") {
    if (!isAuthorized(req)) return send(res, 401, { error: "Unauthorized" });
    let payload: unknown;
    try {
      payload = await readJson(req);
    } catch {
      return send(res, 400, { error: "Invalid JSON body" });
    }
    if (!isPublishPayload(payload)) return send(res, 400, { error: "Invalid event" });
    await fanOut(payload);
    return send(res, 202, { ok: true });
  }
  send(res, 404, { error: "Not found" });
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: ORIGINS, credentials: true },
});

io.use(async (socket, next) => {
  const token: unknown = socket.handshake.auth?.token;
  if (typeof token !== "string") return next(new Error("unauthorized"));
  try {
    const { payload } = await jwtVerify<RealtimeTicketClaims>(token, ticketKey, {
      audience: REALTIME_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.projectId) throw new Error("Malformed ticket");
    socket.data = { id: payload.sub, name: payload.name, imageUrl: payload.imageUrl, projectId: payload.projectId };
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

async function broadcastPresence(room: string) {
  const sockets = await io.in(room).fetchSockets();
  const users = new Map<string, PresenceUser>();
  for (const { data } of sockets) users.set(data.id, { id: data.id, name: data.name, imageUrl: data.imageUrl });
  io.to(room).emit("presence", [...users.values()]);
}

async function fanOut({ projectId, event }: PublishPayload) {
  const room = projectRoom(projectId);
  io.to(room).emit("event", event);

  // Access changes take effect immediately: revoked viewers stop receiving the project's events.
  if (event.type === "project.deleted") {
    io.in(room).socketsLeave(room);
  } else if (event.type === "project.members_changed" && event.removedUserId) {
    const sockets = await io.in(room).fetchSockets();
    for (const socket of sockets) if (socket.data.id === event.removedUserId) socket.leave(room);
    await broadcastPresence(room);
  }
}

io.on("connection", async (socket) => {
  const room = projectRoom(socket.data.projectId);
  await socket.join(room);
  await broadcastPresence(room);
  socket.on("disconnect", () => void broadcastPresence(room));
});

httpServer.listen(PORT, () => {
  console.log(`[realtime] listening on :${PORT} (allowed origins: ${ORIGINS.join(", ")})`);
});

function shutdown() {
  io.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
