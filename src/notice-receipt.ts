export async function receiptReference(messageId: string): Promise<string> {
  const normalized = messageId.trim().replace(/^<|>$/g, "").toLowerCase();
  if (!/^[^\s<>@]+@[^\s<>@]+$/u.test(normalized)) {
    throw new Error(
      "Informe o Message-ID completo exibido em ‘Mostrar original’ no e-mail.",
    );
  }
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `smtp.sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}
