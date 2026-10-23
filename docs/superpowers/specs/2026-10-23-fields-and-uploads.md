# Biblioteca de campos e upload de arquivos

**Data:** 2026-10-23
**Contexto:** pedido de padronizar o upload de arquivos/documentos/fotos/logos com pré-visualização e animação, e redesenhar os controles que ainda usam o visual padrão do navegador. Entra antes das ondas 2 e 3 porque a onda 3 (Dados da parceria) usa o upload do logo.
**Base:** `docs/superpowers/specs/2026-10-23-legacy-screens-migration.md` (tokens, componentes, regras gerais).

## 1. Situação hoje (levantamento)

- Há **2 uploads** no admin, ambos com `<input type="file">` nativo e sem pré-visualização: logo da parceria (PNG/JPEG até 2 MiB, `putOrganizationLogo`) e arquivo JSON da conta de serviço do provedor de IA (até 64 KiB, lido no navegador e enviado como texto).
- Visualização de PDF existe só na revisão de análise (`ReviewPage`, com `pdfjs-dist`, já dependência do projeto).
- Controles nativos sem desenho próprio: 10 checkboxes, 2 radios, 7 campos de data/hora, 2 sliders (`range`), 15 `<details>` e 23 `<select>` (estes já usam `.input`).

## 2. Princípios

- Nada de dado inventado: limites de tipo e tamanho vêm de uma tabela única no front (`file-rules.ts`) e são **duplicados do backend**; isso entra no pedido (o backend deveria expô-los).
- Validar no navegador só como ajuda; o servidor continua sendo a autoridade.
- Segredos nunca aparecem em pré-visualização: o JSON de conta de serviço mostra só campos seguros (`client_email`, `project_id`, `type`) e **oculta** `private_key`.
- Acessível por teclado e leitor de tela; animações respeitam `prefers-reduced-motion`.
- Imagem lida só no navegador (URL de objeto liberada ao desmontar); nada é enviado antes de o usuário confirmar.

## 3. Componentes

### 3.1 `file-rules.ts` (puro, testado)
- `FileRule = { kinds: ("image" | "pdf" | "json" | "text")[]; extensions: string[]; mimeTypes: string[]; maxBytes: number }`
- `describeFile(file: { name: string; size: number; type: string }): { kind: "image" | "pdf" | "json" | "text" | "other"; extension: string; sizeLabel: string }`
- `validateFile(file, rule): { ok: true } | { ok: false; code: "type" | "size" | "empty"; message: string }` (mensagens em português, com o limite legível)
- `formatBytes(bytes: number): string` (KiB/MiB, pt-BR)
- Regras nomeadas: `LOGO_RULE` (PNG/JPEG, 2 MiB), `SERVICE_ACCOUNT_RULE` (JSON, 64 KiB).

### 3.2 `FileDropzone`
Área de soltar e clicar (botão real por baixo, navegável por teclado). Estados: **repouso**, **arrastando** (borda e fundo animados), **inválido** (tremor curto e mensagem), **selecionado**, **enviando** (barra), **concluído** (check animado), **erro** (com tentar de novo). Props: `rule`, `value`, `onChange(file | null)`, `status`, `progress`, `disabled`, `label`, `hint`. Troca de arquivo e remoção sempre visíveis.

### 3.3 `FilePreview` por tipo
- **Imagem:** miniatura com dimensões e tamanho; modo logo mostra **como vai aparecer**: círculo (cabeçalho da parceria), quadrado arredondado (lista) e fundo claro/escuro.
- **PDF:** miniatura da primeira página e número de páginas, carregando `pdfjs-dist` de forma preguiçosa (só quando há PDF) e com esqueleto enquanto renderiza.
- **JSON:** resumo seguro (campos permitidos), validade do JSON e tamanho; nunca a chave privada.
- **Texto:** primeiras linhas, truncadas.
- **Outro:** ícone, nome, extensão e tamanho.
`describeFile` decide o componente; um `FilePreview` único recebe o arquivo e escolhe.

### 3.4 `ImageUploader` (fluxo de foto/logo)
Dropzone + prévia + **enquadramento opcional** (zoom e posição dentro de moldura quadrada, canvas) que gera PNG redimensionado (máx. 1024px) quando o usuário escolhe ajustar; sem ajuste, envia o arquivo original. Confirmar abre a barra de progresso. Remover usa `ConfirmDialog`. Usado no logo (onda 3) e em qualquer foto futura.

### 3.5 Progresso real
`uploadWithProgress(url, body, headers, onProgress)` em `api.ts` usando `XMLHttpRequest` (fetch não reporta envio). **Adição**, sem mudar funções existentes; o logo passa a usá-la numa variante nova `putOrganizationLogoWithProgress`.

### 3.6 Controles redesenhados (reutilizáveis, sobre inputs nativos)
- `Checkbox`, `Radio` e `Switch`: caixa própria, foco visível, estados marcado/indeterminado/desabilitado, animação curta.
- `Disclosure` (substitui `<details>`): abre com altura animada, `aria-expanded`.
- `Slider` (substitui `range` estilizado só por CSS): trilho e polegar com tokens.
- Datas e horas: manter `datetime-local` nativo, com o estilo `.input` e rótulo de fuso; sem criar calendário próprio nesta rodada.
- `<select>`: já usa `.input`; sem componente novo.

**Decisão (2026-10-23, Lucas):** o enquadramento é **opcional** e aprovado; sem ajuste, vai o arquivo original.

## 4. Aplicação nas telas
- **Já feita (onda 1):** arquivo JSON do provedor → `FileDropzone` + `FilePreview` JSON seguro.
- **Onda 3:** logo da parceria → `ImageUploader`.
- Checkboxes, radios e `<details>` existentes migram para os novos componentes tela a tela, junto com a onda que mexer na tela.

## 5. Critérios de aceite
- Testes unitários antes do código de `file-rules.ts` (tipos, tamanhos nos limites exatos, arquivo vazio, extensão em caixa alta, nome sem extensão).
- Pré-visualização verificada no navegador para PNG, JPEG, PDF, JSON válido, JSON inválido, TXT e tipo não suportado; estados repouso/arrastando/inválido/enviando/concluído/erro; `prefers-reduced-motion` desliga as animações.
- Teclado: Tab, Enter/Espaço abrem o seletor; remover e trocar acessíveis.
- Nenhuma chave privada exibida em qualquer pré-visualização (teste com JSON contendo `private_key`).

## 6. Pedido conjunto ao backend (acumulado)
As lacunas de cada rodada ficam em `docs/implementation/backend-pedido-conjunto.md` para virar um único pedido no fim. Itens que esta rodada acrescenta:
- Endpoint que informe **tipos e tamanhos permitidos** por upload (hoje duplicados no front).
- Validação prévia de JSON de conta de serviço no servidor (`project_id` coerente com o `pool_key`) sem criar a conta.
- Logo: múltiplos tamanhos (miniaturas), cabeçalhos de cache/ETag e dimensões mínimas e máximas documentadas.
- Se houver upload de documentos no portal do parceiro: varredura de vírus, limite por organização e URL assinada de download.
