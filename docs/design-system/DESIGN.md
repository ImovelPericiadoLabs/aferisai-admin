# Aferis AI — princípios de design

## Objetivo
Uma interface SaaS B2B confiável, precisa, organizada e eficiente para operações com diferentes perfis de acesso. O design deve comunicar clareza e controle, sem decoração que concorra com o trabalho.

## Antes de decidir a aparência
1. Inventariar logo, favicon, cores, fontes e componentes já existentes.
2. Identificar telas representativas e os fluxos mais frequentes.
3. Registrar o que é oficial, o que é legado e o que ainda é proposta.
4. Capturar o estado atual para estabelecer uma referência antes de refatorar.

## Princípios
- Hierarquia inequívoca: título, contexto, ação principal, filtros e conteúdo.
- Alinhamento consistente entre título, descrição, controles e área de conteúdo.
- Proporções deliberadas: larguras de conteúdo, colunas, alturas e densidade adequadas à tarefa.
- Tipografia legível, com escala e pesos limitados e consistentes.
- Espaçamento baseado em escala, não em ajustes aleatórios por componente.
- Cores semânticas; não comunicar status apenas por cor.
- Ícones de uma família coerente, com tamanhos e traços consistentes.
- Usar tabelas, listas, formulários e gráficos quando correspondem ao modelo de informação.
- Evitar excesso de cards, bordas, sombras, gradientes, badges e elementos decorativos.
- Evitar layouts genéricos copiados entre páginas com objetivos diferentes.
- Componentes comuns devem ser consistentes; cada contexto pode ter composição própria.
- Estados de loading devem preservar a geometria do conteúdo sempre que possível.
- Em mobile, reorganizar prioridades e ações; não apenas encolher a versão desktop.

## Contextos de experiência
A interface pode oferecer experiências diferentes para administração, operação interna e parceiros. A separação deve seguir os fluxos reais e as permissões efetivas, preservando a identidade visual compartilhada.

## Registro de decisões
Para cada decisão importante, registrar: problema observado, alternativas consideradas, decisão, motivo, telas/componentes afetados e status (existente, proposto, aprovado).
