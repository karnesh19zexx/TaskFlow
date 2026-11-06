import { NextResponse } from "next/server";
import { parseBody, withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { createProject, listProjectsForUser } from "@/server/services/projects";
import { createProjectSchema } from "@/lib/validations";

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  return NextResponse.json(await listProjectsForUser(user._id));
});

export const POST = withErrorHandling(async (req) => {
  const user = await getCurrentUser();
  const input = await parseBody(req, createProjectSchema);
  return NextResponse.json(await createProject(user._id, input), { status: 201 });
});
