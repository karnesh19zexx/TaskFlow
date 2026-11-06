import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import { User, type UserDocument } from "@/models/user";
import { unauthorized } from "@/server/errors";

/**
 * Resolves the signed-in Clerk user to our own User document, creating it on first visit
 * (lazy sync, so no webhook is required). Deduplicated per request via React cache().
 */
export const getCurrentUser = cache(async (): Promise<UserDocument> => {
  const { userId } = await auth();
  if (!userId) throw unauthorized();

  await connectToDatabase();
  const existing = await User.findOne({ clerkId: userId }).lean<UserDocument>();
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) throw unauthorized();

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email.split("@")[0] ||
    "TaskFlow user";

  const created = await User.findOneAndUpdate(
    { clerkId: userId },
    { $setOnInsert: { clerkId: userId, email, name, imageUrl: clerkUser.imageUrl ?? null } },
    { upsert: true, returnDocument: "after" },
  ).lean<UserDocument>();

  if (!created) throw unauthorized();
  return created;
});

/** For pages: sends signed-out visitors to sign-in instead of throwing. */
export async function requireUser(): Promise<UserDocument> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return getCurrentUser();
}
