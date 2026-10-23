# Aferis AI — instruções permanentes para agentes

## Missão
Desenvolver a Aferis AI como um produto SaaS B2B de alta qualidade visual e técnica. Atue como product designer, engenheiro de design system e engenheiro front-end. Não basta compilar: as telas precisam ser inspecionadas no navegador.

## Antes de alterar
1. Leia este arquivo e as instruções de agentes mais específicas.
2. Inspecione package.json, lockfile, framework/versões, estrutura de rotas, estilos, componentes, ativos de marca, autenticação, autorização e testes.
3. Reutilize padrões e dependências existentes quando adequados. Não presuma que bibliotecas estão instaladas.
4. Preserve funcionalidades, regras de negócio, integrações, segurança e compatibilidade.
5. Faça um diagnóstico curto e plano antes de mudanças abrangentes.

## Identidade
- O nome do produto é Aferis AI.
- Não introduza o nome antigo em novas telas, documentação, componentes ou exemplos. Preserve referências legadas apenas quando necessárias à migração ou compatibilidade e documente-as.
- Não invente logotipo, cores ou tipografia oficial. Descubra os ativos existentes. Quando a identidade estiver incompleta, apresente a proposta como proposta, não como decisão aprovada.
- Use os tokens semânticos documentados em `docs/design-system/design-tokens.md`.

## Qualidade de produto e design
- Priorize alinhamento, proporções, hierarquia, tipografia, espaçamento, densidade informacional e consistência.
- Use a composição adequada à tarefa: tabela para dados comparáveis, lista para itens sequenciais, formulário para entrada, cards somente quando melhorarem a compreensão.
- Evite páginas compostas apenas por cards genéricos, excesso de bordas/sombras, gradientes decorativos, cores de destaque, emojis como ícones e valores CSS arbitrários repetidos.
- Estados obrigatórios quando aplicáveis: loading, vazio, erro, sucesso, hover, foco, selecionado, desabilitado e acesso insuficiente.
- Mantenha estabilidade de layout; filtros, menus, dropdowns e modais não devem provocar flicker, saltos ou sobreposição incorreta.
- Garanta acessibilidade, contraste, foco visível, navegação por teclado e respeito a `prefers-reduced-motion`.
- Responsividade deve ser validada em conteúdo real, não apenas em uma viewport vazia.

## Perfis, módulos e permissões
- A experiência pode variar entre administração, equipe interna, organizações e parceiros; descubra os perfis e fluxos reais antes de criar novos.
- Separe autenticação, autorização, feature flags e disponibilidade comercial de módulos.
- A navegação pode refletir permissões efetivas, mas esconder botões não é controle de segurança.
- Valide autorização no servidor para rotas, APIs, Server Actions, Route Handlers, leituras e mutações.
- Negue por padrão quando a autorização não puder ser confirmada.
- Respeite escopo e isolamento entre organizações, equipes, aplicações e parceiros.
- Não altere permissões de produção nem faça migrações destrutivas sem aprovação.
- Não invente módulos ou dados de produção. Use dados de teste seguros e identificados.

## Skills e ferramentas
- Verifique as skills e suas instruções antes de utilizá-las; confirme instalação, caminho e disponibilidade real.
- Consulte fontes oficiais e prefira skills relevantes para React, Next.js, composição de componentes, revisão de interfaces e QA visual.
- Reutilize as ferramentas de teste existentes. Considere Playwright, Storybook e testes de acessibilidade apenas quando agregarem valor e forem compatíveis com o projeto.
- Não instale dependências redundantes sem justificativa.
- Não alegue que testes, screenshots ou ferramentas foram executados se não foram.

## Ciclo obrigatório para mudanças visuais relevantes
1. Identifique o problema visual concreto e o comportamento esperado.
2. Inspecione componentes e tokens existentes.
3. Implemente a mudança no menor escopo seguro.
4. Execute a aplicação e os testes relevantes.
5. Abra a página real no navegador e capture screenshots quando possível.
6. Inspecione desktop, tablet e mobile, além dos estados interativos relevantes.
7. Corrija defeitos encontrados e repita a inspeção.
8. Verifique console, requests, overflow, acessibilidade e regressões.
9. Relate evidências reais, comandos executados, limitações e riscos.

Viewports iniciais: 1440×900, 768×1024 e 390×844. Ajuste conforme o conteúdo e dispositivos-alvo. Não invente limiares de pixel-diff sem capturas estáveis.

## Finalização
Informe arquivos alterados, decisões, testes realmente executados, screenshots/evidências disponíveis, problemas corrigidos e pendências. Se a aplicação não puder ser executada, explique o bloqueio. Nunca declare validado algo que não observou.

## Alinhamento de controles (regra permanente)
- Campo + botão na mesma linha: use `FieldAction` (`src/FieldAction.tsx`); nunca `align-items: flex-end` em linhas com rótulo ou dica. O teste `src/css-guard.test.ts` falha se aparecer um caso novo.
- Altura padrão de `input`, `select` e `.btn-md`: 36px. Na barra superior só a conta usa `margin-left: auto`.
- Antes de entregar tela ou estado novo, rode `window.__auditAlignment()` no console do dev (deve devolver `[]`) a 1440, 768 e 390px. Detalhes em `docs/design-system/layout-rules.md`.
