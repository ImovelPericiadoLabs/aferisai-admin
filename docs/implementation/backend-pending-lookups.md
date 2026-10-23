# Pendências de backend — buscas e seletores (campos que ainda dependem de ID)

Contexto: o painel passou a usar o componente `EntityPicker` (busca + seleção única ou múltipla) no lugar de campos que pediam UUID. Onde a API não oferece busca no servidor, o seletor filtra no cliente os primeiros resultados e mostra um aviso de limite. Esta lista é o que falta no backend para remover esses limites.

Contrato que o `EntityPicker` espera de qualquer lookup: `GET` com `q` (texto), `limit` e `cursor`, resposta `{ items: [...], next_cursor }`. Onde possível, cada item deve trazer um rótulo legível e um segundo texto de apoio (ex.: nome + slug).

## 1. Já funcionam com busca no servidor

| Tela | Campo | Endpoint | Observação |
| --- | --- | --- | --- |
| Regras comerciais, Promoções, Repasses, Conexões | Organização | `GET /v1/team/organizations?q=` | Só a 1ª página (20). Sem `ids=` para resolver rótulos em lote: hoje 1 chamada `GET /organizations/{id}` por valor já selecionado. |
| Regras comerciais, Conexões | Aplicação | `GET /v1/team/organizations/{id}` (campo `applications`) | Lista completa da organização, filtrada no cliente. Não existe busca global de aplicações. |

## 2. Funcionam, mas com limite (filtro no cliente) — precisam de filtros no servidor

| Tela | Campo | Endpoint atual | O que falta |
| --- | --- | --- | --- |
| Promoções | Versão de regra publicada | `GET /v1/team/commercial-policies` | Parâmetros `status`, `channel`, `organization_id`, `application_id`, `q`. Hoje só as 20 mais recentes são consideradas. |
| Repasses | Obrigações do repasse (multisseleção) | `GET /v1/team/commissions?beneficiary_organization_id=&status=owed` | Busca por texto/valor/data, ordenação e filtro `settlement_id=null`. Hoje só as 20 mais recentes. |
| Usuários | Busca por e-mail ou ID | `GET /v1/team/users` | Parâmetro `q`. Hoje a busca da tela filtra só os itens já carregados. |
| Equipe | Busca por e-mail, papel | `GET /v1/team/members` | Parâmetros `q`, `role`, `status`. Idem. |

## 3. Ainda pedem ID digitado (sem lookup disponível)

| Tela | Campo | Necessário |
| --- | --- | --- |
| Análise (revisão) | ID do trabalho | Listagem/busca de trabalhos de análise concluídos (`q`, `status`, período). |
| Classificação de fontes | ID da solicitação | A fila de pendências já aparece ao lado; falta busca de solicitações fora da fila (`GET /v1/team/source-requests?q=`). |
| Exceções financeiras | ID do novo membro ativo | Lookup de membros da organização parceira (`GET /v1/team/organizations/{id}/members?q=`). |
| Detalhe do parceiro / credenciais | Convite de membro, credenciais | Revisar quando houver lookup de pessoas/membros. |

## 4. Ações e dados de gestão que não existem na API

Estas lacunas explicam por que Usuários e Equipe são somente consulta:

- Convidar, reenviar convite, alterar papel e suspender/reativar conta (usuários e membros).
- Último acesso, 2FA/passkeys ativas e organizações vinculadas por conta.
- Parceiros: documento (CNPJ), plano, histórico de eventos e ação de suspender/reativar.
- Regras comerciais: histórico de versões, contagem de parceiros afetados e preço-base por item.

## 5. Como remover o aviso de limite depois

Cada lookup do painel está centralizado em `src/lookups.ts`. Ao entregar o endpoint, troque a função correspondente para enviar `q`/filtros ao servidor e retire o `limitNote` (`LIMIT_NOTES`) do campo. Os testes de filtro local ficam em `src/picker-model.test.ts`.
