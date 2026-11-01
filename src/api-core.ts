export type Problem = { status?: number; code?: string; detail?: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export const base = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export async function responseError(response: Response): Promise<ApiError> {
  let problem: Problem = {};
  try {
    problem = (await response.json()) as Problem;
  } catch {
    problem = {};
  }
  return new ApiError(
    response.status,
    problem.code || "REQUEST_FAILED",
    problem.detail || "Não foi possível concluir a solicitação.",
  );
}

export async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const eventsQuery = (cursor?: string) =>
  `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

export const managed = <T>(
  path: string,
  method: "PATCH" | "PUT" | "POST",
  body: unknown,
  csrfToken: string,
) =>
  request<T>(path, {
    method,
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
