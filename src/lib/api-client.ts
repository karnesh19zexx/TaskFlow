export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = void>(
  url: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Something went wrong", res.status, data?.details);
  }
  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.details) {
    const first = Object.values(error.details).flat().find(Boolean);
    if (first) return first;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
