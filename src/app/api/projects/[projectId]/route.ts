import { NextResponse } from "next/server";
import { parseBody, withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { deleteProject, getProjectForUser, updateProject } from "@/server/services/projects";
import { updateProjectSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (_req, { params }: Ctx) => {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  return NextResponse.json(await getProjectForUser(projectId, user._id));
});

export const PATCH = withErrorHandling(async (req, { params }: Ctx) => {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  const input = await parseBody(req, updateProjectSchema);
  return NextResponse.json(await updateProject(projectId, user._id, input));
});

export const DELETE = withErrorHandling(async (_req, { params }: Ctx) => {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  await deleteProject(projectId, user._id);
  return new NextResponse(null, { status: 204 });
});
