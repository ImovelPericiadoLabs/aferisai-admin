# Migração das telas antigas para o novo design

**Data:** 2026-10-23
**Base:** `docs/superpowers/specs/2026-10-23-design-system-refactor.md` (tokens, shell, componentes) já em `main`.
**Fontes deste desenho:** leitura do front das telas, leitura do backend (`/home/bugson/Projetos/AferisAI/backend`, somente leitura) e revisão em produção.

## 1. Objetivo e regras

Levar para o design novo todas as telas que ainda usam o visual antigo, expondo o que o backend **já** permite (inclusive granularidade de permissão) e registrando num pedido ao backend, depois da revisão, o que falta.

Regras que valem para tudo (herdadas do AGENTS.md):
- Nunca inventar dado, ação ou módulo. Tela mostra só o que a API entrega.
- Esconder botão não é segurança; o servidor valida. A UI trata 401/403 como esperados.
- Ações sensíveis usam `ConfirmDialog` (nunca `window.confirm` nem confirmação inline). Onde o backend exige motivo, o diálogo pede o motivo.
- Segredos (código de promoção, `client_secret`, chave de webhook, segredo de provedor) aparecem uma vez, com cópia, e nunca vão para `localStorage`, URL ou log.
- Campos do painel nunca autopreenchem (já garantido por `installNoAutofill`).
- Estados obrigatórios: carregando, vazio, erro, sucesso, sem acesso, desabilitado com explicação.
- Conteúdo centralizado com largura máxima `--content-max` (1600px) em **todas** as telas.

## 2. Decomposição

| Onda | Telas | Estado deste documento |
| --- | --- | --- |
| 1 | Componentes comuns; Minhas chaves; Permissões; Provedores de IA | Desenho completo abaixo |
| 2 | Promoções; Exceções | Esboço em §6; spec próprio antes de implementar |
| 3 | Parceiros por dentro: Dados da parceria, Aplicações (diretório, assistente, edição em massa) e as 5 abas da aplicação, incluindo o lado do parceiro | Esboço em §7; spec próprio antes de implementar |

Cada onda segue: spec -> plano -> implementação -> revisão independente -> pedido ao backend com o que faltou.

Correção rápida antes das ondas: páginas antigas esticam em tela larga porque seus contêineres (`.content`, `.detail`, `.review-page`) não têm largura máxima. Aplicar `max-width: var(--content-max)` centralizado a esses contêineres em `shell.css`.

## 3. Componentes comuns (onda 1)

### 3.1 `ConfirmDialog` com motivo
Novo parâmetro opcional `reason: { label: string; min: number; max: number }`. Com ele o botão de confirmar só habilita com motivo válido e `onConfirm(reason)` recebe o texto. Função pura `validateReason(text, min, max)` (testada): corta espaços, devolve `{ ok, length, message }`.
Valores do backend: exceções e provedores exigem 10 a 500 caracteres.

### 3.2 `SecretReveal`
Mostra um segredo uma única vez: caixa monoespaçada, botão **Copiar** com retorno "Copiado", aviso "Aparece uma única vez", botão "Já guardei" para dispensar, e `beforeunload` ativo enquanto o segredo está visível e não foi dispensado. Usado nas ondas 2 e 3 (promoção, credencial, webhook) e na criação de provedor.

### 3.3 Tons de status
Módulo puro `status-tones.ts` (testado) que mapeia estados do domínio para `badge-*`: provedor (`draft` neutro, `active` sucesso, `suspended` atenção), promoção, exceção, passkey. Evita lógica de cor espalhada.

### 3.4 Contêiner de página
Todas as telas migradas usam `.page` (largura máxima centralizada) e o cabeçalho `page-header`.

## 4. Telas da onda 1

### 4.1 Minhas chaves (`passkeys`) — todos os papéis
Dados reais (`PasskeyItem`): `id`, `label`, `created_at`, `last_used_at`.
- Cabeçalho: título "Minhas chaves de acesso" e uma linha explicando o benefício (entrar sem senha e código).
- Indicador "n de 5 chaves" (limite do backend: 5 ativas). Botão **Adicionar chave** desabilitado com explicação ao atingir o limite.
- Tabela: nome, criada em, **último uso** ("Nunca usada" quando nulo), ação Revogar.
- Adicionar: nome obrigatório (validado no campo, com `required`), depois o diálogo do dispositivo. Diferenciar "você cancelou no dispositivo" (mensagem neutra, sem erro) de falha real (função pura `passkeyErrorKind`, testada). 401 chama `onUnauthorized`.
- Revogar: `ConfirmDialog` perigoso. Se for a última chave, avisar que voltará a entrar só com senha e código do autenticador.
- Navegador sem suporte: alerta persistente e controles desabilitados.
- Carregando: esqueleto (hoje aparece o vazio durante a carga).
- Fora de escopo (sem API): sessões ativas, trilha de uso. Vão ao pedido.

### 4.2 Permissões (`access`) — viewer, manager, administrator (financial não vê, como hoje)
Deixa de ser página estática. Três abas.
1. **Meu acesso:** papel atual (rótulo), áreas que ele alcança e o que pode fazer em cada uma, derivado da matriz da aba 2. Texto fixo: a interface só esconde; quem decide é o servidor.
2. **Papéis:** matriz papel × capacidade (viewer, manager, administrator, financial). Linhas somente com regras **verificadas no backend**:
   - ver organizações e aplicações: viewer, manager, administrator;
   - editar perfil, descrever e conceder/revogar permissões, emitir/revogar credencial, webhooks, redirect URIs, revogar conexão: manager, administrator;
   - convidar pessoa do parceiro: administrator;
   - listar contas de usuário: manager, administrator;
   - listar membros da equipe: administrator;
   - regras comerciais e promoções: administrator;
   - contas de provedor de IA: administrator;
   - exceções financeiras: assumir (manager, administrator, financial), reatribuir (administrator), propor (manager, administrator), confirmar e executar estorno/correção (financial);
   - revisão humana de análise: manager, administrator;
   - passkeys e sessão próprias: todos.
   Nota: `financial` é separado da hierarquia; administrador não assina pelo financeiro. A matriz é uma **referência fixa** nesta versão; a fonte dinâmica (`GET /v1/team/roles`) vai ao pedido ao backend. Os dados ficam em `access-matrix.ts` com teste que garante a forma (4 papéis por linha, sem linha vazia).
