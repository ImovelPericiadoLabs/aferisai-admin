# Aferis AI — design tokens

## Regra de uso
Este documento descreve a semântica desejada. Antes de alterar código, mapear os tokens para o sistema real de estilos e sua versão. Não copiar os exemplos abaixo cegamente se o projeto já possuir nomes equivalentes.

## Categorias semânticas
- Superfícies: `background`, `surface`, `surface-raised`, `surface-muted`.
- Texto: `foreground`, `muted-foreground`, `subtle-foreground`.
- Ações: `primary`, `primary-foreground`, `secondary`, `accent`.
- Estrutura: `border`, `input`, `ring`.
- Estado: `success`, `warning`, `destructive`, `info` e respectivos foregrounds.
- Tipografia: família, pesos, tamanhos, line-height e tracking.
- Espaçamento: escala compartilhada para gaps, padding e separação entre seções.
- Geometria: raios, alturas de controles, largura máxima de conteúdo e sidebar.
- Elevação: sombras e camadas semânticas.
- Movimento: duração, easing e redução de movimento.
- Layout: breakpoints e regras responsivas.

## Exemplo de nomes CSS — adaptar à stack real
```css
:root {
  /* Exemplos sem valores de marca definidos. Mapear aos tokens existentes. */
  --background: var(--existing-background);
  --surface: var(--existing-surface);
  --foreground: var(--existing-foreground);
  --muted-foreground: var(--existing-muted-foreground);
  --primary: var(--existing-primary);
  --border: var(--existing-border);
  --ring: var(--existing-ring);
}
```

Não deixe referências `--existing-*` no código final. Elas são marcadores conceituais, não tokens prontos para produção.

## Regras
1. Inspecionar a implementação atual antes de criar novos tokens.
2. Preferir tokens semânticos a valores de cor fixos nos componentes.
3. Evitar duplicação de tokens e CSS ad hoc.
4. Registrar os valores reais e a fonte de cada decisão de marca.
5. Não inventar cores oficiais nem substituir ativos de marca sem aprovação.
6. Verificar contraste e estados interativos.
7. Testar tema claro/escuro apenas se o produto oferecer ou for aprovado para oferecer ambos.
