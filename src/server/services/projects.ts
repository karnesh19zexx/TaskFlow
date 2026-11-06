import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import type { TaskStatus } from "@/lib/constants";
import { objectIdSchema, type CreateProjectInput, type UpdateProjectInput } from "@/lib/validations";
import { Project } from "@/models/project";
import { Task } from "@/models/task";
import { findUserByEmail } from "@/server/current-user";
import { HttpError, badRequest, forbidden, notFound } from "@/server/errors";
import { emptyTaskCounts, toProjectDTO, type LeanProject, type LeanUser } from "@/server/serializers";
import type { ProjectDTO, TaskCounts } from "@/types";

const USER_FIELDS = "name email imageUrl";

function findProjects(filter: Record<string, unknown>) {
  return Project.find(filter)
    .populate("owner", USER_FIELDS)
    .populate("members", USER_FIELDS)
    .sort({ updatedAt: -1 })
    .lean<LeanProject[]>();
}

async function countTasksByProject(projectIds: Types.ObjectId[]) {
  const rows = await Task.aggregate<{ _id: { project: Types.ObjectId; status: TaskStatus }; count: number }>([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: { project: "$project", status: "$status" }, count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, TaskCounts>();
  for (const { _id, count } of rows) {
    const key = _id.project.toString();
    const entry = counts.get(key) ?? emptyTaskCounts();
    entry[_id.status] = count;
    counts.set(key, entry);
  }
  return counts;
}

const isSameId = (a: Types.ObjectId | LeanUser, b: Types.ObjectId) =>
  ("_id" in a ? a._id : a).equals(b);

export async function listProjectsForUser(userId: Types.ObjectId): Promise<ProjectDTO[]> {
  await connectToDatabase();
  const projects = await findProjects({ members: userId });
  const counts = await countTasksByProject(projects.map((p) => p._id));
  return projects.map((p) => toProjectDTO(p, counts.get(p._id.toString())));
}

/** Loads a project the user can access. Non-members get 404 so project ids don't leak. */
export async function getAccessibleProject(projectId: string, userId: Types.ObjectId) {
  if (!objectIdSchema.safeParse(projectId).success) throw notFound("Project");
  await connectToDatabase();
  const project = await Project.findById(projectId)
    .populate("owner", USER_FIELDS)
    .populate("members", USER_FIELDS)
    .lean<LeanProject>();
  if (!project || !project.members.some((m) => isSameId(m, userId))) throw notFound("Project");
  return project;
}

async function getOwnedProject(projectId: string, userId: Types.ObjectId) {
  const project = await getAccessibleProject(projectId, userId);
  if (!isSameId(project.owner, userId)) throw forbidden("Only the project owner can do that");
  return project;
}

export async function getProjectForUser(projectId: string, userId: Types.ObjectId) {
  const project = await getAccessibleProject(projectId, userId);
  const counts = await countTasksByProject([project._id]);
  return toProjectDTO(project, counts.get(project._id.toString()));
}

export async function createProject(userId: Types.ObjectId, input: CreateProjectInput) {
  await connectToDatabase();
  const project = await Project.create({ ...input, owner: userId, members: [userId] });
  return getProjectForUser(project._id.toString(), userId);
}

export async function updateProject(projectId: string, userId: Types.ObjectId, input: UpdateProjectInput) {
  await getOwnedProject(projectId, userId);
  await Project.updateOne({ _id: projectId }, { $set: input });
  return getProjectForUser(projectId, userId);
}

export async function deleteProject(projectId: string, userId: Types.ObjectId) {
  await getOwnedProject(projectId, userId);
  // Project first: once it is gone, access checks reject new task writes (see createTask), and any
  // tasks left behind by a failed cleanup are unreachable and excluded from every read.
  await Project.deleteOne({ _id: projectId });
  await Task.deleteMany({ project: projectId });
}

export async function addProjectMember(projectId: string, userId: Types.ObjectId, email: string) {
  const project = await getOwnedProject(projectId, userId);
  const member = await findUserByEmail(email);
  if (!member) {
    throw new HttpError(404, "No TaskFlow account uses that email. Ask them to sign up first.");
  }
  if (project.members.some((m) => isSameId(m, member._id))) {
    throw badRequest("That user is already a member of this project");
  }
  await Project.updateOne({ _id: projectId }, { $addToSet: { members: member._id } });
  return getProjectForUser(projectId, userId);
}

export async function removeProjectMember(projectId: string, userId: Types.ObjectId, memberId: string) {
  const project = await getOwnedProject(projectId, userId);
  if (!objectIdSchema.safeParse(memberId).success) throw notFound("Member");
  const memberObjectId = new Types.ObjectId(memberId);
  if (isSameId(project.owner, memberObjectId)) throw badRequest("The project owner can't be removed");
  if (!project.members.some((m) => isSameId(m, memberObjectId))) throw notFound("Member");

  await Project.updateOne({ _id: projectId }, { $pull: { members: memberObjectId } });
  await Task.updateMany({ project: projectId, assignee: memberObjectId }, { $set: { assignee: null } });
  return getProjectForUser(projectId, userId);
}

export function isProjectMember(project: LeanProject, userId: Types.ObjectId | string) {
  const id = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  return project.members.some((m) => isSameId(m, id));
}

export function isProjectOwner(project: LeanProject, userId: Types.ObjectId) {
  return isSameId(project.owner, userId);
}
