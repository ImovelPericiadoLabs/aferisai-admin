# Migração das telas antigas — Onda 1 — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a confirmação com motivo e redesenhar Minhas chaves, Permissões e Provedores de IA no design novo, expondo o que o backend já permite.

**Architecture:** Lógica de decisão em módulos puros (`*-model.ts`, `reason.ts`, `access-matrix.ts`) testados antes do código; telas finas em React que só orquestram. Reuso de `ConfirmDialog`, `EntityPicker`, `useDialogFocus`, `lookups.ts` e das classes de `components.css`. Gavetas laterais via portal, como em Parceiros e Regras comerciais.

**Tech Stack:** React 19, TypeScript, CSS puro com tokens, Vite, Vitest (sem jsdom: só funções puras são testadas por unidade; telas são verificadas no navegador).

**Spec:** `docs/superpowers/specs/2026-10-23-legacy-screens-migration.md` (seções 3 e 4).

## Global Constraints

- Nunca inventar dado, ação ou módulo; mostrar só campos que existem em `src/api.ts`.
- Ação sensível usa `ConfirmDialog`; nenhum `window.confirm` nem confirmação inline nas telas migradas.
- Onde o backend exige motivo, o diálogo pede motivo de **10 a 500** caracteres.
- Telas novas usam raiz `.page` (largura máxima `--content-max` = 1600px, centralizada) e `page-header`.
- Cores e tamanhos só por tokens (`var(--…)`); sem hex nem `!important` em CSS novo.
- Estados obrigatórios: carregando, vazio, erro, sem acesso, desabilitado com explicação.
- Contratos existentes de `src/api.ts` não mudam; só se **adiciona** `activateAnalysisProviderAccount`.
- Segredo de provedor nunca é exibido depois do cadastro; só `credential_hint`.
- Campos do painel nunca autopreenchem (já garantido por `installNoAutofill`); não repetir atributos.
- `window.location.hash` e as chaves de página de `App.tsx` (`passkeys`, `access`, `analysis-providers`) não mudam.
- Commits em inglês, imperativos, terminando com a linha `Co-Authored-By` indicada pelo ambiente.
- Verificação a cada tarefa: `npx prettier --write <arquivos>`, `npx tsc -b`, e o teste nomeado.

## Review Focus

1. **Cancelar no diálogo do dispositivo** ao cadastrar chave: mensagem neutra, sem estilo de erro (T2: `passkeyErrorKind`).
2. **Revogar a última chave:** o aviso muda e informa que o acesso passa a ser só senha + autenticador (T2: `revokeWarning`).
3. **Conflito de versão (409)** ao salvar limites, ativar ou suspender provedor: recarregar e avisar, sem perder a tela (T4: `isVersionConflict`).
4. **Viewer em Permissões › Aplicações:** somente leitura; e linha de aplicação/organização suspensa desabilitada com motivo (T3: `canEditApplicationPermissions`, `buildPermissionMatrix`).
5. **Fronteiras do motivo:** 9 caracteres bloqueia, 10 e 500 passam, 501 bloqueia, só espaços bloqueia (T1: `validateReason`).

---

## File Map

| Arquivo | Ação | Tarefa |
| --- | --- | --- |
| `src/reason.ts`, `src/reason.test.ts` | Criar | T1 |
| `src/ConfirmDialog.tsx` | Modificar (campo de motivo) | T1 |
| `src/passkey-model.ts`, `src/passkey-model.test.ts` | Criar | T2 |
| `src/Passkeys.tsx`, `src/passkeys.css` | Reescrever / criar | T2 |
| `src/access-matrix.ts`, `src/access-matrix.test.ts` | Criar | T3 |
| `src/permission-matrix.ts`, `src/permission-matrix.test.ts` | Criar | T3 |
| `src/Access.tsx`, `src/access.css` | Criar (extrai `Access` de `App.tsx`) | T3 |
| `src/provider-model.ts`, `src/provider-model.test.ts` | Criar | T4 |
| `src/status-tones.ts`, `src/status-tones.test.ts` | Criar | T4 |
| `src/api.ts`, `src/api.test.ts` | Modificar (adicionar ativação) | T4 |
| `src/AnalysisProviders.tsx`, `src/AnalysisProviderPanel.tsx`, `src/AnalysisProviderForm.tsx`, `src/analysis-providers.css` | Reescrever / criar | T5 |
| `src/App.tsx` | Modificar (props e remoção do `Access` antigo) | T2, T3 |
| `docs/superpowers/specs/2026-10-23-legacy-screens-migration.md` | Modificar (SecretReveal vai à onda 2) | T1 |

