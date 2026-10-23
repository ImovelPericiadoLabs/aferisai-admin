# Onda 3 — Parceiros por dentro

**Base:** `2026-10-23-legacy-screens-migration.md` §7. **Estratégia:** migração visual e estrutural sem mudar contratos de `api.ts`, regras de negócio nem autorização. Cada fatia é verificada no navegador, revisada e enviada à `main` com autorização.

## Fatias
- **3A Parceiro por dentro:** `.page` com largura padrão, botão discreto "← Parceiros", cabeçalho (logo, nome, estado em badge, indicadores), abas `seg-tabs` (Integrações · Dados da parceria). Dados da parceria em seções: Perfil, Logo, Acesso do parceiro (convite com `ConfirmDialog`, sem autopreenchimento), Catálogo de ações (descrição editável pelo administrador).
- **3B Aplicações:** diretório (busca/estado com campos padrão, tabela `data-table`, seleção em massa) e assistente/edição em massa; o fluxo de prévia com hash é mantido como está.
- **3C Aplicação:** cabeçalho com nome e estado, abas `seg-tabs` com teclado (setas, Home, End), Visão geral com dados reais.
- **3D Abas:** Webhooks (chave em `SecretReveal`), Entregas, Credenciais (segredo em `SecretReveal`), Acessos (permissões e URIs de redirecionamento).
- **3E Portal do parceiro:** o mesmo espaço de trabalho e o mesmo visual, com o menu e o seletor de organização do parceiro.

## Regras
Nada de dado ou ação inventados; segredos aparecem uma vez; ações sensíveis com `ConfirmDialog`; campos nunca autopreenchem; estados completos; `__auditAlignment()` devolve `[]` a 1440/768/390; o teste `application-workspace.test.tsx` e os demais continuam verdes.

## Aceite por fatia
Navegador a 1440/768/390 com dados simulados, console sem erros, testes e checks finais, revisão independente antes de enviar.
