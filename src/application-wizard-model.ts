export type Permission = { code: string; description: string };
export type Attempt = { id: string; name: string };
export type Draft = {
  version: 1;
  name: string;
  callbacks: string[];
  permissions: string[];
};
export type Step = 0 | 1 | 2 | 3;
export const stepNames = [
  "Dados básicos",
  "Integração",
  "Permissões",
  "Revisão",
] as const;

export function readAttempt(key: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    return typeof record.id === "string" && typeof record.name === "string"
      ? { id: record.id, name: record.name }
      : null;
  } catch {
    return null;
  }
}

export function readDraft(key: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== 1 ||
      typeof record.name !== "string" ||
      !Array.isArray(record.callbacks) ||
      !Array.isArray(record.permissions)
    )
      return null;
    return {
      version: 1,
      name: record.name.slice(0, 255),
      callbacks: Array.from(
        new Set(
          record.callbacks.filter(
            (value): value is string =>
              typeof value === "string" && validCallback(value) === null,
          ),
        ),
      ).slice(0, 5),
      permissions: record.permissions.filter(
        (value): value is string => typeof value === "string",
      ),
    };
  } catch {
    return null;
  }
}

export function validCallback(value: string): string | null {
  try {
    const url = new URL(value);
    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(
      url.hostname.toLowerCase(),
    );
    if (
      (isLoopback
        ? url.protocol !== "http:" || !url.port
        : url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return isLoopback
        ? "Para teste local, use http://localhost, 127.0.0.1 ou [::1] com porta; sem parâmetros, fragmento ou credenciais."
        : "Use uma URL HTTPS pública, sem parâmetros, fragmento ou credenciais.";
    return null;
  } catch {
    return "Informe uma URL HTTPS válida.";
  }
}
