import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth is enforced where data is accessed (pages via requireUser, API routes via getCurrentUser),
// so middleware only attaches Clerk's auth state to the request.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
