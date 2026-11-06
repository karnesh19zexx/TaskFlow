import { CalendarDays } from "lucide-react";
import { formatDueDate, getDueState } from "@/lib/format";
import { cn } from "@/lib/utils";

const DUE_STYLES = {
  overdue: "text-red-600 dark:text-red-400",
  today: "text-amber-600 dark:text-amber-400",
  soon: "text-foreground",
  later: "text-muted-foreground",
};

export function DueDate({ date, done }: { date: string; done: boolean }) {
  const state = getDueState(date);
  return (
    <span
      className={cn("flex items-center gap-1 text-xs", done ? "text-muted-foreground" : DUE_STYLES[state])}
      title={state === "overdue" && !done ? "Overdue" : "Due date"}
    >
      <CalendarDays className="size-3.5" />
      {state === "today" && !done ? "Today" : formatDueDate(date)}
    </span>
  );
}
