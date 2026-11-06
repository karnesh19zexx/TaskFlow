"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { api, getErrorMessage } from "@/lib/api-client";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import type { TaskDTO, UserDTO } from "@/types";

const STATUS_DOTS: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  done: "bg-emerald-500",
};

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

function compareTasks(a: TaskDTO, b: TaskDTO) {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

interface TaskBoardProps {
  projectId: string;
  initialTasks: TaskDTO[];
  members: UserDTO[];
  currentUserId: string;
  isOwner: boolean;
}

type EditorState = { open: boolean; task?: TaskDTO; defaultStatus?: TaskStatus };

export function TaskBoard({ projectId, initialTasks, members, currentUserId, isOwner }: TaskBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [taskToDelete, setTaskToDelete] = useState<TaskDTO | null>(null);

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = tasks.filter((task) => {
      if (q && !`${task.title} ${task.description}`.toLowerCase().includes(q)) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (assigneeFilter === "unassigned") return task.assignee === null;
      if (assigneeFilter !== "all") return task.assignee?.id === assigneeFilter;
      return true;
    });
    return TASK_STATUSES.map((status) => ({
      status,
      tasks: visible.filter((t) => t.status === status).sort(compareTasks),
    }));
  }, [tasks, query, priorityFilter, assigneeFilter]);

  const upsertTask = (saved: TaskDTO) =>
    setTasks((prev) => (prev.some((t) => t.id === saved.id) ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]));

  async function changeStatus(task: TaskDTO, status: TaskStatus) {
    upsertTask({ ...task, status });
    try {
      upsertTask(await api<TaskDTO>(`/api/tasks/${task.id}`, { method: "PATCH", body: { status } }));
    } catch (error) {
      upsertTask(task);
      toast.error(getErrorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!taskToDelete) return;
    const task = taskToDelete;
    setTaskToDelete(null);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Task deleted");
    } catch (error) {
      setTasks((prev) => [task, ...prev]);
      toast.error(getErrorMessage(error));
    }
  }

  const hasFilters = query !== "" || priorityFilter !== "all" || assigneeFilter !== "all";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="pl-8"
            aria-label="Search tasks"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as "all" | TaskPriority)}>
          <SelectTrigger className="w-36" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by assignee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value={currentUserId}>Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {members
              .filter((m) => m.id !== currentUserId)
              .map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setPriorityFilter("all");
              setAssigneeFilter("all");
            }}
          >
            Clear
          </Button>
        )}
        <Button className="ml-auto" onClick={() => setEditor({ open: true, defaultStatus: "todo" })}>
          <Plus /> New task
        </Button>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-3">
        {columns.map(({ status, tasks: columnTasks }) => (
          <section key={status} className="grid gap-3 rounded-xl bg-muted/60 p-3" aria-label={STATUS_LABELS[status]}>
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <span className={`size-2 rounded-full ${STATUS_DOTS[status]}`} />
                {STATUS_LABELS[status]}
                <span className="text-muted-foreground tabular-nums">{columnTasks.length}</span>
              </h2>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Add task to ${STATUS_LABELS[status]}`}
                onClick={() => setEditor({ open: true, defaultStatus: status })}
              >
                <Plus />
              </Button>
            </header>
            {columnTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                {hasFilters ? "No matching tasks" : "No tasks yet"}
              </p>
            ) : (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canDelete={isOwner || task.createdBy.id === currentUserId}
                  onEdit={() => setEditor({ open: true, task })}
                  onDelete={() => setTaskToDelete(task)}
                  onStatusChange={(s) => changeStatus(task, s)}
                />
              ))
            )}
          </section>
        ))}
      </div>

      <TaskFormDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
        projectId={projectId}
        members={members}
        task={editor.task}
        defaultStatus={editor.defaultStatus}
        onSaved={upsertTask}
      />

      <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{taskToDelete?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
