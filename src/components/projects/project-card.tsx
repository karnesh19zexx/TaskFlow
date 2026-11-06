import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatarStack } from "@/components/user-avatar";
import { formatRelative } from "@/lib/format";
import type { ProjectDTO } from "@/types";

export function ProjectCard({ project, currentUserId }: { project: ProjectDTO; currentUserId: string }) {
  const { todo, in_progress, done } = project.taskCounts;
  const total = todo + in_progress + done;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Link href={`/projects/${project.id}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{project.name}</CardTitle>
            {project.owner.id === currentUserId && <Badge variant="secondary">Owner</Badge>}
          </div>
          <CardDescription className="line-clamp-2 min-h-10">
            {project.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {done}/{total} tasks done
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <UserAvatarStack users={project.members} />
            <span className="text-xs text-muted-foreground">Updated {formatRelative(project.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
