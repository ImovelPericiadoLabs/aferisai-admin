export type SafeField = { label: string; value: string };

const SAFE_FIELDS: { key: string; label: string }[] = [
  { key: "type", label: "Tipo" },
  { key: "project_id", label: "Projeto" },
  { key: "client_email", label: "Conta" },
];

export function summarizeServiceAccount(
  text: string,
): { ok: true; fields: SafeField[] } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "O arquivo não contém JSON válido." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return { ok: false, message: "O arquivo não parece uma conta de serviço." };
  const record = parsed as Record<string, unknown>;
  const fields: SafeField[] = [];
  for (const { key, label } of SAFE_FIELDS) {
    const value = record[key];
    if (typeof value === "string" && value !== "")
      fields.push({ label, value });
  }
  if (
    typeof record.project_id !== "string" &&
    typeof record.client_email !== "string"
  )
    return { ok: false, message: "O arquivo não parece uma conta de serviço." };
  return { ok: true, fields };
}

export function textPreview(
  text: string,
  maxLines = 8,
  maxChars = 600,
): { text: string; truncated: boolean } {
  const lines = text.split("\n");
  let result = lines.slice(0, maxLines).join("\n");
  let truncated = lines.length > maxLines;
  if (result.length > maxChars) {
    result = result.slice(0, maxChars);
    truncated = true;
  }
  return { text: result, truncated };
}
