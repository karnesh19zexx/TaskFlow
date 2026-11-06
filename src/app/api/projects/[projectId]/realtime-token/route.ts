import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { HttpError } from "@/server/errors";
import { createRealtimeTicket, isRealtimeEnabled } from "@/server/realtime";
import { getAccessibleProject } from "@/server/services/projects";

type Ctx = { params: Promise<{ projectId: string }> };

/** Issues a short-lived ticket that lets the browser join this project's realtime room. */
export const POST = withErrorHandling(async (_req, { params }: Ctx) => {
  if (!isRealtimeEnabled()) throw new HttpError(503, "Realtime is not configured");
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  const project = await getAccessibleProject(projectId, user._id);
  const token = await createRealtimeTicket(project._id.toString(), {
    id: user._id.toString(),
    name: user.name,
    imageUrl: user.imageUrl ?? null,
  });
  return NextResponse.json({ token }, { headers: { "cache-control": "no-store" } });
});
