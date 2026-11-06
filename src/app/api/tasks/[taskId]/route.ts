import { NextResponse } from "next/server";
import { parseBody, withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { deleteTask, updateTask } from "@/server/services/tasks";
import { updateTaskSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ taskId: string }> };

export const PATCH = withErrorHandling(async (req, { params }: Ctx) => {
  const [{ taskId }, user] = await Promise.all([params, getCurrentUser()]);
  const input = await parseBody(req, updateTaskSchema);
  return NextResponse.json(await updateTask(taskId, user._id, input));
});

export const DELETE = withErrorHandling(async (_req, { params }: Ctx) => {
  const [{ taskId }, user] = await Promise.all([params, getCurrentUser()]);
  await deleteTask(taskId, user._id);
  return new NextResponse(null, { status: 204 });
});
