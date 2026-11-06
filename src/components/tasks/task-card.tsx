"use client";

import { ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DueDate } from "@/components/tasks/due-date";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { UserAvatar } from "@/components/user-avatar";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/types";

interface TaskCardProps {
  task: TaskDTO;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
  ref?: React.Ref<HTMLDivElement>;
  /** Props from the drag-and-drop library (listeners and a11y attributes). */
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function TaskCard({
  task,
  canDelete,
  onEdit,
  onDelete,
  onStatusChange,
  ref,
  dragProps,
  isDragging,
  isOverlay,
}: TaskCardProps) {
  const done = task.status === "done";

  return (
    <div
      ref={ref}
      {...dragProps}
      role="button"
      tabIndex={0}
      aria-roledescription="draggable task"
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "group grid cursor-grab touch-manipulation gap-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-shadow select-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing",
        isDragging && "opacity-40",
        isOverlay && "rotate-2 cursor-grabbing shadow-lg ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm leading-snug font-medium", done && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="-mt-0.5 -mr-1 shrink-0 opacity-60 group-hover:opacity-100"
              aria-label={`Actions for ${task.title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
            {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onStatusChange(s)}>
                <ArrowRight /> {STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.dueDate && <DueDate date={task.dueDate} done={done} />}
        </div>
        {task.assignee ? (
          <UserAvatar user={task.assignee} className="size-6" />
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </div>
    </div>
  );
}
