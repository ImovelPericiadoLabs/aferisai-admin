# Padrão de payloads de webhook e simulação de eventos

> **Atualização (backend `bff5303`, PRs #58, #61 a #65):** o backend adotou o padrão proposto abaixo. Hoje o corpo é um envelope v1 (`id`, `event`, `version`, `occurred_at`, `application_id`, `connection_id`, `data`), a assinatura é `HMAC-SHA256(chave, "<X-Aferis-Timestamp>.<corpo>")`, há `X-Aferis-Key-Version`, reenvio com recuo, reenvio manual, rotação de chave, seleção de eventos e simulação por `event_type`. Eventos reais: `analysis.created` e `analysis.completed`; `webhook.test` é só de teste. As seções 1 a 4 ficam como histórico da proposta; a fonte da verdade é `src/webhook-payloads.ts`, testado contra valores gerados pelas funções do backend.

**Respondendo à pergunta:** faz sentido, sim. O parceiro precisa de um payload de exemplo fiel, de um jeito de validar a assinatura antes de ligar o webhook e de poder simular os eventos que ele vai escutar. Hoje o backend só envia `webhook.test`; o resto vira proposta.

## 1. O que existe hoje (fato)
- Corpo = JSON compacto, chaves ordenadas, não ASCII escapado (`ç`), com `id`, `event`, `occurred_at` e os campos do evento no mesmo nível (`app/integrations/svc/webhook_transport.py:17-30`).
- Assinatura = `X-Aferis-Signature: sha256=<hex HMAC-SHA256(chave, bytes do corpo)>`; também `X-Aferis-Event-Id` e `Content-Type: application/json`.
- `analysis.completed` leva `analysis_request_id` e `connection_id` (`workers/lanes/webhook_delivery_worker.py:97-103`); `webhook.test` leva `message` (`app/integrations/svc/webhook_tests.py:48-51`).
- Sem versão do formato, sem carimbo de tempo na assinatura, um POST sem reenvio.

## 2. O que o admin entrega agora
Na aba Webhooks, o cartão **Eventos e payloads** mostra, para cada evento (os 2 que existem e 4 propostas, marcadas):
- **Requisição:** cabeçalhos e corpo de exemplo, com assinatura calculada de verdade no navegador com uma chave de exemplo pública; botão de copiar; os bytes exatos que a assinatura cobre.
- **Campos:** envelope e campos do evento, com tipo e descrição.
- **Validar assinatura:** código em Node.js e Python, e um vetor de teste (chave, corpo e assinatura esperada) para o parceiro conferir a implementação dele.
- **Testar localmente:** comando cURL pronto para o endereço do próprio webhook, com aviso de que não é enviado pela Aferis.

O código de assinatura do admin (`src/webhook-payloads.ts`) é testado contra valores gerados pelo algoritmo do próprio backend (Python), byte a byte, incluindo escape de acento, aspas, controle e emoji. Se o backend mudar o formato, o teste do admin deve ser atualizado junto.

## 3. Padrão proposto para todos os eventos (antes de abrir ao público)
As rotas de parceiro ainda respondem 503, então este é o melhor momento para fixar o contrato:
1. **Envelope único e versionado:** `id`, `event`, `occurred_at` (ISO 8601 UTC), `version` (inteiro) e `application_id` e `connection_id` sempre presentes; dados específicos em `data`. Hoje os campos ficam misturados no topo; mover para `data` evita colisão de nomes.
2. **Convenções:** `snake_case`, identificadores UUIDv7 em texto, valores monetários em centavos como inteiro, datas em UTC, nada de dado pessoal ou segredo.
3. **Um único catálogo, no backend:** esquema (JSON Schema) e exemplo por evento, servidos por API, para o admin e a documentação nunca divergirem.
4. **Idempotência:** `id` estável por evento, repetido no reenvio (ver item de reenvio do pedido 003).
5. **Assinatura com carimbo de tempo** (por exemplo `t=` no cabeçalho, assinando `t.corpo`) para proteger contra replay.

## 4. Simulação de eventos (proposta)
- **Teste por tipo:** `POST /v1/{team|partner}/applications/{id}/webhook-endpoint/test` aceitar `event_type` do catálogo. A Aferis envia o evento com dados fictícios identificados (`"sandbox": true`), assinado com a chave real do endpoint, mesma cota de 10 por hora, sem tocar em análise, cobrança ou comissão reais.
- **Payload no detalhe da entrega:** devolver o corpo enviado (só ids; sem chave nem dado pessoal), para o parceiro depurar o que recebeu.
- **Reenvio manual** de uma entrega, auditado.
Até lá, o parceiro simula localmente com o cURL do admin e o vetor de teste.
