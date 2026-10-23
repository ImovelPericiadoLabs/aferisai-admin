import type { OnrEndpoint } from "./api";

export const OFFICIAL_ORIGIN = "https://ridigital.org.br";
export const WORKER_EXAMPLE =
  "https://onr-ridigital-proxy.sec-devchamps.workers.dev";

const WORKER_SUFFIX = ".sec-devchamps.workers.dev";
const KEY_MIN = 24;

type OriginCheck = { ok: true; origin: string } | { ok: false; error: string };

/** Mirrors the backend rule (validate_proxy_origin): HTTPS, 443, a Worker host, nothing else. */
export function validateProxyOrigin(raw: string): OriginCheck {
  const text = raw.trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: "Informe um endereço completo, com https://." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use HTTPS." };
  if (url.username || url.password)
    return { ok: false, error: "O endereço não pode ter usuário ou senha." };
  if (url.port && url.port !== "443")
    return {
      ok: false,
      error: "Use a porta padrão 443, sem porta no endereço.",
    };
  if (
    !url.hostname.endsWith(WORKER_SUFFIX) ||
    url.hostname === WORKER_SUFFIX.slice(1)
  )
    return {
      ok: false,
      error: `O host deve ser um Worker em *${WORKER_SUFFIX}.`,
    };
  if (url.search || url.hash)
    return { ok: false, error: "Remova o parâmetro ou fragmento do endereço." };
  if (url.pathname !== "/")
    return { ok: false, error: "Use só a raiz do Worker, sem caminho." };
  return { ok: true, origin: `https://${url.hostname}` };
}

export type EndpointFormInput = {
  origin: string;
  key: string;
  keyConfigured: boolean;
  replaceKey: boolean;
};

export type EndpointFormCheck = {
  ok: boolean;
  errors: Partial<Record<"origin" | "key", string>>;
};

export function validateEndpointForm(
  input: EndpointFormInput,
): EndpointFormCheck {
  const errors: EndpointFormCheck["errors"] = {};
  const origin = validateProxyOrigin(input.origin);
  if (!origin.ok) errors.origin = origin.error;
  const needsKey = !input.keyConfigured || input.replaceKey;
  if (needsKey) {
    if (!input.key) errors.key = "A chave do Worker é obrigatória.";
    else if (input.key.length < KEY_MIN)
      errors.key = `A chave tem no mínimo ${KEY_MIN} caracteres.`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function endpointView(endpoint: OnrEndpoint) {
  const proxy = endpoint.mode === "proxy";
  return {
    title: proxy ? "Proxy protegido" : "Portal original",
    tone: proxy ? ("info" as const) : ("neutral" as const),
    key: proxy
      ? endpoint.proxy_key_configured
        ? "Guardada no cofre"
        : "Ausente"
      : "Não se aplica",
  };
}

export function changeSummary(
  current: OnrEndpoint,
  next: { origin: string; replaceKey: boolean; keyConfigured: boolean },
): { label: string; value: string }[] {
  const key = !next.keyConfigured
    ? "Será definida"
    : next.replaceKey
      ? "Será trocada"
      : "Mantida";
  return [
    { label: "De", value: current.origin },
    { label: "Para", value: next.origin },
    { label: "Chave", value: key },
  ];
}
