import type { Types } from "mongoose";
import type { TaskPriority, TaskStatus } from "@/lib/constants";
import type { ProjectDTO, TaskCounts, TaskDTO, UserDTO } from "@/types";

export interface LeanUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  imageUrl?: string | null;
}

export interface LeanProject {
  _id: Types.ObjectId;
  name: string;
  description: string;
  owner: LeanUser;
  members: LeanUser[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeanTask {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignee: LeanUser | null;
  createdBy: LeanUser;
  createdAt: Date;
  updatedAt: Date;
}

export const emptyTaskCounts = (): TaskCounts => ({ todo: 0, in_progress: 0, done: 0 });

export function toUserDTO(user: LeanUser): UserDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl ?? null,
  };
}

export function toProjectDTO(project: LeanProject, taskCounts = emptyTaskCounts()): ProjectDTO {
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    owner: toUserDTO(project.owner),
    members: project.members.map(toUserDTO),
    taskCounts,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function toTaskDTO(task: LeanTask): TaskDTO {
  return {
    id: task._id.toString(),
    projectId: task.project.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    assignee: task.assignee ? toUserDTO(task.assignee) : null,
    createdBy: toUserDTO(task.createdBy),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
