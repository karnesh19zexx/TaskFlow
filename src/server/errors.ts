export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = () => new HttpError(401, "You must be signed in");
export const forbidden = (message = "You don't have permission to do that") =>
  new HttpError(403, message);
export const notFound = (resource = "Resource") => new HttpError(404, `${resource} not found`);
