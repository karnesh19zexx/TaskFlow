import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CalendarClock, FolderKanban, Users, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: FolderKanban, title: "Projects & boards", text: "Organize work into projects with a clear Todo → In Progress → Done board." },
  { icon: Users, title: "Built for teams", text: "Invite teammates, assign tasks, and always know who owns what." },
  { icon: CalendarClock, title: "Priorities & deadlines", text: "Set priority and due dates so overdue work never slips through." },
  { icon: Zap, title: "Real-time collaboration", text: "See teammates' changes and who's online instantly, without refreshing." },
];

const PREVIEW = [
  { label: "Todo", dot: "bg-slate-400", tasks: ["Write onboarding copy", "Audit color tokens"] },
  { label: "In Progress", dot: "bg-blue-500", tasks: ["Design pricing page"] },
  { label: "Done", dot: "bg-emerald-500", tasks: ["Set up CI pipeline", "Kickoff meeting"] },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" className="hidden sm:inline-flex" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="mx-auto max-w-3xl py-20 text-center sm:py-28">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Plan, track, and ship work together.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            TaskFlow is a clean, modern task manager for teams. Create projects, assign tasks, and keep
            everyone moving in the same direction.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-11 px-6" asChild>
              <Link href="/sign-up">Start for free</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6" asChild>
              <Link href="/sign-in">I have an account</Link>
            </Button>
          </div>
        </section>

        <section aria-hidden className="mx-auto max-w-4xl rounded-2xl border bg-background p-4 shadow-xl sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {PREVIEW.map((column) => (
              <div key={column.label} className="rounded-xl bg-muted/60 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <span className={`size-2 rounded-full ${column.dot}`} />
                  {column.label}
                </div>
                <div className="grid gap-2">
                  {column.tasks.map((task) => (
                    <div key={task} className="rounded-lg border bg-background px-3 py-2.5 text-sm shadow-xs">
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 py-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="grid gap-2">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
                <Icon className="size-5" />
              </span>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with Next.js, MongoDB & Clerk.
      </footer>
    </div>
  );
}
