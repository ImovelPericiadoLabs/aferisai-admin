# Framework de documentação

A documentação do parceiro (portal → Documentação) é dados + um leitor genérico. Para criar outra documentação (por exemplo, para a equipe interna), escreva um arquivo de conteúdo e renderize `<DocsSite>`; não crie uma tela nova.

## Peças

| Arquivo | Função |
| --- | --- |
| `src/docs-model.ts` | Tipos do conteúdo (`DocsSite`, `DocPage`, blocos), texto inline, índice (TOC), busca e `validateSite`. Puro e testado. |
| `src/docs-languages.ts` | Linguagens dos exemplos, na ordem das abas, e o que cada uma exige. |
| `src/DocsSite.tsx` | O leitor: trilha, busca, navegação por grupos, página com TOC que acompanha a leitura, anterior/próxima. |
| `src/DocsBlocks.tsx`, `DocsSamples.tsx`, `DocsSearch.tsx`, `DocsInline.tsx` | Renderização dos blocos, exemplos em abas, busca e texto inline. |
| `src/docs.css` | Estilos (tokens apenas). O layout segue a largura do próprio leitor (container queries). |
| `src/partner-docs-content.ts` | O conteúdo do parceiro. |
| `src/integration-samples.ts` | Exemplos de código em várias linguagens, compartilhados com a referência de webhooks. |

## Escrever conteúdo

Uma página tem `id`, `group`, `title`, `summary` e `sections`. Cada seção tem `id`, `title` e `blocks`:

- `p`, `h3`, `list`, `steps` (sequência numerada), `callout` (`note`, `tip`, `warning`, `danger`), `table`, `code`, `links` (atalhos), `samples` (exemplo em várias linguagens, por id).
- Texto inline: `` `código` ``, `**negrito**` e `[texto](pagina)` ou `[texto](pagina#secao)`.
- `validateSite(site)` aponta página/seção duplicada, grupo desconhecido, exemplo inexistente e link quebrado. O teste do conteúdo exige que ele devolva `[]`.

## Exemplos de código

1. Escreva o exemplo em cada linguagem em `src/integration-samples.ts` (o objeto `variants` aceita `curl`, `node`, `python`, `java`, `csharp` e `go`). Para uma nova linguagem, acrescente-a em `SAMPLE_LANGUAGES` e, se precisar de cores, em `src/code-highlight.ts`.
2. Rode `npm run test:doc-samples`. O script compila (ou valida a sintaxe de) cada exemplo e o **executa** contra um servidor HTTP local que registra o que recebe: confere o vetor de PKCE, o formato do UUIDv7, o HMAC do webhook e os cabeçalhos, o corpo e o caminho de cada requisição. Exige node 22+, python3 com `requests`, go, java 17+ e o SDK do .NET.
3. A linguagem escolhida vale para todos os exemplos do leitor e fica guardada no navegador.

## Regras de produto

- Só afirme o que o backend garante. Os escopos, formatos, limites e erros da documentação do parceiro vêm do código do backend; mudou lá, atualize aqui e o teste do conteúdo.
- Nada de segredos reais nos exemplos. Use variáveis (`$CLIENT_SECRET`) e valores de exemplo.
- O leitor não altera a URL; a página aberta e a linguagem ficam guardadas no navegador (`storageKey`).
