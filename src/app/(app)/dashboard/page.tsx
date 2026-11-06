import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, FolderKanban, Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { DueDate } from "@/components/tasks/due-date";
import { requireUser } from "@/server/current-user";
import { listProjectsForUser } from "@/server/services/projects";
import { listTasksAssignedToUser } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [projects, assignedTasks] = await Promise.all([
    listProjectsForUser(user._id),
    listTasksAssignedToUser(user._id),
  ]);

  const totals = projects.reduce(
    (acc, p) => ({
      todo: acc.todo + p.taskCounts.todo,
      in_progress: acc.in_progress + p.taskCounts.in_progress,
      done: acc.done + p.taskCounts.done,
    }),
    { todo: 0, in_progress: 0, done: 0 },
  );

  const stats = [
    { label: "Projects", value: projects.length, icon: FolderKanban },
    { label: "Todo", value: totals.todo, icon: CircleDashed },
    { label: "In progress", value: totals.in_progress, icon: Timer },
    { label: "Completed", value: totals.done, icon: CheckCircle2 },
  ];

  const newProjectButton = (
    <Button>
      <Plus /> New project
    </Button>
  );

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening across your projects.</p>
        </div>
        <ProjectFormDialog trigger={newProjectButton} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="py-4">
            <CardContent className="flex items-center justify-between px-4">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
              </div>
              <Icon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="grid content-start gap-4 lg:col-span-2">
          <h2 className="font-medium">Your projects</h2>
          {projects.length === 0 ? (
            <Card className="items-center border-dashed py-14 text-center">
              <CardContent className="grid justify-items-center gap-3">
                <FolderKanban className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No projects yet</p>
                  <p className="text-sm text-muted-foreground">Create your first project to start adding tasks.</p>
                </div>
                <ProjectFormDialog trigger={newProjectButton} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} currentUserId={user._id.toString()} />
              ))}
            </div>
          )}
        </section>

        <section className="grid content-start gap-4">
          <h2 className="font-medium">Assigned to you</h2>
          <Card className="py-2">
            {assignedTasks.length === 0 ? (
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nothing assigned to you right now.
              </CardContent>
            ) : (
              <ul className="divide-y">
                {assignedTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="grid gap-1 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-medium">{task.title}</span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">{task.projectName}</span>
                        {task.dueDate && <DueDate date={task.dueDate} done={false} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
