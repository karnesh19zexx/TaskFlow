import type { TaskPriority, TaskStatus } from "@/lib/constants";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
}

export type TaskCounts = Record<TaskStatus, number>;

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  owner: UserDTO;
  members: UserDTO[];
  taskCounts: TaskCounts;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDTO {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: UserDTO | null;
  createdBy: UserDTO;
  createdAt: string;
  updatedAt: string;
}

export interface AssignedTaskDTO extends TaskDTO {
  projectName: string;
}