---

### Task 1: Motivo validado e `ConfirmDialog` com campo de motivo

**Files:**
- Create: `src/reason.ts`
- Test: `src/reason.test.ts`
- Modify: `src/ConfirmDialog.tsx`, `docs/superpowers/specs/2026-10-23-legacy-screens-migration.md` (§3.2: `SecretReveal` passa para a onda 2, onde terá o primeiro uso, em Promoções; o spec diz isso por "YAGNI")

**Interfaces:**
- Produces: `validateReason(text: string, min: number, max: number): { ok: boolean; length: number; message: string }` — `length` é o tamanho após `trim()`; `message` é `""` quando `ok`.
- Produces: `ConfirmDialog` ganha a prop opcional `reason?: { label: string; min: number; max: number }` e `onConfirm: (reason: string) => void`. Sem `reason`, comportamento atual (chamadores existentes continuam válidos).

- [ ] **Step 1: Write the failing test** em `src/reason.test.ts`, com estes casos (valores do backend):
  - `validateReason("123456789", 10, 500).ok === false` e `message` menciona `10`.
  - `validateReason("1234567890", 10, 500).ok === true`, `message === ""`.
  - 500 caracteres (`"a".repeat(500)`) → `ok === true`; 501 → `ok === false` e `message` menciona `500`.
  - `validateReason("   \n  ", 10, 500)` → `ok === false`, `length === 0`.
  - `validateReason("  abcdefghij  ", 10, 500)` → `ok === true`, `length === 10` (conta após `trim`).

- [ ] **Step 2: Run** `VITE_API_URL=http://localhost:8000 npx vitest run src/reason.test.ts --maxWorkers=2` — Expected: FAIL com "Cannot find module './reason'".

- [ ] **Step 3: Implement** `validateReason` em `src/reason.ts` (função pura, sem dependências).

- [ ] **Step 4: Run** o mesmo comando — Expected: PASS (todos os casos).

- [ ] **Step 5: Extend `ConfirmDialog`** (`src/ConfirmDialog.tsx`): quando `reason` é passado, renderiza um `<textarea className="input">` rotulado por `reason.label`, contador `n/max`, mensagem de `validateReason` abaixo; o botão confirmar fica desabilitado enquanto `!ok`; o texto zera quando `open` volta a `false`; `onConfirm(reasonTrimmed)`. Foco inicial continua no botão Cancelar. Estilos em `components.css` (classe `.confirm-reason`), só com tokens.

- [ ] **Step 6: Atualizar o spec** (§3.2) trocando "(onda 1)" por "(onda 2, junto do primeiro uso)" e removendo `SecretReveal` da lista de componentes da onda 1 (§2/§5 quando citado).

- [ ] **Step 7: Verify** `npx prettier --write src/reason.ts src/reason.test.ts src/ConfirmDialog.tsx src/components.css && npx tsc -b` — Expected: sem saída de erro; os `ConfirmDialog` existentes (convite, repasse, revogação, política) continuam compilando.

- [ ] **Step 8: Commit**
  ```bash
  git add src/reason.ts src/reason.test.ts src/ConfirmDialog.tsx src/components.css docs/superpowers/specs/2026-10-23-legacy-screens-migration.md
  git commit -m "feat: confirm dialog with validated reason field"
  ```

---

### Task 2: Minhas chaves

**Files:**
- Create: `src/passkey-model.ts`, `src/passkeys.css`
- Test: `src/passkey-model.test.ts`
- Modify: `src/Passkeys.tsx` (reescrever), `src/App.tsx` (passar `onUnauthorized` ao componente)

