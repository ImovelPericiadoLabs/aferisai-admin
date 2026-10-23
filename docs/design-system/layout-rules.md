# Regras de alinhamento e layout

Estas regras existem porque campos e botões na mesma linha já saíram desalinhados (botão preso ao rodapé do campo, seletor de parceria flutuando no centro da barra superior). Elas têm verificação automática.

## 1. Campo + botão na mesma linha
Use `FieldAction` (`src/FieldAction.tsx`): rótulo em cima, **input e botão na mesma linha com a mesma altura**, dica embaixo.
Nunca alinhe um botão pelo rodapé (`align-items: flex-end`) de um bloco que contém rótulo e dica: a dica empurra o botão para baixo do input.

## 2. Alturas padrão
`input`, `select` e `.btn-md` têm 36px. `.btn-sm` (30px) só aparece em linhas sem input. Não defina `height`/`min-height` de controle fora de `components.css`.

## 3. Barra superior
Ordem: título → contexto (por exemplo, seletor de parceria, com margem fixa `var(--space-4)`) → conta, que é o único item com `margin-left: auto`. Dois irmãos com `margin-left: auto` dividem o espaço livre e um deles fica no meio.

## 4. Linhas de filtros e barras de ferramentas
Todos os controles de uma linha usam `align-items: center` e a mesma altura. Se um campo tem rótulo e outro não, coloque o rótulo em `sr-only` ou use `FieldAction`.

## Como a regra é verificada
- **Teste estático** `src/css-guard.test.ts`: falha se um CSS novo usar `align-items: flex-end`/`end` fora da lista permitida (títulos ao lado de ações e gráficos). A lista de "legado a migrar" não deve crescer.
- **Auditoria em tempo de execução** (`src/alignment-audit.ts`): em `npm run dev`, rode `window.__auditAlignment()` no console. A resposta deve ser `[]`. Cada item devolvido mostra os dois controles e o motivo ("alturas diferentes" ou "centros desalinhados"). Rode em **cada tela e cada estado novo** (gaveta aberta, diálogo, formulário com erro, mobile).
- **Antes de enviar uma tela nova:** auditoria `[]` a 1440, 768 e 390px.
