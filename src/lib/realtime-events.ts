import type { TaskDTO } from "@/types";

/** Shared contract between the Next.js app (publisher), the realtime service, and browser clients. */
export type RealtimeEvent =
  | { type: "task.created"; actorId: string; task: TaskDTO }
  | { type: "task.updated"; actorId: string; task: TaskDTO }
  | { type: "task.deleted"; actorId: string; taskId: string }
  | { type: "project.updated"; actorId: string }
  | { type: "project.deleted"; actorId: string }
  | { type: "project.members_changed"; actorId: string; removedUserId?: string };

export interface PresenceUser {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface PublishPayload {
  projectId: string;
  event: RealtimeEvent;
}

/** Claims of the short-lived ticket the app issues so a browser can join one project's room. */
export interface RealtimeTicketClaims {
  sub: string;
  projectId: string;
  name: string;
  imageUrl: string | null;
}

export interface ServerToClientEvents {
  event: (event: RealtimeEvent) => void;
  presence: (users: PresenceUser[]) => void;
}

export type ClientToServerEvents = Record<string, never>;

export const REALTIME_AUDIENCE = "taskflow-realtime";

export const projectRoom = (projectId: string) => `project:${projectId}`;