3. **Aplicações:** escolher a organização (seletor com busca) e ver a matriz aplicação × permissão do catálogo (`getOrganization`: `applications[].permissions`, `permissions[]` com código e descrição). Conceder/revogar com `ConfirmDialog` (sem motivo, porque o backend não aceita; fica no pedido). Somente manager e administrator alteram; viewer só lê. Aplicação ou organização suspensa: linhas desabilitadas com o motivo ("a aplicação está suspensa"). Cada célula mostra o rótulo humano via `scopeLabel`.
   Sem histórico de quem concedeu o quê: não existe rota; vai ao pedido.

### 4.3 Provedores de IA (`analysis-providers`) — somente administrator
Dados reais (`AnalysisProviderAccount`): `label`, `kind`, `model`, `location`, `pool_key`, `execution_profile_sha256`, `credential_hint`, `base_url`, limites, `priority`, `status` (draft, active, suspended), `version`, `created_at`, `updated_at`.
- Tabela: rótulo, tipo, modelo, pool, estado, prioridade, limites resumidos. Filtros por estado.
- Gaveta de detalhe: identificação, perfil de execução (hash abreviado + copiar), dica da credencial, limites em unidades humanas (R$/dia em vez de centavos, requisições/min, tokens/min, chamadas/dia, concorrência).
- Ações, todas com `ConfirmDialog` e motivo (10–500):
  - **Salvar limites** (`PATCH /limits`, `expected_version`);
  - **Ativar** (`POST /activate`): novo no admin, o backend já oferece. Corpo: `expected_version`, `model` (`gemini-3.5-flash-lite`), `expected_profile_sha256` (do próprio item), `external_reserved` (0–12), `reason`. Só para `draft`;
  - **Suspender** (`POST /suspend`).
  Conflito de versão (409): recarregar o item e avisar, sem perder o texto do motivo.
- Criar conta: gaveta com campos por tipo; segredo por arquivo JSON (Vertex) ou campo de senha, nunca exibido depois; `SecretReveal` não se aplica (o segredo não volta). Limites em unidades humanas convertidas na borda.
- Reativar conta suspensa, rotacionar segredo e histórico: não existem; vão ao pedido.
- Copy: remover jargão ("Imovel") e explicar de forma neutra o limite conjunto de 12 chamadas simultâneas e que as contas ainda não são usadas pelo worker.
- Funções puras testadas: `limitsToForm` / `formToLimits` (centavos, reais, validação de faixas), `providerStatusTone`.

## 5. Critérios de aceite da onda 1
- Nenhum `window.confirm` restante nas três telas (grep).
- Todas as telas centralizadas com `--content-max`; estados de carregando, vazio, erro, sem acesso e desabilitado-com-explicação verificados no navegador a 1440, 768 e 390px.
- Testes das funções puras escritos antes do código (RED visto).
- Revisão independente do diff antes de enviar ao `main`.
- Nenhuma mudança em contratos existentes de `api.ts`; apenas a adição de `activateAnalysisProviderAccount`.

## 6. Esboço da onda 2
- **Promoções:** tabela (organização e regra por nome, tipo, validade, uso, estado), criação em gaveta com seletores, código criado em `SecretReveal`, suspender com confirmação. `getPromotion` e filtro por regra existem e não eram usados. Sem motivo/auditoria/reativar no backend.
- **Exceções:** fila com prazo (atrasado em destaque), etapa do fluxo (assumir, propor, confirmar, executar), responsáveis resolvidos por e-mail quando o papel permite, motivos 10–500, estorno e confirmação financeira com `ConfirmDialog` perigoso, botões desabilitados com explicação ("o caso foi atribuído a outra pessoa"). Falta detalhe do caso, histórico e filtros no backend.

## 7. Esboço da onda 3
- Dados da parceria: perfil, logo, catálogo de ações (managers também podem, como o backend), convites; falta lista de pessoas do parceiro.
- Aplicações: diretório, assistente e edição em massa (manter o fluxo de prévia com hash, que é o melhor da área).
- Aplicação: Visão geral com dados reais (webhook, credenciais ativas de 2, última entrega, permissões); Webhooks (segredo em `SecretReveal`); Entregas (filtros com nomes honestos); Credenciais (cópia do segredo, guia emitir-nova-e-revogar-a-antiga); Acessos (permissões e redirect URIs em lista com validação, sem expor "Versão n"). Uma só navegação para equipe e parceiro; remover `AdditionalApplicationForm` (sem uso).

## 8. Pedido ao backend (a escrever após a revisão do design)
Candidatos já identificados: matriz de papéis (`GET /v1/team/roles`); sessões e passkeys (listar/encerrar sessões, trilha de eventos, limite de 5 exposto); `reason` e histórico em conceder/revogar permissão, criar/suspender promoção, revogar credencial e remover webhook; reativar promoção e conta de provedor; histórico e rotação de segredo de provedor; detalhe e filtros de exceções; suspender/reativar aplicação isolada e organização; trocar URL e rotacionar chave de webhook; reenviar entrega e filtrar por data; pessoas e convites do parceiro.
