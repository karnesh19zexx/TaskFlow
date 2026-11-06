"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
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
import { RealtimeIndicator } from "@/components/tasks/realtime-indicator";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import { api, getErrorMessage } from "@/lib/api-client";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import type { RealtimeEvent } from "@/lib/realtime-events";
import { cn } from "@/lib/utils";
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

/** Applies a server copy of a task unless we already hold a newer version (e.g. a late echo). */
function mergeTask(tasks: TaskDTO[], incoming: TaskDTO) {
  const existing = tasks.find((t) => t.id === incoming.id);
  if (!existing) return [incoming, ...tasks];
  if (existing.updatedAt > incoming.updatedAt) return tasks;
  return tasks.map((t) => (t.id === incoming.id ? incoming : t));
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
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const router = useRouter();
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const sensors = useSensors(
    // Small movement/hold thresholds keep clicks (open editor) and touch scrolling working.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      const fromMe = event.actorId === currentUserId;
      const actor = members.find((m) => m.id === event.actorId)?.name ?? "A teammate";
      switch (event.type) {
        case "task.created":
        case "task.updated": {
          const previous = tasksRef.current.find((t) => t.id === event.task.id);
          setTasks((prev) => mergeTask(prev, event.task));
          if (fromMe) break;
          if (event.type === "task.created") toast(`${actor} added “${event.task.title}”`);
          else if (previous && previous.status !== event.task.status)
            toast(`${actor} moved “${event.task.title}” to ${STATUS_LABELS[event.task.status]}`);
          break;
        }
        case "task.deleted": {
          const removed = tasksRef.current.find((t) => t.id === event.taskId);
          setTasks((prev) => prev.filter((t) => t.id !== event.taskId));
          if (!fromMe && removed) toast(`${actor} deleted “${removed.title}”`);
          break;
        }
        case "project.updated":
          router.refresh();
          break;
        case "project.members_changed":
          if (event.removedUserId === currentUserId) {
            toast.error("You were removed from this project");
            router.push("/dashboard");
          } else {
            router.refresh();
          }
          break;
        case "project.deleted":
          if (!fromMe) {
            toast.error(`${actor} deleted this project`);
            router.push("/dashboard");
          }
          break;
      }
    },
    [currentUserId, members, router],
  );

  const resync = useCallback(async () => {
    try {
      setTasks(await api<TaskDTO[]>(`/api/projects/${projectId}/tasks`));
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [projectId, router]);

  const realtime = useProjectRealtime(projectId, { onEvent: handleRealtimeEvent, onResync: resync });

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

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTaskId(null);
    const task = tasks.find((t) => t.id === active.id);
    const status = over?.id as TaskStatus | undefined;
    if (task && status && status !== task.status) changeStatus(task, status);
  }

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : undefined;
  const cardProps = (task: TaskDTO) => ({
    task,
    canDelete: isOwner || task.createdBy.id === currentUserId,
    onEdit: () => setEditor({ open: true, task }),
    onDelete: () => setTaskToDelete(task),
    onStatusChange: (s: TaskStatus) => changeStatus(task, s),
  });

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
        <div className="ml-auto flex items-center gap-3">
          <RealtimeIndicator status={realtime.status} presence={realtime.presence} currentUserId={currentUserId} />
          <Button onClick={() => setEditor({ open: true, defaultStatus: "todo" })}>
            <Plus /> New task
          </Button>
        </div>
      </div>

      <DndContext
        id={`board-${projectId}`}
        sensors={sensors}
        onDragStart={({ active }) => setActiveTaskId(String(active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        {/* Columns scroll horizontally with snap on small screens and become a 3-column grid on desktop. */}
        <div className="-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible">
          {columns.map(({ status, tasks: columnTasks }) => (
            <BoardColumn key={status} status={status} count={columnTasks.length} onAdd={() => setEditor({ open: true, defaultStatus: status })}>
              {columnTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                  {hasFilters ? "No matching tasks" : "Drop tasks here"}
                </p>
              ) : (
                columnTasks.map((task) => <DraggableTaskCard key={task.id} {...cardProps(task)} />)
              )}
            </BoardColumn>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && <TaskCard {...cardProps(activeTask)} isOverlay />}
        </DragOverlay>
      </DndContext>

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

function BoardColumn({
  status,
  count,
  onAdd,
  children,
}: {
  status: TaskStatus;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABELS[status]}
      className={cn(
        "grid w-[85%] min-w-0 shrink-0 snap-center content-start gap-3 rounded-xl bg-muted/60 p-3 transition-colors sm:w-80 md:w-auto md:min-h-64",
        isOver && "bg-muted ring-2 ring-primary/30",
      )}
    >
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <span className={`size-2 rounded-full ${STATUS_DOTS[status]}`} />
          {STATUS_LABELS[status]}
          <span className="text-muted-foreground tabular-nums">{count}</span>
        </h2>
        <Button variant="ghost" size="icon-xs" aria-label={`Add task to ${STATUS_LABELS[status]}`} onClick={onAdd}>
          <Plus />
        </Button>
      </header>
      {children}
    </section>
  );
}

function DraggableTaskCard(props: React.ComponentProps<typeof TaskCard>) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: props.task.id });
  return <TaskCard {...props} ref={setNodeRef} dragProps={{ ...attributes, ...listeners }} isDragging={isDragging} />;
}
