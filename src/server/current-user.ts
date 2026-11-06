import { cache } from "react";
import { auth, clerkClient, currentUser, type User as ClerkUser } from "@clerk/nextjs/server";
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

  return upsertUserFromClerk(clerkUser);
});

function primaryEmail(clerkUser: ClerkUser) {
  return (
    clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? ""
  ).toLowerCase();
}

/** Creates or refreshes our User document from Clerk, which is the source of truth for profiles. */
async function upsertUserFromClerk(clerkUser: ClerkUser): Promise<UserDocument> {
  const email = primaryEmail(clerkUser);
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email.split("@")[0] ||
    "TaskFlow user";

  await connectToDatabase();
  const user = await User.findOneAndUpdate(
    { clerkId: clerkUser.id },
    { $set: { email, name, imageUrl: clerkUser.imageUrl ?? null } },
    { upsert: true, returnDocument: "after" },
  ).lean<UserDocument>();
  if (!user) throw unauthorized();
  return user;
}

/**
 * Resolves an email to a TaskFlow user by asking Clerk who currently owns that verified address,
 * so a stale copy in MongoDB (e.g. after an email change) can never grant access to the wrong account.
 */
export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  const normalized = email.toLowerCase();
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: [normalized], limit: 10 });
  const owner = data.find((u) =>
    u.emailAddresses.some(
      (e) => e.emailAddress.toLowerCase() === normalized && e.verification?.status === "verified",
    ),
  );
  return owner ? upsertUserFromClerk(owner) : null;
}

/** For pages: sends signed-out visitors to sign-in instead of throwing. */
export async function requireUser(): Promise<UserDocument> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return getCurrentUser();
}
