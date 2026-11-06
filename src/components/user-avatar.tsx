import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";
import type { UserDTO } from "@/types";

export function UserAvatar({ user, className }: { user: Pick<UserDTO, "name" | "imageUrl">; className?: string }) {
  return (
    <Avatar className={cn("size-7", className)} title={user.name}>
      {user.imageUrl && <AvatarImage src={user.imageUrl} alt={user.name} />}
      <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  );
}

export function UserAvatarStack({ users, max = 4 }: { users: UserDTO[]; max?: number }) {
  const visible = users.slice(0, max);
  const extra = users.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((user) => (
        <UserAvatar key={user.id} user={user} className="ring-2 ring-background" />
      ))}
      {extra > 0 && (
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
          +{extra}
        </span>
      )}
    </div>
  );
}
