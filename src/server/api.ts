import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, badRequest } from "@/server/errors";

type RouteHandler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<Response>;

export function withErrorHandling<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status },
        );
      }
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: z.flattenError(error).fieldErrors },
          { status: 400 },
        );
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return schema.parse(body);
}
