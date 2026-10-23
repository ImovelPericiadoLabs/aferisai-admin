# Onda 2 — Promoções e Exceções financeiras

**Data:** 2026-10-23 · **Base:** `2026-10-23-legacy-screens-migration.md` §6 (aprovado) e componentes das ondas 1 e fields-and-uploads.

## Regras
Herdadas do AGENTS.md e da migração: nenhum dado ou ação inventados (só o que `api.ts` entrega), `ConfirmDialog` em toda ação sensível, segredo exibido uma vez, estados completos, `.page` com `--content-max`, autorização no servidor.

## Promoções (administrator)
- Tabela: Organização (nome resolvido), Regra (rótulo da regra publicada quando conhecida, senão id curto), Tipo, Validade, Uso (`n de limite` + barra), Estado.
- Estado efetivo derivado no cliente a partir de campos reais: suspensa, esgotada (`use_count >= use_limit`), expirada, agendada (antes de `valid_from`), ativa. Filtros por estado com contagem.
- Criar em gaveta: seletores com busca (regra publicada de canal promoção, organização), tipo (`RadioGroup`), janela de validade, rótulo público (até 200), limite de usos (inteiro ≥ 1 ou vazio). Validação: fim depois do início.
- O código gerado aparece **uma vez** em `SecretReveal` (copiar, "Já guardei", aviso ao sair da página). Nunca vai a `localStorage`, URL ou log; o estado é descartado ao dispensar.
- Detalhe em gaveta: fatos, uso, vigência; ação **Suspender** com `ConfirmDialog` perigoso. O backend não aceita motivo nem reativa (vai ao pedido).
- Fora de escopo (sem API): reativar, histórico, motivo, busca por rótulo.

## Exceções financeiras (manager, administrator, financial)
- Fila ordenada por urgência: atrasados primeiro, depois por prazo; encerrados por último. Colunas: Caso (id curto), Valor, Prazo (badge: "Atrasado há 2 d" em perigo, "Vence em 5 h" em atenção), Etapa, Responsáveis.
- Filtros: Todos, Atrasados, Meus, Em execução, com contagem.
- Gaveta do caso: linha do tempo (bloqueio → proposta do gestor → decisão financeira → execução) e uma única próxima ação, derivada do papel e do responsável (`nextAction`). Botão sem permissão fica ausente e a razão aparece em texto ("O caso foi atribuído a outra pessoa", "Aguardando proposta do gestor", "Seu perfil só consulta").
- Confirmações: proposta e decisão financeira (motivo 10–500, resumo do caso e da proposta), reatribuição (motivo 10–500), iniciar estorno (perigoso, informa valor e que o estorno é no Asaas sandbox). Conciliar estorno e verificar correção são leituras e não pedem confirmação. Assumir não pede confirmação (reversível por reatribuição).
- Reatribuir: administrador escolhe o papel e a pessoa em seletor com busca (`GET /members`, filtrado por papel e ativo no cliente); desabilitado com explicação quando já existe proposta (gestor) ou decisão.
- Responsáveis: administrador vê o e-mail (lista de membros); os demais veem "Você" ou "Outra pessoa".
- Fora de escopo (sem API): detalhe/histórico completo, filtros no servidor, auditoria.

## Critérios de aceite
- Funções puras (`promotion-model`, `exception-model`, tons) com testes escritos antes (RED visto).
- Nenhum `window.confirm`; nenhuma confirmação inline; sem UUID digitado.
- Verificação no navegador a 1440/768/390 com dados simulados: carregando, vazio, erro, sem acesso, filtros, gaveta, `SecretReveal`, cada ação da exceção por papel; `__auditAlignment()` devolve `[]`; console sem erros.
- Revisão independente do branch e uma rodada de correções antes do envio.
