import { NextResponse } from "next/server";
import { parseBody, withErrorHandling } from "@/server/api";
import { getCurrentUser } from "@/server/current-user";
import { addProjectMember } from "@/server/services/projects";
import { addMemberSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ projectId: string }> };

export const POST = withErrorHandling(async (req, { params }: Ctx) => {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  const { email } = await parseBody(req, addMemberSchema);
  return NextResponse.json(await addProjectMember(projectId, user._id, email), { status: 201 });
});
