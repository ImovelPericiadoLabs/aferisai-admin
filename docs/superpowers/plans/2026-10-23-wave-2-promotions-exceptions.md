# Onda 2 — Plano

**Spec:** `docs/superpowers/specs/2026-10-23-wave-2-promotions-exceptions.md`. Execução nativa, TDD nos módulos puros.

- [ ] T1 `src/promotion-model.ts` + teste: `promotionState`, `promotionStateLabel/Tone`, `usageOf`, `countByState`, `filterPromotions`, `initialPromotionForm`, `validatePromotionForm`.
- [ ] T2 `src/exception-model.ts` + teste: `dueState`, `stageOf`, `nextAction`, `filterCases`, `sortByUrgency`, `reassignBlock`.
- [ ] T3 `src/SecretReveal.tsx` + css, e `src/status-tones.ts` (promoção/etapa).
- [ ] T4 Promoções: `Promotions.tsx` (tabela, filtros, gaveta de detalhe), `PromotionForm.tsx` (gaveta de criação), `promotions.css`.
- [ ] T5 Exceções: `FinancialExceptions.tsx` (fila + gaveta), `ExceptionPanel.tsx`, `lookups.ts` (`searchTeamMembers`), `financial-exceptions.css` substitui o CSS legado.
- [ ] T6 Verificação no navegador, auditoria, checks finais, revisão independente, correções, envio com autorização.
