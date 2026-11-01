import { ApiError, type RegistrySupplierAccount } from "./api";

export type Mode = "official" | "proxy";

export type EditorTab =
  | "overview"
  | "activity"
  | "credentials"
  | "connection"
  | "tariffs"
  | "commercial"
  | "composition";

export type EditorNavGroup = {
  title: string;
  items: { id: EditorTab; label: string; hint: string; dot?: string }[];
};

export const MODES = [
  {
    value: "official" as const,
    label: "Portal original",
    summary: "Consulta direto em ridigital.org.br.",
  },
  {
    value: "proxy" as const,
    label: "Proxy protegido",
    summary: "Passa por um Worker que exige uma chave.",
  },
];

export function message(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 409)
      return "A conexão mudou enquanto você editava. Os dados foram recarregados; revise e tente de novo.";
    if (cause.status === 422)
      return `${cause.detail} Confirme que o Worker nega acesso sem a chave em todas as rotas.`;
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}

export function editorNavGroups(
  account: RegistrySupplierAccount | null,
  readyState: (id: string) => string | undefined,
): EditorNavGroup[] {
  return account
    ? [
        {
          title: "Geral",
          items: [
            {
              id: "overview",
              label: "Visão geral",
              hint: "Prontidão e uso",
            },
            { id: "activity", label: "Atividade", hint: "Quem mudou o quê" },
          ],
        },
        {
          title: "Conta",
          items: [
            {
              id: "credentials",
              label: "Credenciais",
              hint: "Login e vínculo",
              dot: readyState("credential"),
            },
            ...(account.provider === "onr"
              ? [
                  {
                    id: "connection" as const,
                    label: "Conexão",
                    hint: "Origem das consultas",
                    dot: readyState("connection"),
                  },
                ]
              : []),
          ],
        },
        {
          title: "Preços",
          items: [
            {
              id: "tariffs",
              label: "Tarifas da API",
              hint: "Custo do fornecedor",
              dot: readyState("tariff"),
            },
            {
              id: "commercial" as const,
              label: "Condições comerciais",
              hint:
                account.provider === "onr"
                  ? "Margens e impostos"
                  : "Reserva de IA compartilhada",
              dot: readyState("terms"),
            },
            ...(account.provider === "onr"
              ? [
                  {
                    id: "composition" as const,
                    label: "Composição do preço",
                    hint: "Do custo cru ao preço",
                  },
                ]
              : []),
          ],
        },
      ]
    : [];
}
