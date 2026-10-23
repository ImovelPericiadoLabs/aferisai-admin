# Biblioteca de campos e upload — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar componentes reutilizáveis de upload (área de soltar, pré-visualização por tipo, progresso real, fluxo de foto/logo com enquadramento opcional) e controles redesenhados (checkbox, radio, switch, seção que abre/fecha, slider), aplicados no logo da parceria e no arquivo do provedor de IA, com uma página de referência.

**Architecture:** Regras de arquivo e geometria de recorte em módulos puros testados primeiro; componentes React finos por cima; progresso real por `XMLHttpRequest` isolado em `api.ts` (adição); PDF via `pdfjs-dist` carregado sob demanda. Estilos só com tokens.

**Tech Stack:** React 19, TypeScript, CSS puro com tokens, Vitest (ambiente node: XHR é simulado por classe falsa; telas verificadas no navegador).

**Spec:** `docs/superpowers/specs/2026-10-23-fields-and-uploads.md` (e as regras gerais de `2026-10-23-legacy-screens-migration.md`).

## Global Constraints

- Nenhum dado inventado; limites de tipo e tamanho só em `file-rules.ts` (duplicados do backend, registrados no pedido conjunto).
- Pré-visualização **nunca** mostra segredos: JSON de conta de serviço mostra apenas `type`, `project_id` e `client_email`; `private_key` e `private_key_id` jamais aparecem.
- Imagem é lida só no navegador (`URL.createObjectURL`, liberada ao desmontar); nada é enviado antes de o usuário confirmar.
- Animações respeitam `prefers-reduced-motion` (desligadas) e usam só tokens de cor.
- Teclado: tudo operável por Tab/Enter/Espaço; foco visível; `aria-live` para estados de upload.
- Contratos existentes de `src/api.ts` não mudam; só **adições**.
- Cores e tamanhos só por `var(--token)`; sem hex nem `!important` em CSS novo.
- Enquadramento do logo é **opcional** (decisão do Lucas, 2026-10-23): sem ajuste, vai o arquivo original.
- Commits em inglês, imperativos, com a linha `Co-Authored-By` indicada pelo ambiente. Verificação a cada tarefa: `npx prettier --write <arquivos>`, `npx tsc -b`, teste nomeado.

## Review Focus

1. **Arquivo com extensão certa e `type` vazio** (alguns sistemas não informam MIME do `.json`/`.png`): deve ser aceito pela extensão (T1).
2. **JSON de conta de serviço com `private_key`** nunca aparece em nenhuma pré-visualização, inclusive no atributo `title`/`alt` (T2).
3. **Recorte em imagem não quadrada e zoom máximo:** nunca sair dos limites da imagem (T3).
4. **Falha de rede ou 4xx durante o envio:** barra volta ao estado de erro com mensagem do servidor e permite tentar de novo sem reselecionar (T4, T6).
5. **Trocar de arquivo durante a pré-visualização:** URL de objeto anterior liberada, PDF anterior cancelado, sem pré-visualização do arquivo antigo (T5).

---

## File Map

| Arquivo | Ação | Tarefa |
| --- | --- | --- |
| `src/file-rules.ts`, `src/file-rules.test.ts` | Criar | T1 |
| `src/file-preview-model.ts`, `src/file-preview-model.test.ts` | Criar | T2 |
| `src/image-model.ts`, `src/image-model.test.ts` | Criar | T3 |
| `src/api.ts`, `src/api.test.ts` | Modificar (upload com progresso) | T4 |
| `src/FileDropzone.tsx`, `src/FilePreview.tsx`, `src/file-upload.css` | Criar | T5 |
| `src/ImageUploader.tsx` | Criar | T6 |
| `src/OrganizationDetail.tsx` | Modificar (cartão do logo) | T6 |
| `src/controls.tsx`, `src/controls.css` | Criar | T7 |
| `src/AnalysisProviderForm.tsx` | Modificar (arquivo JSON) | T8 |
| `src/DesignSystemGuide.tsx`, `src/design-guide.css`, `src/App.tsx` | Criar / modificar | T9 |

