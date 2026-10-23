import type {
  PartnerCredential,
  WebhookDelivery,
  WebhookEndpoint,
} from "./api";

const DAY_MS = 86_400_000;
const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
});

export type DayBucket = {
  key: string;
  label: string;
  delivered: number;
  problems: number;
  other: number;
  total: number;
};

/** One bucket per Sao Paulo day, oldest first, ending today. */
export function bucketDeliveries(
  items: WebhookDelivery[],
  days: number,
  now: number = Date.now(),
): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKey.format(new Date(now - offset * DAY_MS));
    const [, month, day] = key.split("-");
    buckets.push({
      key,
      label: `${day}/${month}`,
      delivered: 0,
      problems: 0,
      other: 0,
      total: 0,
    });
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const item of items) {
    const bucket = byKey.get(dayKey.format(new Date(item.created_at)));
    if (!bucket) continue;
    if (item.status === "delivered") bucket.delivered += 1;
    else if (item.status === "attempted" || item.status === "unknown")
      bucket.problems += 1;
    else bucket.other += 1;
    bucket.total += 1;
  }
  return buckets;
}

export type LatencyPoint = {
  id: string;
  ms: number;
  at: string;
  status: WebhookDelivery["status"];
};

export function latencySeries(
  items: WebhookDelivery[],
  limit: number,
): LatencyPoint[] {
  return items
    .filter(
      (item): item is WebhookDelivery & { duration_ms: number } =>
        item.duration_ms !== null,
    )
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .slice(-limit)
    .map((item) => ({
      id: item.id,
      ms: item.duration_ms,
      at: item.created_at,
      status: item.status,
    }));
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  if (diff < DAY_MS) return `há ${Math.floor(diff / 3_600_000)} h`;
  return `há ${Math.floor(diff / DAY_MS)} d`;
}

export type ReadinessStep = {
  id: "endpoint" | "tested" | "active" | "credential" | "permissions";
  label: string;
  hint: string;
  done: boolean;
  tab: "webhooks" | "credentials" | "access";
};

export function integrationReadiness(input: {
  endpoint: WebhookEndpoint | null;
  credentials: PartnerCredential[];
  deliveries: WebhookDelivery[];
  grantedCount: number;
}): { percent: number; steps: ReadinessStep[]; next: ReadinessStep | null } {
  const tested =
    input.endpoint?.status !== "suspended" &&
    (Boolean(input.endpoint?.last_successful_test_at) ||
      input.deliveries.some(
        (item) => item.is_test && item.status === "delivered",
      ));
  const steps: ReadinessStep[] = [
    {
      id: "endpoint",
      label: "Webhook cadastrado",
      hint: "Informe o endereço que receberá os eventos.",
      done: input.endpoint !== null,
      tab: "webhooks",
    },
    {
      id: "tested",
      label: "Webhook testado",
      hint: "Envie um teste assinado e confirme o recebimento.",
      done: tested,
      tab: "webhooks",
    },
    {
      id: "active",
      label: "Webhook ativo",
      hint: "Ative para receber eventos reais.",
      done: input.endpoint?.status === "active",
      tab: "webhooks",
    },
    {
      id: "credential",
      label: "Credencial ativa",
      hint: "Emita uma credencial para integrar seus sistemas.",
      done: input.credentials.some(
        (item) =>
          item.status === "active" &&
          !(item.expires_at && Date.parse(item.expires_at) <= Date.now()),
      ),
      tab: "credentials",
    },
    {
      id: "permissions",
      label: "Permissões concedidas",
      hint: "Conceda ao menos uma permissão à aplicação.",
      done: input.grantedCount > 0,
      tab: "access",
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  return {
    percent: Math.round((doneCount / steps.length) * 100),
    steps,
    next: steps.find((step) => !step.done) ?? null,
  };
}

const AREA_LABELS: Record<string, string> = {
  application: "Aplicação",
  analysis: "Análises",
  registry: "Registro",
};

export type PermissionGroup = {
  key: string;
  label: string;
  grantedCount: number;
  items: { code: string; description: string; granted: boolean }[];
};

export function groupPermissions(
  permissions: { code: string; description: string }[],
  granted: string[],
): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const permission of permissions) {
    const key = permission.code.split(/[:.]/)[0];
    const group = groups.get(key) ?? {
      key,
      label: AREA_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      grantedCount: 0,
      items: [],
    };
    const isGranted = granted.includes(permission.code);
    group.items.push({ ...permission, granted: isGranted });
    if (isGranted) group.grantedCount += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR"),
  );
}

export const MAX_REDIRECT_URIS = 5;

const HOST_PATTERN =
  /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

/** Mirrors the backend rules for callbacks so mistakes show up before saving. */
function redirectProblem(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Informe uma URL completa.";
  }
  if (parsed.protocol !== "https:") return "Use HTTPS.";
  if (value.includes("#")) return "Remova o trecho depois de #.";
  if (value.includes("?")) return "Não use parâmetros (?).";
  if (
    value.length > 2048 ||
    // eslint-disable-next-line no-control-regex
    /[^\x21-\x7e]/.test(value) ||
    value.includes("\\")
  )
    return "A URL tem caracteres não permitidos.";
  if (parsed.username || parsed.password) return "Não inclua usuário ou senha.";
  if (!HOST_PATTERN.test(parsed.hostname))
    return "Use um domínio público (sem IP nem localhost).";
  if (parsed.port && parsed.port !== "443") return "Use a porta padrão (443).";
  return null;
}

export function validateRedirectUris(list: string[]): {
  ok: boolean;
  problems: Record<number, string>;
  tooMany: boolean;
} {
  const problems: Record<number, string> = {};
  const seen = new Set<string>();
  list.forEach((value, index) => {
    const found = redirectProblem(value);
    if (found) problems[index] = found;
    else if (seen.has(value)) problems[index] = "Esta URL já está na lista.";
    seen.add(value);
  });
  const tooMany = list.length > MAX_REDIRECT_URIS;
  return {
    ok: Object.keys(problems).length === 0 && !tooMany,
    problems,
    tooMany,
  };
}

const fold = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

export function filterPermissionGroups(
  groups: PermissionGroup[],
  query: string,
  mode: "all" | "granted" | "missing",
  titleOf: (code: string) => string,
): PermissionGroup[] {
  const needle = fold(query.trim());
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (mode === "granted" && !item.granted) return false;
        if (mode === "missing" && item.granted) return false;
        if (!needle) return true;
        return fold(
          `${titleOf(item.code)} ${item.description} ${item.code}`,
        ).includes(needle);
      }),
    }))
    .map((group) => ({
      ...group,
      grantedCount: group.items.filter((item) => item.granted).length,
    }))
    .filter((group) => group.items.length > 0);
}

export type PermissionAction = "read" | "create" | "write" | "upload" | "other";

export function permissionAction(code: string): PermissionAction {
  if (code.endsWith(":upload")) return "upload";
  const last = code.split(":").pop();
  return last === "read" || last === "create" || last === "write"
    ? last
    : "other";
}
