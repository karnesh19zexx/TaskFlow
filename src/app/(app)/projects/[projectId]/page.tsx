import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MembersDialog } from "@/components/projects/members-dialog";
import { ProjectActions } from "@/components/projects/project-actions";
import { TaskBoard } from "@/components/tasks/task-board";
import { HttpError } from "@/server/errors";
import { requireUser } from "@/server/current-user";
import { getProjectForUser } from "@/server/services/projects";
import { listTasksForProject } from "@/server/services/tasks";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();

  const data = await Promise.all([
    getProjectForUser(projectId, user._id),
    listTasksForProject(projectId, user._id),
  ]).catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  const [project, tasks] = data;

  const currentUserId = user._id.toString();
  const isOwner = project.owner.id === currentUserId;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link
          href="/dashboard"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="mt-1 max-w-2xl text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MembersDialog project={project} isOwner={isOwner} />
            {isOwner && <ProjectActions project={project} />}
          </div>
        </div>
      </div>

      <TaskBoard
        // Remount when membership changes so tasks unassigned server-side are reloaded.
        key={project.members.map((m) => m.id).join()}
        projectId={project.id}
        initialTasks={tasks}
        members={project.members}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
    </div>
  );
}
