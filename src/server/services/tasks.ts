import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { objectIdSchema, type CreateTaskInput, type UpdateTaskInput } from "@/lib/validations";
import { Project } from "@/models/project";
import { Task } from "@/models/task";
import { badRequest, forbidden, notFound } from "@/server/errors";
import { toTaskDTO, type LeanTask } from "@/server/serializers";
import { getAccessibleProject, isProjectMember, isProjectOwner } from "@/server/services/projects";
import type { AssignedTaskDTO, TaskDTO } from "@/types";

const USER_FIELDS = "name email imageUrl";

const toDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00.000Z`) : value === null ? null : undefined;

async function loadTask(taskId: string) {
  return Task.findById(taskId)
    .populate("assignee", USER_FIELDS)
    .populate("createdBy", USER_FIELDS)
    .lean<LeanTask>();
}

async function touchProject(projectId: Types.ObjectId | string) {
  await Project.updateOne({ _id: projectId }, { $currentDate: { updatedAt: true } });
}

export async function listTasksForProject(projectId: string, userId: Types.ObjectId): Promise<TaskDTO[]> {
  const project = await getAccessibleProject(projectId, userId);
  const tasks = await Task.find({ project: project._id })
    .populate("assignee", USER_FIELDS)
    .populate("createdBy", USER_FIELDS)
    .sort({ createdAt: -1 })
    .lean<LeanTask[]>();
  return tasks.map(toTaskDTO);
}

export async function listTasksAssignedToUser(userId: Types.ObjectId, limit = 8): Promise<AssignedTaskDTO[]> {
  await connectToDatabase();
  const tasks = await Task.find({ assignee: userId, status: { $ne: "done" } })
    .populate("assignee", USER_FIELDS)
    .populate("createdBy", USER_FIELDS)
    .populate("project", "name")
    .sort({ dueDate: 1, createdAt: -1 })
    .limit(limit)
    .lean<(Omit<LeanTask, "project"> & { project: { _id: Types.ObjectId; name: string } })[]>();
  return tasks.map((task) => ({
    ...toTaskDTO({ ...task, project: task.project._id }),
    projectName: task.project.name,
  }));
}

export async function createTask(projectId: string, userId: Types.ObjectId, input: CreateTaskInput) {
  const project = await getAccessibleProject(projectId, userId);
  if (input.assigneeId && !isProjectMember(project, input.assigneeId)) {
    throw badRequest("Tasks can only be assigned to project members");
  }

  const { assigneeId, dueDate, ...rest } = input;
  const task = await Task.create({
    ...rest,
    project: project._id,
    assignee: assigneeId ?? null,
    dueDate: toDate(dueDate) ?? null,
    createdBy: userId,
  });
  await touchProject(project._id);
  return toTaskDTO((await loadTask(task._id.toString()))!);
}

async function getAccessibleTask(taskId: string, userId: Types.ObjectId) {
  if (!objectIdSchema.safeParse(taskId).success) throw notFound("Task");
  await connectToDatabase();
  const task = await Task.findById(taskId).select("project createdBy").lean<{
    _id: Types.ObjectId;
    project: Types.ObjectId;
    createdBy: Types.ObjectId;
  }>();
  if (!task) throw notFound("Task");
  try {
    const project = await getAccessibleProject(task.project.toString(), userId);
    return { task, project };
  } catch {
    throw notFound("Task");
  }
}

export async function updateTask(taskId: string, userId: Types.ObjectId, input: UpdateTaskInput) {
  const { project } = await getAccessibleTask(taskId, userId);
  if (input.assigneeId && !isProjectMember(project, input.assigneeId)) {
    throw badRequest("Tasks can only be assigned to project members");
  }

  const { assigneeId, dueDate, ...rest } = input;
  const update: Record<string, unknown> = { ...rest };
  if (assigneeId !== undefined) update.assignee = assigneeId;
  if (dueDate !== undefined) update.dueDate = toDate(dueDate);

  await Task.updateOne({ _id: taskId }, { $set: update }, { runValidators: true });
  await touchProject(project._id);
  return toTaskDTO((await loadTask(taskId))!);
}

/** Members can edit any task; only the task creator or the project owner can delete it. */
export async function deleteTask(taskId: string, userId: Types.ObjectId) {
  const { task, project } = await getAccessibleTask(taskId, userId);
  if (!task.createdBy.equals(userId) && !isProjectOwner(project, userId)) {
    throw forbidden("Only the task creator or project owner can delete this task");
  }
  await Task.deleteOne({ _id: taskId });
  await touchProject(project._id);
}
