# Catálogo de integração e pessoas do parceiro — desenho

**Base factual:** `docs/implementation/permission-map.md` e `permission-inventory-backend.md`. Regra do projeto: nada de dado ou ação inventados; o que ainda não existe no backend aparece como proposta, nunca como recurso.

## 1. Já entregue
- **Pessoas e convites** (aba Dados da parceria): lista com estado do vínculo e do convite, filtros com contagem, último acesso, reenviar, revogar convite, suspender e reativar acesso (administrador, com motivo de 3 a 500 caracteres e confirmação), histórico auditado em gaveta, e convite por e-mail com confirmação. Aviso fixo: o acesso vale para todas as aplicações da parceria.
- **Mapa de integrações** (`#integration-map`, só administrador, fora do menu): modos, permissões, eventos, métricas e lacunas, com situação (Implementado, Parcial, Proposta), arquivo do backend de cada fato e chave para esconder propostas. Dados em `src/integration-catalog.ts`, com teste de invariantes (por exemplo: só as três permissões reais aparecem como implementadas).

## 2. Desenho para quando o backend avançar
**Matriz de permissões por modo.** A matriz atual (blocos compactos por área) ganha três camadas, sem mudar o padrão visual:
1. **Modo:** abas ou filtro por modo (credencial de aplicação, OAuth delegado, eventos, métricas). Cada bloco mostra em qual modo a permissão vale.
2. **Risco:** selo "Dado sensível" (já usado no mapa) e confirmação reforçada com motivo para conceder escopo sensível (documento original, cobrança).
3. **Consentimento do titular:** selo "Pede aprovação do titular" nos escopos delegados; o admin concede à aplicação, o titular aprova no consentimento, e a tela mostra as duas coisas separadas.

**Eventos.** Aba Webhooks ganha lista de assinaturas por categoria de evento (hoje só `analysis.completed`), com interruptor por evento, reenvio manual na gaveta da entrega e rotação de chave com aviso de sobreposição. Depende de eventos, reenvio e rotação no backend.

**Métricas do parceiro.** O banner e a visão geral passam a mostrar séries por período (entregas por estado, latência p50 e p95), conexões ativas, análises por aplicação, e um extrato de comissão e de cupom/link no portal. Depende de atribuição por aplicação e de endpoints de métrica.

**Papéis das pessoas.** O cartão de pessoas ganha coluna de papel (dono, desenvolvedor, leitor financeiro) com troca auditada. Depende de papéis no backend. Se o produto decidir acesso por aplicação, a lista ganha filtro e vínculo por aplicação.

## 3. Estados obrigatórios (valem para tudo acima)
Carregando, vazio, erro com tentativa de novo, sem acesso, desabilitado com explicação, confirmação com motivo nas ações sensíveis, e avisos como toast (sem deslocar o layout).

## 4. Fora de escopo agora
Qualquer tela que dependa de rota inexistente: atribuição, conversão de cupom, extrato do parceiro, papéis, eventos novos.
