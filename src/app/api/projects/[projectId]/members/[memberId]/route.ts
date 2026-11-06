import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { removeProjectMember } from "@/server/services/projects";

type Ctx = { params: Promise<{ projectId: string; memberId: string }> };

export const DELETE = withErrorHandling(async (_req, { params }: Ctx) => {
  const [{ projectId, memberId }, user] = await Promise.all([params, getCurrentUser()]);
  return NextResponse.json(await removeProjectMember(projectId, user._id, memberId));
});