**Interfaces:**
- Consumes: `ConfirmDialog` (T1), `listPasskeys`, `beginPasskeyRegistration`, `finishPasskeyRegistration`, `revokePasskey`, `PasskeyItem` de `api.ts`; `useDialogFocus` não é necessário (sem gaveta).
- Produces em `passkey-model.ts`:
  - `MAX_PASSKEYS = 5`
  - `passkeyUsage(count: number): { count: number; max: number; full: boolean; label: string }` — `label` no formato `"2 de 5 chaves"`; `full` quando `count >= max`.
  - `passkeyErrorKind(cause: unknown): "cancelled" | "unauthorized" | "failed"` — `cancelled` se o valor tem `name` `"NotAllowedError"` ou `"AbortError"`; `unauthorized` se é `ApiError` com `status === 401`; senão `failed`.
  - `revokeWarning(totalKeys: number): string` — devolve um texto que contém "senha" quando `totalKeys === 1` (última chave) e um texto sem "senha" caso contrário.
  - `lastUsedLabel(lastUsedAt: string | null, now?: number): string` — `"Nunca usada"` quando nulo; senão data/hora `pt-BR` curta.

- [ ] **Step 1: Write the failing tests** em `src/passkey-model.test.ts`: (a) `passkeyUsage(2)` → `{count:2,max:5,full:false,label:"2 de 5 chaves"}`; `passkeyUsage(5).full === true`; (b) `passkeyErrorKind({ name: "NotAllowedError" }) === "cancelled"`, `AbortError` idem, `new ApiError(401,"X","y") === "unauthorized"`, `new Error("boom") === "failed"`, `null === "failed"`; (c) `revokeWarning(1)` contém `"senha"`, `revokeWarning(2)` não contém; (d) `lastUsedLabel(null) === "Nunca usada"` e uma data ISO devolve string não vazia diferente de "Nunca usada".

- [ ] **Step 2: Run** `VITE_API_URL=http://localhost:8000 npx vitest run src/passkey-model.test.ts --maxWorkers=2` — Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement** o módulo `src/passkey-model.ts` conforme a assinatura acima.

- [ ] **Step 4: Run** o mesmo comando — Expected: PASS.

- [ ] **Step 5: Rewrite `Passkeys.tsx`** (props `{ csrf: string; onUnauthorized: () => void }`) com raiz `<section className="page">`: `page-header` ("Minhas chaves de acesso" + frase do benefício); indicador `passkeyUsage`; card "Adicionar chave" (campo nome com `required`, botão desabilitado com explicação ao `full` e quando o navegador não suporta WebAuthn, mantendo o alerta existente); tabela `data-table` com nome, criada em, **último uso** (`lastUsedLabel`), ação Revogar; revogar abre `ConfirmDialog` perigoso com a descrição de `revokeWarning(items.length)`; esqueleto durante a carga; erro de carga com "Tentar novamente"; `passkeyErrorKind` decide a mensagem (`cancelled` → aviso neutro `.alert` informativo; `unauthorized` → `onUnauthorized()`; `failed` → `.alert-danger`). Preservar o fluxo `begin → startRegistration → finish` e a atualização otimista da lista existentes.

- [ ] **Step 6: Wire** em `App.tsx`: `<Passkeys csrf={session.csrf} onUnauthorized={unauthorize} />`.

- [ ] **Step 7: Verify no navegador** (script Playwright com rotas simuladas de `/v1/team/passkeys`): lista com 2 chaves (uma "Nunca usada"), lista vazia, erro 500 com retry, 5 de 5 com botão desabilitado, diálogo de revogação (com e sem aviso de última chave). 1440 e 390px, sem rolagem horizontal. Expected: sem erros de console; nenhum `window.confirm`: `grep -n "window.confirm" src/Passkeys.tsx` sem resultado.

- [ ] **Step 8: Commit**
  ```bash
  git add src/passkey-model.ts src/passkey-model.test.ts src/Passkeys.tsx src/passkeys.css src/App.tsx
  git commit -m "feat: redesign Minhas chaves with usage, last use and confirm dialog"
  ```

---

### Task 3: Permissões (Meu acesso, Papéis, Aplicações)

**Files:**
- Create: `src/access-matrix.ts`, `src/permission-matrix.ts`, `src/Access.tsx`, `src/access.css`
- Test: `src/access-matrix.test.ts`, `src/permission-matrix.test.ts`
- Modify: `src/App.tsx` (remover a função `Access` antiga; renderizar `<Access role={session.member.role} csrf={session.csrf} onUnauthorized={unauthorize} />`)

