# Aferis AI Admin — Design System Refactor

**Data:** 2026-10-23  
**Escopo:** Fundação (tokens + shell) + redesign de 4 telas prioritárias  
**Referências visuais:** CRM/Optivox (azul-cinza, icon rail, painel de detalhe), style Linear/HubSpot

---

## 1. Contexto e objetivos

O painel admin acumulou 7+ arquivos CSS com regras conflitantes, 30+ valores de azul hardcoded sem semântica, escala tipográfica fragmentada (30+ tamanhos) e dois sistemas de sidebar incompatíveis convivendo no mesmo build. O resultado é inconsistência visual que não representa qualidade empresarial.

**Objetivo:** entregar um design system unificado + redesign das 4 telas mais importantes, atingindo qualidade visual comparável às referências fornecidas (CRM Optivox / Linear / HubSpot).

**Telas prioritárias:**
1. Visão Geral (tela-referência — padrões criados aqui se multiplicam nas demais)
2. Parceiros (mais complexa, gestão ruim)
3. Usuários / Equipe (admin não consegue gerenciar)
4. Regras Comerciais (tela quebrada sem contexto)

---

## 2. Fundação — Design Tokens

Arquivo destino: `src/tokens.css` (importado no topo de `src/index.css`, antes de tudo mais)

### 2.1 Cores

```css
:root {
  /* Superfícies */
  --bg:             #EEF2F8;  /* fundo de página — azul-cinza das refs */
  --surface:        #FFFFFF;  /* cards, painéis, sidebar */
  --surface-muted:  #F1F5F9;  /* hover suave, fundo de input */
  --border:         #E2E8F0;  /* separadores, borda de card */
  --border-strong:  #CBD5E1;  /* ênfase — thead, divisores importantes */

  /* Texto */
  --text:           #0F172A;  /* corpo principal */
  --text-muted:     #475569;  /* labels, subtítulos */
  --text-subtle:    #94A3B8;  /* placeholder, disabled, meta */

  /* Ação primária */
  --primary:        #075BFF;  /* botão, link, item ativo */
  --primary-hover:  #0550E6;
  --primary-faint:  #EFF6FF;  /* fundo de item ativo na nav */
  --primary-ring:   #BFDBFE;  /* borda de foco */

  /* Semânticos */
  --success:        #16A34A;  --success-bg:  #F0FDF4;
  --warning:        #D97706;  --warning-bg:  #FFFBEB;
  --danger:         #DC2626;  --danger-bg:   #FEF2F2;
  --info:           #0284C7;  --info-bg:     #F0F9FF;
}
```

### 2.2 Tipografia

```css
:root {
  --text-label:   0.6875rem;  /* 11px — badges, eyebrows, chips */
  --text-caption: 0.75rem;    /* 12px — meta, timestamps, helper */
  --text-sm:      0.8125rem;  /* 13px — corpo padrão de UI, nav, tabelas */
  --text-base:    0.875rem;   /* 14px — texto de formulário */
  --text-md:      1rem;       /* 16px — título de card */
  --text-lg:      1.125rem;   /* 18px — título de página */
  --text-xl:      1.375rem;   /* 22px — valor de métrica */
  --text-2xl:     1.75rem;    /* 28px — número hero */

  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
}
```

### 2.3 Espaçamento e geometria

```css
:root {
  /* Raios */
  --radius-sm:  4px;
  --radius-md:  6px;
  --radius-lg:  8px;
  --radius-xl:  12px;

  /* Espaçamento (× 4px) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */

  /* Estrutura */
  --sidebar-width:           60px;
  --sidebar-width-expanded:  220px;
  --topbar-height:           52px;
  --content-max:             1360px;
}
```

---

## 3. Shell — Icon Rail + Topbar

### 3.1 Layout geral

```
grid: [60px icon rail] [1fr conteúdo]
```

- Background da página: `--bg` (`#EEF2F8`)
- Sidebar: `--surface` (branca), `border-right: 1px solid var(--border)`
- Topbar: `--surface`, `border-bottom: 1px solid var(--border)`, `height: var(--topbar-height)`

