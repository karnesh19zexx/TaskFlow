"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar, UserAvatarStack } from "@/components/user-avatar";
import { api, getErrorMessage } from "@/lib/api-client";
import type { ProjectDTO } from "@/types";

export function MembersDialog({ project, isOwner }: { project: ProjectDTO; isOwner: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setPending("add");
    try {
      await api(`/api/projects/${project.id}/members`, { method: "POST", body: { email } });
      toast.success("Member added");
      setEmail("");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  }

  async function removeMember(memberId: string) {
    setPending(memberId);
    try {
      await api(`/api/projects/${project.id}/members/${memberId}`, { method: "DELETE" });
      toast.success("Member removed");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 pl-1.5">
          <UserAvatarStack users={project.members} max={3} />
          <span>
            {project.members.length} {project.members.length === 1 ? "member" : "members"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project members</DialogTitle>
          <DialogDescription>
            Members can view, create, and update tasks, and can be assigned to them.
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <form onSubmit={addMember} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              aria-label="Member email"
              required
            />
            <Button type="submit" disabled={pending === "add"}>
              <UserPlus /> Add
            </Button>
          </form>
        )}

        <ul className="divide-y rounded-lg border">
          {project.members.map((member) => {
            const memberIsOwner = member.id === project.owner.id;
            return (
              <li key={member.id} className="flex items-center gap-3 px-3 py-2.5">
                <UserAvatar user={member} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                {memberIsOwner ? (
                  <Badge variant="secondary">Owner</Badge>
                ) : (
                  isOwner && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${member.name}`}
                      disabled={pending === member.id}
                      onClick={() => removeMember(member.id)}
                    >
                      <X />
                    </Button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