**Interfaces:**
- Consumes: `ConfirmDialog` (T1), `EntityPicker`, `searchOrganizations`, `resolveOrganization` (`lookups.ts`), `getOrganization`, `grantApplicationPermission`, `revokeApplicationPermission` (ler a ordem dos argumentos em `src/api.ts` antes de chamar), `scopeLabel`, `teamRoleLabel` (`display-labels.ts`), `OrganizationDetail` (`api.ts`).
- Produces em `access-matrix.ts`:
  - `type Role = "viewer" | "manager" | "administrator" | "financial"`; `ROLES: Role[]` na ordem viewer, manager, administrator, financial.
  - `type Capability = { id: string; area: string; label: string; roles: Role[] }`; `CAPABILITIES: Capability[]` com as linhas verificadas do spec §4.2.
  - `capabilitiesFor(role: Role): Capability[]`; `groupByArea(items: Capability[]): { area: string; items: Capability[] }[]`.
  - `canEditApplicationPermissions(role: string): boolean` — `true` só para `manager` e `administrator`.
- Produces em `permission-matrix.ts`: `buildPermissionMatrix(detail: Pick<OrganizationDetail, "status" | "applications" | "permissions">): { codes: { code: string; description: string }[]; rows: { id: string; name: string; granted: Record<string, boolean>; editable: boolean; lockedReason: string | null }[] }` — `editable` é `false` quando `detail.status !== "active"` ou a aplicação não está `active`, com `lockedReason` "A organização está suspensa." ou "A aplicação está suspensa." (a da organização tem prioridade).

- [ ] **Step 1: Write the failing tests.**
  `access-matrix.test.ts`: toda `Capability` tem ao menos 1 papel e ids únicos; `capabilitiesFor("viewer")` não contém a capacidade de provedores de IA nem a de confirmar estorno; `capabilitiesFor("financial")` contém "confirmar e executar estorno/correção" e **não** contém "contas de provedor de IA"; a linha de "passkeys e sessão próprias" tem os 4 papéis; `canEditApplicationPermissions` é `true` para `manager` e `administrator`, `false` para `viewer`, `financial` e `"x"`; `groupByArea` preserva todas as capacidades (soma dos tamanhos igual ao total).
  `permission-matrix.test.ts`: com 2 aplicações e catálogo de 3 códigos, `rows[i].granted[code]` reflete `application.permissions`; `codes` mantém a ordem do catálogo; organização `suspended` → todas as linhas `editable:false` com `lockedReason "A organização está suspensa."`; aplicação `suspended` numa organização ativa → só ela `editable:false` com `"A aplicação está suspensa."`; organização ativa e aplicação ativa → `editable:true`, `lockedReason:null`.

- [ ] **Step 2: Run** `VITE_API_URL=http://localhost:8000 npx vitest run src/access-matrix.test.ts src/permission-matrix.test.ts --maxWorkers=2` — Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement** `access-matrix.ts` e `permission-matrix.ts` conforme as assinaturas. As linhas de `CAPABILITIES` seguem exatamente o spec §4.2 (organizações/aplicações: ver; editar perfil/permissões/credenciais/webhooks/redirects/revogar conexão; convidar parceiro; listar contas; listar membros; regras e promoções; provedores de IA; exceções assumir/reatribuir/propor/confirmar-executar; revisão humana de análise; passkeys e sessão).

- [ ] **Step 4: Run** o mesmo comando — Expected: PASS.

- [ ] **Step 5: Build `Access.tsx`** (props `{ role: Role; csrf: string; onUnauthorized: () => void }`), raiz `.page` com `page-header` e três abas acessíveis (`role="tablist"`, mesma classe de abas de `PeopleDirectory`):
  - **Meu acesso:** `teamRoleLabel(role)` e as capacidades de `capabilitiesFor(role)` agrupadas por área; texto fixo de que a interface só esconde e o servidor decide.
  - **Papéis:** tabela capacidade × 4 papéis (✓ ou —, com `aria-label`), agrupada por área, coluna do papel atual realçada; nota da referência fixa e de `financial` separado da hierarquia.
  - **Aplicações:** `EntityPicker` de organização; ao escolher, `getOrganization` → `buildPermissionMatrix`; tabela aplicação × permissão (rótulo humano via `scopeLabel`, código técnico como texto auxiliar); célula é botão `aria-pressed` habilitado só se `canEditApplicationPermissions(role)` e `row.editable` (senão desabilitado, com `title`/texto do `lockedReason` ou "Somente leitura para o seu papel"); clicar abre `ConfirmDialog` (sem motivo) e chama conceder/revogar, depois recarrega a organização; erros 401 → `onUnauthorized`, demais em `.alert-danger`; estados de carregando, vazio ("Escolha uma organização") e erro.
  Em `App.tsx` remover a função `Access` antiga e importar `Access`.

