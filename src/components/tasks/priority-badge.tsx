import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="secondary" className={cn("shrink-0 border-transparent", PRIORITY_STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
