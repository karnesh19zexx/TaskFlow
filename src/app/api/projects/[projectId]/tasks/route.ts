import { NextResponse } from "next/server";
import { parseBody, withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { createTask, listTasksForProject } from "@/server/services/tasks";
import { createTaskSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (_req, { params }: Ctx) => {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  return NextResponse.json(await listTasksForProject(projectId, user._id));
});

export const POST = withErrorHandling(async (req, { params }: Ctx) => {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  const input = await parseBody(req, createTaskSchema);
  return NextResponse.json(await createTask(projectId, user._id, input), { status: 201 });
});
