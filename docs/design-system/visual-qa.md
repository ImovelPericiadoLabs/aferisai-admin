# Aferis AI — checklist de QA visual

## Antes
- [ ] Identificar a rota, o objetivo e o perfil usado.
- [ ] Registrar screenshot atual em estado conhecido.
- [ ] Confirmar dados de teste, viewport, tema e condições de carregamento.
- [ ] Identificar componentes/tokens existentes que devem ser reutilizados.

## Viewports de referência
- Desktop: 1440×900.
- Tablet: 768×1024.
- Mobile: 390×844.
Ajustar se o produto tiver outros dispositivos prioritários.

## Revisão visual
- [ ] Alinhamento entre título, descrição, ações, filtros e conteúdo.
- [ ] Proporções e largura do conteúdo.
- [ ] Escala tipográfica, contraste e legibilidade.
- [ ] Espaçamento consistente.
- [ ] Tabelas/listas legíveis sem overflow indevido.
- [ ] Sem scroll horizontal inesperado.
- [ ] Sidebar, cabeçalho, menus e overlays posicionados corretamente.
- [ ] Sem saltos de layout ou flicker.
- [ ] Estados de foco, hover, seleção e desabilitado.
- [ ] Loading, vazio, erro e sucesso quando aplicáveis.
- [ ] Ações e navegação por teclado.
- [ ] Preferência de movimento reduzido respeitada.
- [ ] Sem dados fictícios confundidos com dados reais.

## Interações
- [ ] Abrir/fechar filtros e dropdowns.
- [ ] Abrir/fechar modais e menus.
- [ ] Testar formulário válido e inválido.
- [ ] Testar navegação e ações conforme permissões.
- [ ] Confirmar que acesso negado também é bloqueado no servidor.

## Verificações técnicas
- [ ] Executar testes/lint/typecheck disponíveis.
- [ ] Inspecionar erros de console e falhas de rede relevantes.
- [ ] Verificar regressões nas rotas/componentes afetados.
- [ ] Capturar screenshot após correções.
- [ ] Comparar antes/depois em condições equivalentes.

## Relatório por mudança
- Rota e perfil:
- Viewports:
- Screenshots/evidências:
- Testes executados:
- Problemas encontrados:
- Problemas corrigidos:
- Limitações/bloqueios:
- Resultado: aprovado / aprovado com limitações / não aprovado.

Não marcar um item como validado sem executá-lo ou observá-lo.
