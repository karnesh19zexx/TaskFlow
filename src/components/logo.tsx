import Link from "next/link";
import { ListChecks } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ListChecks className="size-4" />
      </span>
      TaskFlow
    </Link>
  );
}
