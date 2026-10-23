# Direção visual das referências — 23/10/2026

## O que as seis imagens ensinam

As imagens `e0926e…`, `9c95a9…` e `42a4ad…` são recortes do mesmo painel CRM: fundo claro, navegação discreta, poucos indicadores no topo e dois painéis analíticos comparáveis lado a lado. A ênfase está na leitura de diferenças entre equipes, com período e estado próximos aos dados, barras compactas e uma progressão visível. Os números, categorias e metas nelas são fictícios e não representam dados da Aferis AI.

A imagem `611e077…` mostra um assistente de quatro passos. O formulário ocupa a coluna de trabalho e a prévia ocupa a coluna de contexto. Escolhas são cartões com título, descrição curta e seleção inequívoca; parâmetros relevantes aparecem junto da opção. O padrão aplicável à Aferis AI é avançar, voltar sem perder dados e revisar o efeito antes de salvar. Prévia ao vivo só deve aparecer quando o sistema realmente puder calcular ou renderizar o resultado.

As imagens `a4f867…` e `c2ffa8…` mostram listagem e detalhe simultâneos: linhas densas, estado destacado e painel de detalhe com ações e histórico. Para Aferis AI, a lista de aplicações, entregas e acessos pode abrir detalhe contextual com foco e fechamento acessíveis. Em telas estreitas, esse detalhe ocupa a tela inteira.

## Contrato de aplicação

| Área | Tarefa principal | Composição | Estado vazio | Celular |
| --- | --- | --- | --- | --- |
| Visão geral da equipe | Identificar pendências e comparar evolução real | Indicadores sucintos + comparação entre módulos autorizados | Explicar ausência de dados sem desenhar séries fictícias | Indicadores em lista curta; gráficos legíveis por módulo |
| Relatórios | Filtrar período e comparar estados | Filtro único acima; gráficos com definição e tabela acessível | Mostrar módulos disponíveis e próxima ação útil | Controles empilhados, gráficos com rolagem ou detalhe legível |
| Parceiros/aplicações | Encontrar e agir sobre um registro | Pesquisa, filtros e tabela alinhados; detalhe em painel | Ação principal contextual | Linhas viram itens compactos; filtros continuam acessíveis |
| Criação | Configurar uma parceria/aplicação corretamente | Etapas, campos agrupados, validação junto ao campo, revisão | Não aplicável | Uma etapa por vez, ação principal fixa quando útil |
| Aplicação e webhook | Configurar, testar e acompanhar a integração | Estado atual, ação seguinte, entregas e acesso | Orientação para iniciar o cadastro | Seletor de área sem aba cortada; detalhe de entrega em tela cheia |
| Acessos | Entender e revisar permissão | Ícone distinto, nome leigo, descrição curta, estado e revisão | Informar falta de permissões disponíveis | Uma permissão por linha com ação explícita |

## Regras de qualidade

- Os perfis administrador, gestor e parceiro compartilham linguagem visual; módulos e ações refletem a autorização efetiva. A API continua responsável por negar acesso não concedido.
- Não exibir UUID, enum ou código como entrada principal quando uma seleção por nome e contexto for possível.
- Usar cores Aferis existentes, texto de alto contraste, divisórias leves e raio contido; evitar cartões dentro de cartões e indicadores decorativos sem decisão associada.
- Toda comparação mostra período, unidade, fonte ou definição da métrica. Valores reais ausentes produzem estado vazio explícito.
- Efeitos de concessão, revogação, suspensão e remoção aparecem numa etapa de revisão antes da mutação.
- Entrada, foco, carregamento e transição têm movimento discreto com respeito a `prefers-reduced-motion`.

## Estado

Documento de direção para a implementação incremental do admin. Esta etapa não acrescenta métricas nem permissões no backend. Integrações e dados produtivos continuam sujeitos aos contratos e gates do backend.
