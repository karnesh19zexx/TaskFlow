"use client";

import { UserAvatarStack } from "@/components/user-avatar";
import type { RealtimeStatus } from "@/hooks/use-project-realtime";
import type { PresenceUser } from "@/lib/realtime-events";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<Exclude<RealtimeStatus, "disabled">, { label: string; dot: string }> = {
  live: { label: "Live", dot: "bg-emerald-500" },
  connecting: { label: "Connecting", dot: "bg-amber-500" },
  offline: { label: "Reconnecting", dot: "bg-red-500" },
};

export function RealtimeIndicator({
  status,
  presence,
  currentUserId,
}: {
  status: RealtimeStatus;
  presence: PresenceUser[];
  currentUserId: string;
}) {
  if (status === "disabled") return null;
  const { label, dot } = STATUS_COPY[status];
  const others = presence.filter((u) => u.id !== currentUserId);

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      {status === "live" && others.length > 0 && (
        <div className="flex items-center gap-2" title={`Also viewing: ${others.map((u) => u.name).join(", ")}`}>
          <UserAvatarStack users={others.map((u) => ({ ...u, email: "" }))} max={3} />
          <span className="hidden text-xs text-muted-foreground lg:inline">{others.length} viewing</span>
        </div>
      )}
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="relative flex size-2">
          {status === "live" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", dot)} />}
          <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
        </span>
        {label}
      </span>
    </div>
  );
}