- [ ] **Step 6: Verify no navegador** (rotas simuladas de organização com aplicações e catálogo): as três abas em 1440 e 390px; como `viewer` as células aparecem desabilitadas; organização suspensa trava a matriz; conceder abre o diálogo e só chama a API após confirmar. Expected: sem erros de console; `grep -n "function Access" src/App.tsx` sem resultado.

- [ ] **Step 7: Commit**
  ```bash
  git add src/access-matrix.ts src/access-matrix.test.ts src/permission-matrix.ts src/permission-matrix.test.ts src/Access.tsx src/access.css src/App.tsx
  git commit -m "feat: Permissões with role matrix and application permission grid"
  ```

---

### Task 4: Modelo de provedores, tons de status e ativação na API

**Files:**
- Create: `src/provider-model.ts`, `src/status-tones.ts`
- Test: `src/provider-model.test.ts`, `src/status-tones.test.ts`
- Modify: `src/api.ts`, `src/api.test.ts`

**Interfaces:**
- Produces em `status-tones.ts`: `providerStatusTone(status: "draft" | "active" | "suspended"): "badge-neutral" | "badge-success" | "badge-warning"`.
- Produces em `provider-model.ts`:
  - `type LimitsForm = { maxConcurrent: string; dailyLimit: string; rpm: string; tpm: string; dailyCostReais: string; priority: string }`
  - `limitsToForm(limits: AnalysisProviderLimits): LimitsForm` — `daily_cost_cents` vira reais com 2 decimais (`1000` → `"10.00"`).
  - `formToLimits(form: LimitsForm): { ok: true; limits: AnalysisProviderLimits } | { ok: false; field: keyof LimitsForm; message: string }` — faixas do backend: `maxConcurrent` 1–100, `priority` 0–1000, `dailyLimit`, `rpm`, `tpm` inteiros ≥ 1, `dailyCostReais` > 0 (convertido para centavos arredondados). Retorna o **primeiro** campo inválido.
  - `formatCostPerDay(cents: number): string` — ex.: `"R$ 10,00 por dia"`.
  - `validateExternalReserved(text: string): { ok: boolean; value: number; message: string }` — inteiro 0–12.
  - `activationBody(account: AnalysisProviderAccount, externalReserved: number, reason: string): ActivateProviderBody | null` — `null` se `account.execution_profile_sha256` é nulo; senão `{ expected_version: account.version, model: "gemini-3.5-flash-lite", expected_profile_sha256: <hash>, external_reserved, reason }`.
  - `isVersionConflict(cause: unknown): boolean` — `true` para `ApiError` com `status === 409`.
  - `shortHash(hash: string | null): string` — 12 primeiros caracteres + `…`, ou `"—"` se nulo.
- Produces em `api.ts`: `type ActivateProviderBody = { expected_version: number; model: string; expected_profile_sha256: string; external_reserved: number; reason: string }` e `activateAnalysisProviderAccount(id: string, body: ActivateProviderBody, csrfToken: string): Promise<AnalysisProviderAccount>` → `POST /v1/team/analysis-provider-accounts/{id}/activate` com cabeçalho `X-CSRF-Token` e o corpo JSON.

