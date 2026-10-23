# Auditoria da interface publicada — 23/10/2026

Ambiente: `https://app.synthosia.com/`, sessão autenticada de administrador. Revisão visual e funcional no Chrome, em desktop e viewport de 390 × 844 px. Nenhum registro, permissão, credencial, webhook ou configuração foi alterado.

## Prioridade alta

| Área | Evidência e reprodução | Correção esperada |
| --- | --- | --- |
| Parceiros → Novo parceiro | A listagem leva ao formulário antigo “Nova organização”, com nome, slug e primeira aplicação na mesma tela. O fluxo não segue as etapas e revisão adotadas em “Nova aplicação”. Enviar vazio depende da validação nativa do navegador. | Unificar a experiência de criação: dados da parceria, aplicação inicial, permissões e revisão; erros junto aos campos. |
| Aplicação → Acessos | Cada permissão tem `Revogar` ou `Conceder` diretamente. O clique chama a mutação sem revisão intermediária (`src/ApplicationWorkspace.tsx:398`, `src/OrganizationDetail.tsx:389`). Não executei a mutação. | Confirmar impacto e aplicação antes de revogar ou conceder, especialmente quando credenciais ativas dependem da permissão; mostrar resultado e trilha. |
| Conexões | O filtro principal pede `ID da aplicação (UUID)` e seu rótulo está oculto com `display: none` (`src/Connections.tsx:175`). | Seleção por nome entre aplicações autorizadas, com nome acessível; deixar UUID apenas no detalhe técnico. |
| Promoções | O cadastro exige UUID da versão comercial e UUID da organização, e a instrução mostra o enum `promotion` (`src/Promotions.tsx:212`). | Seletores por nome, estado e vigência, com linguagem de produto; validar a combinação antes de salvar. |
| Governança → Permissões | A página afirma que o cadastro concede somente `application:read` (`src/App.tsx:747`), mas o criador de aplicações oferece mais permissões e as aplicações existentes exibem três concedidas. | Mostrar o catálogo real, descrições em português, responsáveis e efeito das concessões; eliminar informação desatualizada. |
| Webhooks ativos | No destino ativo, a tela apresenta URL, suspender e remover. A ação “Enviar teste” só integra o cadastro inicial; não há reteste visível para o endpoint já ativo. | Permitir teste assinado sob demanda, com resultado e histórico distinguíveis de eventos reais. |

## Prioridade média

| Área | Evidência e reprodução | Correção esperada |
| --- | --- | --- |
| Webhooks → nova URL | Digitar `abc` e avançar mostra a dica nativa “Insira um URL”; não aparece erro junto ao campo. | Mensagem específica abaixo da URL, com exemplo HTTPS e preservação do valor. |
| Equipe | A tabela expõe UUID completo como primeira coluna (`src/TeamMembers.tsx:150`), não oferece convite nem ação sobre membros. A navegação continua destacando a página anterior ao abrir Equipe pelo menu da conta. | Identificar pessoas por nome/e-mail, relegar ID ao detalhe técnico, oferecer gestão conforme autorização e corrigir item ativo. |
| Listagem móvel de parceiros | O detalhe de TEste mostra o logo cadastrado; a listagem usa avatar “T”. | Reutilizar o logo da parceria, com inicial apenas como fallback. |
| Aplicação no celular | O cabeçalho da parceria e o da aplicação consomem a primeira dobra. A barra de abas expõe scrollbar horizontal e deixa “Acessos” fora da área visível. | Resumir o cabeçalho após entrar na aplicação e usar navegação móvel que indique claramente as opções restantes. |
| Relatórios | Com os quatro módulos zerados, a evolução desenha quatro séries sobrepostas em zero. O mapa por UF usa intensidade fictícia na página publicada, embora esteja marcado “Dados de demonstração”. | Estado vazio próprio para séries sem dados; manter a prévia separada dos relatórios operacionais ou conectar uma métrica real quando disponível. |
| Regras comerciais / Provedores IA | Formulários longos ficam sempre abertos ao lado de listas estreitas, com textos e códigos técnicos visíveis. | Priorizar listagem e detalhe; abrir criação em fluxo guiado, agrupando configuração avançada. |
| Financeiro → Exceções | O cabeçalho mostra “PRIMEIRA VENDA · PIX SANDBOX” no endereço publicado. | Explicar claramente o ambiente ativo em um indicador próprio, sem confundir o título da área financeira. Confirmar se a indicação corresponde à configuração real antes de alterá-la. |

## Fluxos verificados sem alteração de dados

- Diretório: pesquisa sem resultado, limpeza da pesquisa, filtro e seletor de empresa (“Todas as parcerias” / TEste) funcionaram.
- Aplicações: troca entre duas aplicações e busca/lista funcionaram. O assistente “Nova aplicação” preservou os dados ao avançar e voltar; erro de nome vazio ficou junto ao campo; revisão final mostrou as escolhas. A criação foi cancelada.
- Edição em massa: duas aplicações selecionadas, alteração de estado e permissões configurável, revisão com nomes, valores e quantidade. A aplicação da mudança não foi executada.
- Webhook: revisão de URLs OAuth e confirmação de remoção de destino foram abertas e canceladas. O destino ativo mostrava estado e URL.
- Entregas: filtros, atualização, linha e detalhe técnico de um evento de teste entregue funcionaram. O painel lateral cobriu a viewport corretamente no desktop e no celular; o recorte relatado anteriormente não foi reproduzido.
- Credenciais: emissão abriu formulário com nome, validade e permissões; revogação apresentou confirmação explícita; nenhum segredo foi emitido ou revogado. Uma credencial antiga aparece sem prazo definido.
- Operação: Pedidos, Pedidos registrais, Fontes, Análises, Conciliação e Prévia ONR carregaram. As listas estavam vazias nesta conta, portanto decisões e revisão jurídica com registros reais não puderam ser exercitadas.
- Relatórios: períodos rápidos, personalização, comparação anterior e interação do mapa foram abertos. O mapa declara ser demonstrativo. Console do navegador sem mensagens `error` ou `warn` capturadas nesta sessão.
- Celular: menu “Mais”, barra inferior, seletor de empresa, diretório, aplicações e detalhe de entrega responderam na largura de 390 px.

## Limites da verificação

Os controles finais de exclusão, suspensão, revogação, concessão, emissão de credenciais, criação de registros e publicação de regras não foram confirmados em produção. Foram examinadas as etapas anteriores e, quando existiam, as telas de confirmação. A conta tinha uma parceria e poucos registros; os fluxos vazios não comprovam comportamento com volume, permissões de parceiro, dados financeiros ou erros reais de entrega.

## Acompanhamento local

Após esta auditoria, uma revisão local baseada nas imagens de `Refs` iniciou correções para: cadastro de parceiro em etapas, revisão de permissões, reteste de webhook ativo, confirmação antes de suspender, navegação compacta e relatórios com comparação entre módulos. Estes ajustes ainda não foram reavaliados no site publicado nesta auditoria. Os pontos de Conexões, Promoções, Equipe e dados operacionais permanecem anotados para uma fatia posterior.