### 3.2 Icon rail (sidebar)

- **Largura:** 60px fixo (colapsado padrão) / 220px (expandido)
- **Logo:** área de 56px no topo, ícone centralizado 32×32px
- **Nav items:** botão 40×40px centralizado, `border-radius: var(--radius-md)`, ícone SVG 20×20px
  - Default: cor `--text-muted`
  - Hover: fundo `--surface-muted`, cor `--text`
  - Ativo: fundo `--primary-faint`, cor `--primary`
  - Tooltip ao hover: nome da seção, aparece à direita, 200ms delay
- **Agrupamento:** linha `1px solid var(--border)` entre grupos (Painel / Operação / Comercial / Financeiro / Conta)
- **Rodapé:** avatar do usuário (28×28px, `border-radius: var(--radius-md)`), centralizado
- **Toggle:** botão no topo do rail para expandir/colapsar (mostra labels quando expandido)

### 3.3 Topbar

- **Esquerda:** nome da seção atual em `var(--text-md)` / `var(--weight-bold)`
- **Direita:** nome do usuário + role em `var(--text-caption)` / `var(--text-muted)` + avatar clicável com menu dropdown
- **Ações contextuais:** botão primário injeta-se à direita quando a tela tem ação principal (ex: "Nova organização" em Parceiros)

### 3.4 Estado expandido (220px)

Quando expandido:
- Logo exibe logotipo completo (116px)
- Nav items: `height: 34px`, `padding: 0 10px`, `gap: 10px`, `border-radius: var(--radius-md)`, label `var(--text-sm)` / `var(--weight-medium)`
- Grupos com label de seção `var(--text-label)` uppercase, `--text-subtle`

---

## 4. Componentes base

Estes componentes devem existir como classes reutilizáveis em `src/tokens.css` ou `src/components.css`:

### 4.1 Botões

```
.btn           — base
.btn-primary   — --primary bg, branco
.btn-secondary — --surface bg, --border border, --text
.btn-ghost     — transparente, --text-muted, hover --surface-muted
.btn-danger    — --danger bg, branco
.btn-sm        — height: 30px, padding: 0 10px, font: --text-caption
.btn-md        — height: 36px, padding: 0 14px, font: --text-sm   (padrão)
.btn-lg        — height: 42px, padding: 0 18px, font: --text-base
```

### 4.2 Badges / Status pills

```
.badge            — base: padding 2px 8px, radius --radius-sm, font --text-label, weight 600
.badge-success    — --success-bg, --success
.badge-warning    — --warning-bg, --warning
.badge-danger     — --danger-bg, --danger
.badge-info       — --info-bg, --info
.badge-neutral    — --surface-muted, --text-muted
```

### 4.3 Cards

```
.card             — --surface bg, border 1px --border, radius --radius-lg, sem sombra
.card-body        — padding: var(--space-5)
.card-header      — padding: var(--space-4) var(--space-5), border-bottom: 1px --border
.card-footer      — padding: var(--space-3) var(--space-5), border-top: 1px --border
```

### 4.4 Tabelas

```
table.data-table  — width 100%, border-collapse: collapse
thead th          — --text-label uppercase, --text-muted, border-bottom 1px --border-strong, padding 8px 12px
tbody td          — --text-sm, --text, padding 10px 12px, border-bottom 1px --border
tbody tr:hover    — background: --surface-muted
```

### 4.5 Painel de detalhe (drawer)

Padrão lista + painel lateral — resolve Parceiros e Usuários:
```
.detail-panel     — posição fixed right 0, width 480px, height 100vh
                    background --surface, border-left 1px --border
                    z-index 30, transform translateX(100%) → translateX(0) ao abrir
.detail-panel-header — padding 16px 20px, border-bottom 1px --border
                       flex, justify-content space-between, align-items flex-start
.detail-panel-body   — overflow-y auto, padding 20px, flex 1
.detail-panel-footer — padding 12px 20px, border-top 1px --border
                       flex, gap 8px (botões de ação)
```