- [ ] **Step 1: Write the failing tests.**
  `provider-model.test.ts`: `limitsToForm` de `{max_concurrent:1,daily_limit:100,rpm:10,tpm:10000,daily_cost_cents:1000,priority:100}` → `dailyCostReais:"10.00"`; round-trip `formToLimits(limitsToForm(x))` devolve `x`; `maxConcurrent:"0"` → `{ok:false, field:"maxConcurrent"}`; `"101"` idem; `priority:"1001"` → `field:"priority"`; `priority:"0"` válido; `dailyCostReais:"0"` e `"abc"` inválidos; `"12.345"` → centavos `1235` (arredondado); ao haver dois campos inválidos retorna o primeiro na ordem do formulário; `formatCostPerDay(1000)` normalizado (trocando NBSP por espaço) é `"R$ 10,00 por dia"`; `validateExternalReserved("0")`/`"12"` ok, `"13"`, `"-1"`, `"1.5"`, `""` inválidos; `activationBody` com hash devolve exatamente as 5 chaves e `model:"gemini-3.5-flash-lite"`, sem hash devolve `null`; `isVersionConflict(new ApiError(409,"X","y"))` verdadeiro, 422 falso, `new Error()` falso; `shortHash("a".repeat(64))` tem 13 caracteres (12 + `…`), `shortHash(null) === "—"`.
  `status-tones.test.ts`: `draft` → `badge-neutral`, `active` → `badge-success`, `suspended` → `badge-warning`.
  `api.test.ts`: seguindo o padrão de stub de `fetch` já usado no arquivo, `activateAnalysisProviderAccount("p1", body, "csrf")` chama `POST` em `…/analysis-provider-accounts/p1/activate`, com `X-CSRF-Token: csrf` e corpo JSON igual a `body`.

- [ ] **Step 2: Run** `VITE_API_URL=http://localhost:8000 npx vitest run src/provider-model.test.ts src/status-tones.test.ts src/api.test.ts --maxWorkers=2` — Expected: FAIL (módulos e função ausentes).

- [ ] **Step 3: Implement** os dois módulos e a função em `api.ts` (apenas adição, sem alterar as existentes).