---

### Task 1: Regras de arquivo

**Files:** Create `src/file-rules.ts`; Test `src/file-rules.test.ts`

**Interfaces — Produces:**
- `type FileKind = "image" | "pdf" | "json" | "text"`; `type FileRule = { kinds: FileKind[]; extensions: string[]; mimeTypes: string[]; maxBytes: number }`; `type FileLike = { name: string; size: number; type: string }`.
- `formatBytes(bytes: number): string` — `0` → `"0 B"`, `1023` → `"1023 B"`, `1024` → `"1 KiB"`, `1536` → `"1,5 KiB"`, `2*1024*1024` → `"2 MiB"`.
- `describeFile(file: FileLike): { kind: FileKind | "other"; extension: string; sizeLabel: string }` — extensão sem ponto, em minúsculas (`""` se não houver); `kind` por MIME, com a extensão como reserva quando o MIME vem vazio.
- `validateFile(file: FileLike, rule: FileRule): { ok: true } | { ok: false; code: "empty" | "type" | "size"; message: string }`.
- `LOGO_RULE` (PNG/JPEG, `image/png`+`image/jpeg`, extensões `png`,`jpg`,`jpeg`, 2 MiB) e `SERVICE_ACCOUNT_RULE` (JSON, `application/json`, extensão `json`, 64 KiB).

- [ ] **Step 1: Write the failing tests** em `src/file-rules.test.ts`: (a) `formatBytes` com os cinco valores acima; (b) `describeFile({name:"Logo.PNG",size:10,type:"image/png"})` → `kind:"image", extension:"png"`; `.pdf`/`application/pdf` → `pdf`; `key.json`/`application/json` → `json`; `notes.txt`/`text/plain` → `text`; `x.bin`/`application/octet-stream` → `other`; `semextensao` → `extension:""`, `kind:"other"`; `a.png` com `type:""` → `image`; (c) `validateFile` com `LOGO_RULE`: PNG de exatamente `2*1024*1024` bytes é `ok`; `2*1024*1024+1` → `code:"size"` e `message` contém `"2 MiB"`; tamanho `0` → `code:"empty"`; `image/gif` → `code:"type"`; `type:""` com nome `a.JPG` → `ok`; (d) `SERVICE_ACCOUNT_RULE`: `64*1024` ok, `64*1024+1` → `size` com `"64 KiB"`, `a.txt` com `text/plain` → `type`, `chave.json` com `application/json` → ok.
- [ ] **Step 2: Run** `VITE_API_URL=http://localhost:8000 npx vitest run src/file-rules.test.ts --maxWorkers=2` — Expected: FAIL "Cannot find module './file-rules'".
- [ ] **Step 3: Implement** o módulo conforme as assinaturas (puro, sem DOM).
- [ ] **Step 4: Run** o mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `git add src/file-rules.ts src/file-rules.test.ts && git commit -m "feat: file rules with validation and descriptions"`.

---

### Task 2: Modelos de pré-visualização (JSON seguro e texto)

**Files:** Create `src/file-preview-model.ts`; Test `src/file-preview-model.test.ts`

**Interfaces — Produces:**
- `type SafeField = { label: string; value: string }`.
- `summarizeServiceAccount(text: string): { ok: true; fields: SafeField[] } | { ok: false; message: string }` — campos nesta ordem, só os presentes e do tipo string: `Tipo` (`type`), `Projeto` (`project_id`), `Conta` (`client_email`). `ok:false` com mensagem em português para JSON inválido, valor que não é objeto, ou objeto sem `project_id` nem `client_email`.
- `textPreview(text: string, maxLines?: number, maxChars?: number): { text: string; truncated: boolean }` — padrão 8 linhas e 600 caracteres.

