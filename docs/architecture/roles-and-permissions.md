# Aferis AI — experiências, módulos e permissões

## Objetivo
Documentar como a experiência muda de acordo com o perfil, a organização, as permissões e a disponibilidade dos módulos. Esta documentação não substitui a implementação real de autorização.

## Primeiro, mapear o que já existe
- Identidades e tipos de usuário.
- Organizações, equipes, aplicações e parceiros.
- Papéis, permissões explícitas e escopos.
- Módulos habilitados por conta ou plano.
- Rotas, APIs, Server Actions e pontos de leitura/mutação.
- Fluxos de convite, revogação, troca de organização e auditoria.

## Modelo conceitual
Separar:
1. **Autenticação:** quem é a pessoa ou serviço.
2. **Autorização:** quais ações pode executar, sobre quais recursos e em qual escopo.
3. **Disponibilidade do módulo:** se o recurso está habilitado para a conta/ambiente.
4. **Feature flag:** se uma funcionalidade está liberada para uma etapa controlada.

Não misturar essas quatro decisões em um único booleano.

## Experiências candidatas — confirmar no produto
- Administração da plataforma.
- Equipe interna/operacional.
- Administrador ou membro de organização.
- Parceiro com gestão de aplicações e integrações.

Não criar novos papéis, permissões ou módulos sem confirmar a necessidade com base no repositório e no produto.

## Segurança obrigatória
- Validar permissões no servidor para toda operação protegida.
- Aplicar isolamento de tenant/organização em consultas e mutações.
- Negar por padrão se a autorização não puder ser confirmada.
- Não confiar em estado do cliente, menu oculto ou parâmetros enviados pelo navegador.
- Aplicar o mesmo controle a exportações, arquivos, logs, credenciais e recursos indiretos.
- Evitar expor segredos de parceiros no cliente; mostrar credenciais apenas conforme o fluxo seguro existente.
- Registrar ações administrativas sensíveis quando a arquitetura já tiver auditoria ou quando isso for aprovado.
- Testar acesso permitido e negado com identidades de teste distintas.

## Comportamento visual
- Exibir somente navegação e ações permitidas.
- Se útil, explicar ações desabilitadas e como solicitar acesso.
- Diferenciar “sem permissão”, “módulo não habilitado”, “sem dados” e “erro”.
- Não usar uma tela vazia genérica para todos esses estados.
- Ao trocar de organização/perfil, atualizar o contexto e os dados sem misturar informações.

## Matriz a preencher após auditoria
| Perfil real | Escopo | Módulos | Ações permitidas | Ações negadas | Rotas/API protegidas |
|---|---|---|---|---|---|
| Preencher com dados verificados do projeto | | | | | |