### 4.6 KPI Card (dashboard)

```
.kpi-card         — .card + padding 20px
.kpi-icon         — 32×32px, radius --radius-md, grid place-items center
.kpi-label        — --text-label, --text-muted, weight 500, margin-bottom 8px
.kpi-value        — --text-xl, --text, weight 700, letter-spacing -0.04em
.kpi-sub          — --text-caption, --text-subtle, margin-top 4px
```

---

## 5. Visão Geral — tela-referência

### 5.1 Estrutura

```
page-header: título + ações (refresh + timestamp)
kpi-strip:   4 cards em grid auto-fit minmax(200px, 1fr)
attention:   banner condicional (só se houver itens)
trend:       card full-width com gráfico de área + seletor de período
groups:      grid 2 colunas (análises / pedidos / financeiro / comissões)
reports-cta: card link para Relatórios
```

### 5.2 KPI strip (4 métricas)

| Card | Ícone | Valor | Sub-label |
|------|-------|-------|-----------|
| Análises | document | count | "este mês" |
| Pedidos | list | count | "aguardando" |
| Repasses | payment | R$ amount | "pendentes" |
| Exceções | warning | count | badge --danger se > 0 |

### 5.3 Banner de atenção

- Só renderiza se `data.attention?.length > 0`
- `border-left: 3px solid var(--warning)`, `background: var(--warning-bg)`, `border-radius: var(--radius-md)`
- Texto: "N itens aguardam decisão" + link "Ver pedidos →"
- Sem caixa dramática — só uma faixa discreta

### 5.4 Gráfico de tendência

- Card full-width, header com título + seletor de período (pills: 7d / 30d / 90d)
- Área SVG responsiva, gradiente de fill `--primary` opacidade 12% → 0%
- Eixos: linhas `--border` tracejadas, labels `--text-subtle` `--text-caption`
- Linha principal: `--primary` 2px

### 5.5 Cards de grupo (2 colunas)

Cada card segue o padrão:
```
header: [ícone 32px] [título bold] [total à direita]
───────────────────────────────────────────────
status list:
  ● dot  label              número
  ● dot  label              número
  (border-top --border entre linhas)
───────────────────────────────────────────────
mini-chart: barras 48px height, últimas 8 semanas
───────────────────────────────────────────────
footer: [Ver detalhes →] link --primary
```

Cores dos dots por status (semânticas, não decorativas):
- Em processamento / análise: `--info`
- Aprovado / concluído: `--success`
- Pendente / aguardando: `--warning`
- Erro / exceção: `--danger`
- Neutro / arquivado: `--text-subtle`

---

## 6. Parceiros — padrão lista + detalhe

### 6.1 Problema atual

Tela monolítica sem hierarquia clara, sem painel de detalhe, gestão impossível de fazer de forma fluida.

### 6.2 Novo layout

```
[topbar: Parceiros] [+ Nova organização btn-primary]

Filtros: [busca] [status dropdown] [tipo dropdown]

Tabela full-width:
  # | Organização | CNPJ | Plano | Status | Ativo desde | →

Ao clicar na linha: abre .detail-panel pela direita
```

### 6.3 Painel de detalhe — Parceiro

```
header:
  Nome da organização (text-lg bold)
  CNPJ · Tipo          [badge status]
  [Editar] [⋯ mais ações]

body (seções):
  Informações gerais
    Razão social, endereço, contato
  Plano e comercial
    Plano ativo, validade, regra comercial vinculada
  Aplicações
    Lista de apps vinculados com status individual
  Histórico
    Timeline de eventos (ativação, mudanças de plano)

footer:
  [Desativar] (btn-ghost danger) · · · [Salvar alterações] (btn-primary)
```

---

## 7. Usuários / Equipe — gestão real

### 7.1 Problema atual

Não é possível ver detalhes, editar perfil, alterar role ou desativar uma conta.

### 7.2 Novo layout

Duas sub-abas no topbar: **Usuários** (contas de plataforma) e **Equipe** (membros internos)