- [ ] **Step 1: Write the failing tests**: JSON válido com `type`, `project_id`, `client_email`, `private_key: "-----BEGIN PRIVATE KEY-----ABC"` e `private_key_id: "kid123"` → `ok`, 3 campos na ordem, e **nenhum valor** contém `"BEGIN PRIVATE KEY"` nem `"kid123"` (serialize `fields` e compare); só `project_id` → 1 campo; `"{"` → `ok:false`; `"[1,2]"` e `"null"` → `ok:false`; `{"foo":1}` → `ok:false`; `textPreview` de 20 linhas curtas → 8 linhas, `truncated:true`; texto curto → igual, `truncated:false`; uma linha de 1000 caracteres → corta em 600 com `truncated:true`.
- [ ] **Step 2: Run** `... vitest run src/file-preview-model.test.ts --maxWorkers=2` — Expected: FAIL (módulo ausente).
- [ ] **Step 3: Implement** os dois helpers puros.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: safe json and text preview models`.

---

### Task 3: Geometria do enquadramento

**Files:** Create `src/image-model.ts`; Test `src/image-model.test.ts`

**Interfaces — Produces:**
- `clampZoom(zoom: number): number` — limita a `1`–`4`.
- `computeCrop(input: { naturalWidth: number; naturalHeight: number; zoom: number; offsetX: number; offsetY: number }): { sx: number; sy: number; size: number }` — recorte quadrado: `size = min(w,h)/zoom` (zoom já limitado); `offsetX/offsetY` em `[-1,1]` (fora disso são limitados) escolhem a posição dentro da folga livre: `sx = (w - size) * (offsetX + 1) / 2`, idem `sy`.
- `fitWithin(width: number, height: number, max: number): { width: number; height: number }` — mantém a proporção, arredonda, nunca amplia.

- [ ] **Step 1: Write the failing tests**: `clampZoom(0.5)=1`, `clampZoom(9)=4`, `clampZoom(2)=2`; `computeCrop` 100×100 zoom 1 → `{sx:0,sy:0,size:100}`; 200×100 zoom 1 offset 0 → `{sx:50,sy:0,size:100}`; offsetX `-1` → `sx:0`, `1` → `sx:100`; 100×100 zoom 2 offset 0 → `{sx:25,sy:25,size:50}`; zoom 2 offsets 1,1 → `{sx:50,sy:50,size:50}`; offset `5` é limitado a `1`; zoom `9` usa `4` (`size:25`); em todos os casos `sx+size <= naturalWidth` e `sy+size <= naturalHeight` (teste por laço sobre 3 imagens e zooms 1, 2.5, 4 e offsets -1, 0, 1); `fitWithin(2000,1000,1024)` → `{1024,512}`; `fitWithin(500,500,1024)` → `{500,500}`; `fitWithin(1000,3000,1024)` → `{width:341,height:1024}`.
- [ ] **Step 2: Run** `... vitest run src/image-model.test.ts --maxWorkers=2` — Expected: FAIL.
- [ ] **Step 3: Implement** as três funções puras.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: image framing geometry`.

---

### Task 4: Upload com progresso real na API

**Files:** Modify `src/api.ts`, `src/api.test.ts`

**Interfaces — Produces:**
- `uploadWithProgress<T>(path: string, file: Blob, headers: Record<string, string>, onProgress: (fraction: number) => void): Promise<T>` (interna ao módulo, exportada para teste) — `XMLHttpRequest` `PUT`, `withCredentials = true`, define cada cabeçalho, chama `onProgress(loaded/total)` em `upload.onprogress` (só se `lengthComputable`), resolve com o JSON em 2xx (`undefined` para 204), rejeita com `ApiError` (`status`, `code`, `detail` lidos do JSON de erro; textos padrão como `responseError`) em não-2xx e com `ApiError(0,"NETWORK_ERROR","Falha de rede durante o envio.")` em `onerror`.
- `putOrganizationLogoWithProgress(organizationId: string, file: Blob & { type: string }, csrfToken: string, onProgress: (fraction: number) => void): Promise<{ logo_url: string; width: number; height: number }>` — `PUT /v1/team/organizations/{id}/logo` com `Content-Type: file.type` e `X-CSRF-Token`. `putOrganizationLogo` existente fica intacta.

