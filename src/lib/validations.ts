import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const projectFields = {
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().trim().max(1000, "Description is too long"),
};

export const createProjectSchema = z.object(projectFields).partial().required({ name: true });
export const updateProjectSchema = z.object(projectFields).partial();

const taskFields = {
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(5000, "Description is too long"),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.iso.date("Use YYYY-MM-DD").nullable(),
  assigneeId: objectIdSchema.nullable(),
};

export const createTaskSchema = z.object(taskFields).partial().required({ title: true });
export const updateTaskSchema = z.object(taskFields).partial();

export const addMemberSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