```
Filtros: [busca por nome/email] [role dropdown] [status]

Tabela:
  Avatar | Nome | E-mail | Role | Status | Último acesso | →

Painel de detalhe:
  header: Avatar + nome + email + badge role + badge status
  body:
    Informações da conta (criação, último acesso, 2FA ativo)
    Permissões / Role (dropdown editável)
    Passkeys associadas
    Organizações vinculadas
  footer:
    [Suspender conta] · [Redefinir acesso] · [Salvar]
```

---

## 8. Regras Comerciais — contexto e fluxo

### 8.1 Problema atual

Tela sem contexto, estrutura obscura, nunca usada porque não faz sentido sozinha.

### 8.2 Novo layout

```
page-header:
  Regras Comerciais
  "Versões de preço e condições aplicadas a organizações."
  [+ Nova regra] (btn-primary)

Lista de regras (cards verticais, não tabela — cada regra é complexa):

  ┌─ Regra: Padrão 2024 ────────────────── [Ativa] ─┐
  │  Criada em 01/03/2024 · Aplicada a 14 parceiros  │
  │                                                   │
  │  Análise de imóvel   R$ 89,90                    │
  │  Certidão simples    R$ 12,00                    │
  │  + 3 serviços                                    │
  │                                        [Ver →]   │
  └───────────────────────────────────────────────────┘

Ao clicar "Ver": painel lateral com:
  header: nome da regra + status + data
  body:
    Tabela de serviços × preços
    Lista de parceiros que usam essa regra
    Histórico de versões
  footer:
    [Duplicar] [Arquivar] [Definir como padrão]
```

---

## 9. Estratégia de migração CSS

### 9.1 Ordem de execução

1. Criar `src/tokens.css` com todas as variáveis CSS
2. Atualizar `src/index.css` — limpar valores hardcoded, usar tokens
3. Reescrever `src/App.css` — remover estilos de componente, manter só layout base
4. Reescrever `src/shell.css` — novo icon rail + topbar usando tokens
5. Reescrever `src/dashboard.css` — Visão Geral usando tokens + novos componentes
6. Criar padrões de `.card`, `.btn`, `.badge`, `.data-table`, `.detail-panel` em `src/components.css`
7. Adaptar `src/directory.css` → Parceiros
8. Adaptar `src/Users.tsx` / `src/TeamMembers.tsx` → Usuários/Equipe
9. Adaptar `src/CommercialPolicies.tsx` → Regras Comerciais

### 9.2 Arquivos CSS a deletar após migração

- `src/operational-polish.css` — consolidar em tokens/components
- `src/brand.css` — mover o necessário para tokens
- CSS por-tela que for subsumido pelos componentes base

### 9.3 Regras de migração

- **Nenhum hex hardcoded** nos componentes — sempre `var(--token)`
- **Nenhum tamanho de fonte direto** — sempre `var(--text-*)`
- **Sem `!important`** — resolver conflitos por especificidade ou reestruturar
- CSS por-tela existe apenas para layout específico daquela tela; estilos de componente vão em `components.css`

---

## 10. Critérios de aceite

- [ ] Sidebar: icon rail funcional com toggle expandir/colapsar
- [ ] Fundo de página: `#EEF2F8` em todas as telas
- [ ] Zero hex hardcoded nos arquivos CSS de componente
- [ ] Escala tipográfica: apenas `var(--text-*)` em uso
- [ ] Visão Geral: KPI strip, trend chart, 4 group cards, banner de atenção condicional
- [ ] Parceiros: tabela + painel de detalhe abrindo ao clicar
- [ ] Usuários/Equipe: sub-abas, tabela, painel com edição de role
- [ ] Regras Comerciais: lista de cards com contexto + painel de detalhe
- [ ] Estados: loading skeleton, empty state, erro em todas as telas redesenhadas
- [ ] Responsivo: funcional em 1440px, 768px e 390px
- [ ] Acessibilidade: foco visível, contraste mínimo 4.5:1, navegação por teclado