- [ ] **Step 1: Write the failing test** em `src/api.test.ts` com uma classe `FakeXhr` registrada via `vi.stubGlobal("XMLHttpRequest", FakeXhr)` (campos `method`, `url`, `headers`, `withCredentials`, `upload.onprogress`, `onload`, `onerror`, `status`, `responseText`; `send` guarda o corpo): (a) sucesso — após `send`, dispara `upload.onprogress({lengthComputable:true, loaded:50, total:100})` e `onload` com `status:200` e `responseText` `{"logo_url":"/m/l","width":10,"height":10}`; a promessa resolve com esse objeto, `onProgress` recebeu `0.5`, `method === "PUT"`, a URL termina em `/v1/team/organizations/o1/logo`, `withCredentials === true` e os cabeçalhos incluem `Content-Type: image/png` e `X-CSRF-Token: tok`; (b) 4xx — `status:422` com `{"code":"LOGO_TOO_BIG","detail":"Imagem grande demais."}` rejeita com `ApiError` cujo `status === 422`, `code === "LOGO_TOO_BIG"` e `detail === "Imagem grande demais."`; (c) `onerror` rejeita com `ApiError` de `status 0`.
- [ ] **Step 2: Run** `... vitest run src/api.test.ts --maxWorkers=2` — Expected: FAIL (função ausente).
- [ ] **Step 3: Implement** as duas funções reutilizando `base` e `ApiError` do módulo.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: upload with real progress for the organization logo`.

---

### Task 5: `FileDropzone`, `FilePreview` e progresso

**Files:** Create `src/FileDropzone.tsx`, `src/FilePreview.tsx`, `src/file-upload.css`

**Interfaces:**
- Consumes: T1 (`FileRule`, `validateFile`, `describeFile`, `formatBytes`), T2 (`summarizeServiceAccount`, `textPreview`).
- Produces: `FileDropzone(props: { id: string; label: string; rule: FileRule; file: File | null; onFile: (file: File | null) => void; status?: "idle" | "uploading" | "done" | "error"; progress?: number; errorMessage?: string; hint?: string; disabled?: boolean })` — área de soltar e clicar, botão real por baixo (Tab/Enter/Espaço), arrastar com borda e fundo animados, arquivo inválido com tremor curto e mensagem de `validateFile`, arquivo escolhido mostrando nome/tamanho e botões **Trocar** e **Remover**, estado `uploading` com barra (`role="progressbar"`, `aria-valuenow`) e `aria-live="polite"`, `done` com marca de verificação animada, `error` com a mensagem e **Tentar de novo** que chama `onFile` com o mesmo arquivo. Só chama `onFile(file)` para arquivos válidos.
- Produces: `FilePreview(props: { file: File })` — escolhe por `describeFile(file).kind`: **imagem** (URL de objeto liberada ao desmontar/trocar, dimensões lidas de `Image`), **pdf** (miniatura da 1ª página e número de páginas com `import("pdfjs-dist")` e o worker `pdfjs-dist/build/pdf.worker.min.mjs?url`, esqueleto enquanto renderiza, tarefa cancelada ao trocar/desmontar, mensagem amigável em falha), **json** (`summarizeServiceAccount` do texto; mostra os campos seguros ou a mensagem de erro; nunca o conteúdo bruto), **text** (`textPreview` em bloco monoespaçado), **other** (ícone, nome, extensão, tamanho).

- [ ] **Step 1: Implement `file-upload.css`** só com tokens: estados repouso/arrastando/inválido (animação `shake` curta)/selecionado/enviando/concluído (animação do check)/erro; barra com transição de largura; `@media (prefers-reduced-motion: reduce)` zera animações e transições.
- [ ] **Step 2: Implement `FileDropzone`** conforme a interface, usando `validateFile` e `describeFile`; ao trocar o arquivo limpar mensagem de erro anterior.
- [ ] **Step 3: Implement `FilePreview`** conforme a interface, com a limpeza de recursos descrita (Review Focus 5).
- [ ] **Step 4: Verify** `npx prettier --write src/FileDropzone.tsx src/FilePreview.tsx src/file-upload.css && npx tsc -b` — Expected: sem erros. (A verificação visual é feita na T9, na página de referência.)
- [ ] **Step 5: Commit** `feat: file dropzone and per-type preview`.

---

### Task 6: `ImageUploader` e o logo da parceria

**Files:** Create `src/ImageUploader.tsx`; Modify `src/OrganizationDetail.tsx` (somente o cartão do logo e o estado dele)

**Interfaces:**
- Consumes: T1 (`LOGO_RULE`), T3 (`computeCrop`, `clampZoom`, `fitWithin`), T4 (`putOrganizationLogoWithProgress`), T5 (`FileDropzone`), `ConfirmDialog`.
- Produces: `ImageUploader(props: { label: string; currentSrc: string | null; rule: FileRule; shape: "circle" | "square"; canEdit: boolean; onUpload: (file: Blob & { type: string }, onProgress: (fraction: number) => void) => Promise<void>; onRemove?: () => Promise<void> })`.
  Fluxo: escolher/soltar → **prévia "como vai aparecer"** (círculo, quadrado arredondado, fundo claro e escuro, com dimensões e tamanho) → botão opcional **Ajustar enquadramento** (moldura quadrada com zoom `clampZoom` 1–4 e posição por deslocamento; gera PNG com `computeCrop` + `fitWithin(…, 1024)` num `canvas`) → **Enviar** (barra de progresso real; sucesso com animação; erro com mensagem do servidor e **Tentar de novo** sem reselecionar). Sem ajuste, envia o arquivo original. **Remover** usa `ConfirmDialog` perigoso. Sem `canEdit`, mostra só a imagem atual.
- `OrganizationDetail`: o cartão do logo passa a renderizar `ImageUploader` (`shape="circle"`, `LOGO_RULE`), com `onUpload` chamando `putOrganizationLogoWithProgress` e depois `setLogoRevision` + aviso de sucesso, e `onRemove` chamando `deleteOrganizationLogo`; os estados e funções antigos do logo (`logoFile`, `logoBusy`, `changeLogo`, validação inline) saem.

- [ ] **Step 1: Implement `ImageUploader`** conforme a interface (a geometria vem de T3; nada de cálculo novo no componente).
- [ ] **Step 2: Rewire** o cartão do logo em `OrganizationDetail.tsx` e remover o código morto do fluxo antigo.
- [ ] **Step 3: Verify** `npx prettier --write src/ImageUploader.tsx src/OrganizationDetail.tsx && npx tsc -b` e, no navegador com rotas simuladas de organização e de `PUT/DELETE …/logo` (progresso simulado): escolher PNG, ver as prévias, ajustar e enviar, erro 422, remover com confirmação; `grep -n "logoFile\|changeLogo" src/OrganizationDetail.tsx` sem resultado. Expected: sem erros de console.
- [ ] **Step 4: Commit** `feat: image uploader with framing and progress for the partner logo`.

---

### Task 7: Controles redesenhados

**Files:** Create `src/controls.tsx`, `src/controls.css`

**Interfaces — Produces** (todos sobre `<input>`/`<details>` nativos, com foco visível e animação curta, `prefers-reduced-motion` respeitado):
- `Checkbox(props: { id: string; label: ReactNode; checked: boolean; indeterminate?: boolean; disabled?: boolean; description?: ReactNode; onChange: (checked: boolean) => void })`
- `RadioGroup(props: { name: string; legend: string; value: string; options: { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }[]; onChange: (value: string) => void })` (setas movem a seleção, como `<fieldset>` nativo)
- `Switch(props: { id: string; label: ReactNode; checked: boolean; disabled?: boolean; description?: ReactNode; onChange: (checked: boolean) => void })` com `role="switch"` e `aria-checked`
- `Disclosure(props: { title: ReactNode; defaultOpen?: boolean; children: ReactNode })` (altura animada, `aria-expanded`, usa `<button>` + região)
- `Slider(props: { id: string; label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; format?: (value: number) => string })` (rótulo e valor visíveis, trilho preenchido via variável CSS)

- [ ] **Step 1: Implement** `controls.tsx` e `controls.css` conforme as interfaces.
- [ ] **Step 2: Verify** `npx prettier --write src/controls.tsx src/controls.css && npx tsc -b`. (Verificação visual na T9.)
- [ ] **Step 3: Commit** `feat: redesigned checkbox, radio, switch, disclosure and slider`.

---

### Task 8: Arquivo do provedor com `FileDropzone`

**Files:** Modify `src/AnalysisProviderForm.tsx`

**Interfaces:** Consumes `FileDropzone`, `FilePreview`, `SERVICE_ACCOUNT_RULE`, `summarizeServiceAccount`.

- [ ] **Step 1: Replace** o `<input type="file">` do tipo Vertex por `FileDropzone` (`rule=SERVICE_ACCOUNT_RULE`) mais `FilePreview` do JSON seguro; ao escolher, ler o texto, validar JSON e `summarizeServiceAccount`, guardar o texto em `credential` (mesmo estado de hoje) e mostrar erro amigável se inválido. Remover arquivo limpa `credential`. Falha de criação continua limpando o segredo e a seleção (`fileKey` vira reset da dropzone).
- [ ] **Step 2: Verify** `npx prettier --write src/AnalysisProviderForm.tsx && npx tsc -b`; no navegador: arquivo válido com `private_key` mostra só tipo/projeto/conta; JSON inválido, arquivo `.txt` e arquivo > 64 KiB são recusados com mensagem; criação simulada com falha limpa a seleção. `grep -n 'type="file"' src/AnalysisProviderForm.tsx` sem resultado.
- [ ] **Step 3: Commit** `feat: service account upload with safe preview`.

---

### Task 9: Página de referência do design e verificação

**Files:** Create `src/DesignSystemGuide.tsx`, `src/design-guide.css`; Modify `src/App.tsx`

**Interfaces:** `DesignSystemGuide()` sem props — seções: Botões e badges, Campos (input, select, textarea, `EntityPicker`), Controles (T7), Upload (`FileDropzone` nos estados repouso/enviando/concluído/erro com um arquivo falso, `FilePreview` com amostras geradas no navegador para imagem, texto e JSON; PDF só se houver arquivo escolhido), Estados (vazio, erro, esqueleto, alertas) e o `ConfirmDialog` de exemplo. Rota `#design-system`, visível **somente para administrator** e fora do menu; qualquer outro papel cai na página padrão.

- [ ] **Step 1: Implement** a página e o roteamento em `App.tsx` (`pageFromHash`, tipo de página, regra de visibilidade por papel).
- [ ] **Step 2: Verify no navegador** (1440, 768 e 390px): todos os estados da dropzone, prévias de PNG, JPEG, PDF (arquivo real escolhido), JSON válido e inválido, TXT e tipo não suportado; teclado (Tab/Enter/Espaço/setas); com `prefers-reduced-motion` emulado as animações param. Como `viewer`, `#design-system` não abre.
- [ ] **Step 3: Final checks** `npx prettier --check src && npx tsc -b && npx oxlint src && npm run build && VITE_API_URL=http://localhost:8000 npx vitest run --maxWorkers=2` — Expected: sem erros novos, todos os testes passam; `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/file-upload.css src/controls.css src/design-guide.css` sem resultado.
- [ ] **Step 4: Commit** `feat: design system reference page and verification fixes`.
