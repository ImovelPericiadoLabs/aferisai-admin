# AferisAI · Área da equipe

Painel separado da interface do usuário comum. A equipe entra com senha e TOTP, consulta organizações, cadastra a primeira aplicação, edita perfil e descrição do catálogo, concede ou revoga permissões existentes e gerencia o logo privado. Administrador e gestor podem selecionar solicitações da fila pré-cobrança ou buscar por ID, abrir o original com auditoria e classificar a fonte. Também podem selecionar uma análise técnica da fila ou pelo ID, abrir o original com auditoria, marcar citações por página e registrar uma decisão motivada. As ações disponíveis dependem do papel recebido da API.

## Desenvolvimento local

Requer Node.js compatível com Vite 8. Execute `npm install` e `npm run dev`. O painel abre em `http://localhost:5173` com porta fixa. Crie `.env.local` a partir de `.env.example` somente se a API usar outro endereço; a variável pública `VITE_API_URL` contém apenas a origem da API, nunca segredos.

No backend local, configure `TEAM_FRONTEND_ORIGIN=http://localhost:5173` e sirva a API em `http://localhost:8000` para corresponder a `.env.example`. A origem deve ser exata. Cookie `Secure` e a política de subdomínios exigem validação em HTTPS antes de usar fora do loopback. A API também precisa de PostgreSQL, migrações e uma conta da equipe criada pelo procedimento restrito do backend.

O cliente envia cookies com `credentials: include`, renova CSRF após recarga e guarda o token CSRF somente em memória. O segredo de uma aplicação cadastrada é exibido somente na tela de resultado. Não use captura de tela ou gravação de sessão nessa tela em ambiente real.

## Comandos

- `npm run dev`: servidor local.
- `npm run build`: TypeScript e build de produção.
- `npm run lint`: inspeção estática.
- `npm test`: contrato do cliente HTTP.
- `npm run format:check`: formatação.
- `npm run test:e2e:local`: fluxo completo em Chrome com API e PostgreSQL locais isolados; requer `E2E_CREDENTIALS_FILE` apontando para credenciais sintéticas. Use `E2E_ROLE=viewer` com credenciais de leitor para verificar a interface somente de consulta.
- `npm run test:e2e:review`: ensaio das telas de classificação e revisão em Chrome isolado com respostas sintéticas; valida contrato do cliente, leitura do original, correção, decisão e larguras estreitas, sem substituir o teste integrado com API e banco reais.
- `npm run test:e2e:review:live`: ensaio da classificação e revisão com API e PostgreSQL 18 reais, solicitação sintética não paga e trabalho sintético pago. Exige `E2E_CREDENTIALS_FILE`, API em `VITE_API_URL` e a chave TOTP correspondente no backend. [Preparação segura do fixture](../backend/tests/prepare_review_browser.py) roda da raiz do backend com `uv run python -m tests.prepare_review_browser` e exige banco local migrado com nome terminado em `_test`, `TEST_DB_URL`, `E2E_CREDENTIALS_FILE` e `E2E_KEY_FILE`; os dois arquivos de saída têm permissão `0600` e não entram no Git. Execute a API com `TEAM_TOTP_FERNET_KEY` lida de `E2E_KEY_FILE` e `TEAM_FRONTEND_ORIGIN=http://localhost:5173`. Use apenas uma base descartável, sem dados de cliente.
- `npm run preview`: prévia do build.

O [desenho do painel](docs/panel-blueprint.md) registra contratos, ownership, estado implementado e limites. A classificação pré-cobrança oferece fila paginada e busca por ID; a correção exige nova leitura auditada. A revisão oferece sua própria fila paginada, busca por ID e marcação visual de citações em PDF, PNG e JPEG. As coordenadas podem ser ajustadas manualmente; ambas as decisões ainda dependem de conferência humana e do motivo registrado. Administração de membros, criação de códigos de permissão, novas aplicações e acesso do usuário comum seguem pendentes de contratos próprios.