- [ ] **Step 4: Run** o mesmo comando — Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/provider-model.ts src/provider-model.test.ts src/status-tones.ts src/status-tones.test.ts src/api.ts src/api.test.ts
  git commit -m "feat: provider model, status tones and activation API"
  ```

---

### Task 5: Provedores de IA (tabela, gaveta, criação)

**Files:**
- Rewrite: `src/AnalysisProviders.tsx`, `src/analysis-providers.css`
- Create: `src/AnalysisProviderPanel.tsx`, `src/AnalysisProviderForm.tsx`
- Modify: nenhuma mudança em `App.tsx` (props `csrf`, `onUnauthorized` já existem)

**Interfaces:**
- Consumes: T1 (`ConfirmDialog` com `reason`, `validateReason` indireto), T4 (todas as funções de `provider-model.ts`, `providerStatusTone`, `activateAnalysisProviderAccount`), `listAnalysisProviderAccounts`, `createAnalysisProviderAccount`, `updateAnalysisProviderLimits`, `suspendAnalysisProviderAccount`, `useDialogFocus`, `statusLabel`.
- Produces: `AnalysisProviders` (mesmas props de hoje) e os dois componentes internos `AnalysisProviderPanel({ account, csrf, busy, onChanged, onUnauthorized, onClose })` e `AnalysisProviderForm({ csrf, onCreated, onUnauthorized, onClose })`, onde `onChanged: () => Promise<void>` recarrega a lista.

- [ ] **Step 1: Page** (`AnalysisProviders.tsx`): raiz `.page`; `page-header` com botão "Nova conta"; aviso `.alert` neutro e curto: contas ainda não usadas pelo worker e limite conjunto de 12 chamadas simultâneas (sem citar "Imovel"); filtro por estado (todas, rascunho, ativas, suspensas) com contagens; `data-table` com rótulo, tipo (mapa `kindLabels` atual), modelo, pool, estado (`badge` + `providerStatusTone`), prioridade, limites resumidos (`formatCostPerDay` e `rpm`); linha clicável abre a gaveta; carregando (esqueleto), vazio, erro com retry, "Carregar mais"; 404/501 → mensagem existente de API indisponível (esconde "Nova conta"). Gaveta via portal com `useDialogFocus`, igual a `PartnerDirectory`.

- [ ] **Step 2: Panel** (`AnalysisProviderPanel.tsx`): seções Identificação (rótulo, tipo, modelo, localização, pool, `credential_hint`, `shortHash` + botão copiar o hash completo), Limites (formulário `LimitsForm` com rótulos humanos: "Teto diário (R$)", "Requisições por minuto", etc.; erro de `formToLimits` junto ao campo), e Ações por estado:
  - **Salvar limites:** abre `ConfirmDialog` com `reason {min:10,max:500}`; chama `updateAnalysisProviderLimits(id, limits, account.version, reason, csrf)`.
  - **Ativar** (só `draft` e com `execution_profile_sha256`; sem hash, mostrar a explicação de que o perfil ainda não foi concluído no backend): campo "Reserva externa (0–12)" validado por `validateExternalReserved`; `ConfirmDialog` com motivo; chama `activateAnalysisProviderAccount(id, activationBody(...)!, csrf)`.
  - **Suspender** (só `active`; também `draft`, se o backend aceitar — manter o comportamento atual do arquivo): `ConfirmDialog` perigoso com motivo; `suspendAnalysisProviderAccount(id, version, reason, csrf)`.
  Em qualquer erro: 401 → `onUnauthorized`; `isVersionConflict` → fechar diálogos, `onChanged()` e mostrar "A conta mudou enquanto você editava. Os dados foram recarregados."; demais → `.alert-danger` dentro da gaveta. Conta `suspended` mostra a nota de que não há reativação nesta versão.

- [ ] **Step 3: Form** (`AnalysisProviderForm.tsx`): mover a lógica de criação existente **sem mudar o comportamento** (leitura do arquivo JSON para Vertex, campo de senha para os demais, limpar o segredo em qualquer falha, `pool_key` com exemplo por tipo, `location` obrigatório só para Vertex, `reason` 10–500). Limites em `LimitsForm` (reais), convertidos com `formToLimits` na borda. Sem `SecretReveal` (o segredo não volta). Criar leva ao `onCreated()` e fecha a gaveta com aviso de sucesso na página.

- [ ] **Step 4: CSS** (`analysis-providers.css`): reescrever só com tokens; remover todas as cores fixas e classes que deixarem de existir.

- [ ] **Step 5: Verify no navegador** (rotas simuladas de `/v1/team/analysis-provider-accounts` com 1 conta de cada estado, uma sem hash, 409 simulado em `/limits`): tabela e filtros a 1440/768/390px; gaveta para cada estado; ações exigem motivo de 10+ caracteres; ativar só chama a API depois do diálogo; 409 recarrega e avisa; vazio, erro e 404 verificados. Expected: sem erros de console; `grep -n "window.confirm" src/AnalysisProviders.tsx src/AnalysisProviderPanel.tsx src/AnalysisProviderForm.tsx` sem resultado; `grep -nE "#[0-9a-fA-F]{3,8}\b" src/analysis-providers.css` sem resultado.

- [ ] **Step 6: Commit**
  ```bash
  git add src/AnalysisProviders.tsx src/AnalysisProviderPanel.tsx src/AnalysisProviderForm.tsx src/analysis-providers.css
  git commit -m "feat: redesign Provedores de IA with table, drawer and activation"
  ```

---

### Task 6: Verificação final da onda

**Files:** nenhum arquivo novo; ajustes pontuais que a verificação apontar.

- [ ] **Step 1: Run** `npx prettier --check src && npx tsc -b && npx oxlint src` — Expected: sem erros novos nos arquivos desta onda (avisos antigos de outros arquivos permanecem).
- [ ] **Step 2: Run** `npm run build` — Expected: `built in …` sem erros.
- [ ] **Step 3: Run** `VITE_API_URL=http://localhost:8000 npx vitest run --maxWorkers=2` — Expected: todos os testes passam, incluindo os novos.
- [ ] **Step 4: Varredura de padrões:** `grep -rn "window.confirm" src/Passkeys.tsx src/Access.tsx src/AnalysisProviders.tsx src/AnalysisProviderPanel.tsx src/AnalysisProviderForm.tsx` sem resultado; as três telas centralizadas a 1920px (`main > :first-child` com largura ≤ 1600px).
- [ ] **Step 5: Passada visual** em 1440, 768 e 390px das três telas e da navegação pelo menu da conta (Minha conta e Configurações). Expected: sem sobreposição, sem rolagem horizontal, foco visível por teclado, gaveta e diálogos fecham com Esc.
- [ ] **Step 6: Commit** de eventuais ajustes: `git commit -m "fix: wave 1 verification adjustments"` (só se houver mudanças).
