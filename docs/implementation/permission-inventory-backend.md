> Instantâneo somente leitura do `aferis-backend` no commit `d162bac` (antes do PR #28, que acrescentou a gestão de pessoas e convites do parceiro: veja `permission-map.md`). Gerado por leitura de código e documentação; nenhuma linha foi inventada. Caminhos relativos ao repositório do backend.

# Aferis AI backend — inventory of permissions, integration modes, events and metrics

Repository: `/home/bugson/Projetos/AferisAI/backend` (HEAD `d162bac`), read-only. All paths below are relative to it.
Method: static reading plus a read-only introspection of the FastAPI app (`create_app()` imported with a dummy `DATABASE_URL`, routes walked, no DB access, nothing written to the repo). 177 routes found. Route line numbers point to the decorator line.

Labels: **FACT** = observed in code/docs. **DOC-ONLY** = described in docs but not found in code. **CODE-ONLY** = in code without matching doc. **PROPOSAL** = my suggestion (section 6 only).

---

## 1. Permission / scope codes

### 1.1 Where codes live (FACT)

There is **no global enum** of application permissions. Codes are free strings stored per organization:

| Store | Definition | Notes |
|---|---|---|
| `organization_permissions(organization_id, code, description)` | `database/versions/fa0ec39b391e_organization_integration_foundation.py:36-42` | Per-organization catalog. Max code length 120. |
| `application_permissions(organization_id, application_id, code)` | `database/versions/fa0ec39b391e_organization_integration_foundation.py:43-50` | Grant = row; FK to the org catalog (code must exist in that org's catalog). |
| `integration_credentials.scopes varchar[]` | `database/versions/b27c6e4d9a10_credential_metadata_and_expiry.py:25-49`; model `app/integrations/models.py:174-175` | Scopes frozen on the credential at issue time; non-empty; default `ARRAY['application:read']`. Legacy credentials back-filled from grants. |
| `user_connections.scopes` | `app/integrations/models.py` (UserConnection; constraint at :143-144 for events) | Scopes approved by the end-user (titular) for one application. |
| `DELEGATED_SCOPE_DETAILS` / `DELEGATED_SCOPES` | `app/integrations/scopes.py:1-12` | The only in-code constant: `analysis:submit:upload`, `analysis:read` (title + PT description shown on consent screen). |
| Delegated scope `Literal` in HTTP schema | `app/integrations/user_routes.py:27` | `Literal["analysis:submit:upload", "analysis:read"]`. |
| Catalog seed on onboarding | `app/integrations/svc/onboarding.py:49-57` | Adds `application:read`, `analysis:read`, `analysis:submit:upload` to every new organization's catalog. |
| Catalog seed for existing orgs | `database/versions/d58f7a2c901e_delegated_scope_catalog.py:14-29` | Inserts the two delegated scopes into every existing org catalog, without granting. |

No API exists to **add** a new code to a catalog. `PUT /v1/team/organizations/{organization_id}/permissions/{code}` only changes the description of an existing code (`app/organizations/svc/catalog.py:17-41`, route `app/organizations/admin_routes.py:358`). New codes only arrive via onboarding/migrations (or raw DB).

### 1.2 Code-by-code table

| Code | Defined | Default grant on creation | Enforced at (file:line) | Unlocks (routes) | Partner-visible? |
|---|---|---|---|---|---|
| `application:read` | onboarding catalog `app/integrations/svc/onboarding.py:49-51`; credential default `app/integrations/svc/credentials.py:76`; DB default `database/versions/b27c6e4d9a10_credential_metadata_and_expiry.py:43` | **Yes**: granted to first app (`onboarding.py:62-64`) and to every additional app (`onboarding.py:101-103`); default credential scope | `authenticate_access_token(..., "application:read")` checks credential scope `app/integrations/svc/credentials.py:143` called at `app/integrations/routes.py:284-286`; live grant check `app/integrations/routes.py:291` via `app/integrations/svc/permissions.py:10-14` | `GET /v1/applications/{application_id}` (`app/integrations/routes.py:258`) — returns only `id,name,status` | Yes. In public `/openapi.json` (`getOwnApplication`, `app/api_docs.py:18`). |
| `analysis:read` | `app/integrations/scopes.py:6-9`; catalog `onboarding.py:52-54`; migration `d58f7a2c901e...py:23` | **No** grant (catalog only). Manager/admin must grant per app. | `get_delegated_analysis_reader` `app/integrations/deps.py:82-95` → `DelegatedOAuthSvc.authenticate_token` `app/integrations/svc/delegated.py:242-282` → `ConnectionSvc.has_scope` `app/integrations/svc/connections.py:136-168` (live: user active, app/org active, app grant, connection id+version, scope in connection) | `GET /v1/partner/analyses` (`app/analyses/partner_routes.py:231`); `GET /v1/partner/analyses/{analysis_id}` (`:261`); `GET .../{analysis_id}/result` (`:334`); `GET .../{analysis_id}/report.pdf` (`:363`). Also gates **webhook seeding**: `app/integrations/repo/webhook_delivery.py:30` and worker re-check of grant `workers/lanes/webhook_delivery_worker.py:77-89` | Yes (granted list via `GET /v1/partner/applications/{id}/permissions`, `app/integrations/partner_credential_routes.py:71`). Delegated routes are **not** in public OpenAPI. |
| `analysis:submit:upload` | `app/integrations/scopes.py:2-5`; catalog `onboarding.py:55-57`; migration `d58f7a2c901e...py:24` | **No** grant | `get_delegated_analysis_submitter` `app/integrations/deps.py:98-111` → same chain as above | `POST /v1/partner/analyses` (`app/analyses/partner_routes.py:127`) | Yes (permissions list); route internal-only in OpenAPI. |

Every code above is additionally constrained by: credential `scopes` must contain it (`credentials.py:143`, `delegated.py:117,141,209,269`), app + org must be `active` (`permissions.py:12`, `delegated.py:86-94,266-274`), credential not expired/revoked (`credentials.py:102-103,141-142`).

### 1.3 Codes the request mentioned that do NOT exist in this backend (FACT, searched `app workers database docs tests scripts`)

| Code | Found? | Where it appears |
|---|---|---|
| `analysis:create` | Not in code. | Only `docs/partner-connection-blueprint.md:74` as a citation of the legacy Imovel catalog. |
| `analysis:write` | Not found anywhere. | — |
| `registry:read` / `registry:create` / `registry:write` | Not found anywhere (`registry:` hits are Python variable names, e.g. `app/analyses/review.py:160`). | — |
| `certificate:read`, `webhook:manage`, `integration:manage` | Not in code. | Only `docs/partner-connection-blueprint.md:74` (legacy Imovel citation). |
| `consultation:read`, `commission:read`, `application:write`, `unknown:read`, `missing:read` | Test-only fixtures. | `tests/test_integration_boundaries.py:90-113,206,271`; `tests/test_application_bulk.py:101`. Used to prove "outside catalog" / cross-org rejection, not real capabilities. |

### 1.4 Documented-but-not-enforced vs enforced-but-undocumented

- **DOC-ONLY (planned, no code):** scopes for registry acquisition by number/CNM/address ("cada operação registral futura exige escopo próprio", `docs/registry-execution-plan.md:59`; `docs/partner-connection-blueprint.md:31`); price-quote scope, payment-intent scope, event-category scopes (`docs/partner-connection-blueprint.md:32-36,83`); separate scopes for original document (`docs/partner-connection-blueprint.md:33`). None have codes yet ("Os exemplos acima são categorias de autorização, não códigos publicados", `:38`).
- **CODE-ONLY / under-documented behaviour:**
  - `analysis:read` doubles as the **event subscription** scope for `analysis.completed` (`app/integrations/repo/webhook_delivery.py:30`). Documented in `docs/api-guide.md:448` but not as a separate scope decision, contrary to the blueprint's intent that event categories be separate (`docs/partner-connection-blueprint.md:35,56`).
  - Delegated reads return **all** analyses of the titular, not only those submitted via that application: `list_for_owner(claims.user_id, ...)` `app/analyses/partner_routes.py:253` and `read_for_owner(claims.user_id, analysis_id)` (`:284,357,391`). Same for webhook seeding (by `user_id`, `webhook_delivery.py:24-33`). Docs describe it as "do titular conectado" (`docs/api-guide.md:482`) — consistent, but the product implication (partner sees analyses the user made on the public site or via other partners) is not called out.
  - `IntegrationSvc.can_access_own_application` (`app/integrations/svc/permissions.py:17-26`) is used only in tests (`tests/test_integration_boundaries.py:188-213`); no route uses it.
- **Stale docs (say missing, but code exists):**
  - `docs/partner-connection-blueprint.md:3,48` says result/upload/webhook have no delegated operation — code has them (`app/analyses/partner_routes.py:127,334,363`).
  - `docs/api-guide.md:466` says "não há operação delegada de análise disponível ao parceiro" — contradicted by `docs/api-guide.md:474-496` and the code.
  - `docs/partner-webhook-ux-research.md:18,21,22` says partner has no endpoint routes, no delivery list API, no test route — all exist (`app/integrations/partner_webhook_routes.py:59-217`, `app/integrations/svc/webhook_tests.py:40-68`).
  - `docs/pending.md:3489-3494` lists "Endpoint de registro de webhook por parceiro" as absent — exists (`app/integrations/partner_webhook_routes.py:59`).
  - `docs/commercial-policy-blueprint.md:42-47` marks draft edit, preview, promotions and commissions routes as proposed — all exist (`app/pricing/admin_routes.py:211,313`, `app/pricing/promotion_routes.py:104-169`, `app/pricing/financial_routes.py:133-205`).

### 1.5 Who can grant/revoke (FACT)

| Action | Route | Role | Checks |
|---|---|---|---|
| Grant permission to app | `PUT /v1/team/applications/{application_id}/permissions/{code}` `app/integrations/admin_routes.py:345` | manager+ (`app/team/deps.py:102`; svc `app/integrations/svc/admin.py:53`) | Code must be in org catalog (`admin.py:33-35`); app + org active (`admin.py:65`); audited `PermissionChangeEvent` (`admin.py:69-85`). |
| Revoke | `DELETE` same path `app/integrations/admin_routes.py:383` | manager+ | Audited; credential `scopes` arrays are **not** rewritten, but live checks deny. |
| Bulk grant/revoke/status (2–50 apps) | `POST /v1/team/organizations/{organization_id}/applications/bulk-previews` `app/integrations/bulk_routes.py:115`; `.../{preview_id}/apply` `:157` | manager+ (`app/integrations/svc/bulk.py:69`) | Codes ⊆ catalog (`bulk.py:117-119`), ≤16 each (`bulk.py:84`). |
| Describe catalog code | `PUT /v1/team/organizations/{organization_id}/permissions/{code}` `app/organizations/admin_routes.py:358` | manager+ (`app/organizations/svc/catalog.py:21`) | Description only. |
| Partner reads granted codes | `GET /v1/partner/applications/{application_id}/permissions` `app/integrations/partner_credential_routes.py:71` | any active partner member of the active org | Read-only. Partners cannot grant. |

---

## 2. Integration / identity modes

### 2.1 Mode summary

| # | Mode | Actor | Auth method | Permissions | Status |
|---|---|---|---|---|---|
| A | Application server-to-server (`client_credentials`) | Partner application | HTTP Basic `client_id:secret` → Fernet token (900 s) → `Authorization: Bearer` | credential scopes ∩ app grants; only `application:read` usable | Implemented, public |
| B | Delegated OAuth (authorization code + PKCE S256) | Application acting for an end-user (titular) | `GET /oauth/authorize` → user consent on site → code (120 s) → `POST /oauth/token` → sealed Bearer (900 s), no refresh | `analysis:read`, `analysis:submit:upload` | Implemented end-to-end; internal-only in OpenAPI |
| C | End-user account + connections (consent) | Titular | Email login code + cookie session + Origin + CSRF | Chooses scopes per application | Implemented |
| D | Partner human portal (`/v1/partner/*`) | Partner person (multi-org) | Invite → password (Argon2id) + TOTP → cookie session with active org; CSRF on mutations | No roles: every active member has full app/credential/webhook control within active org | Implemented |
| E | Outbound webhooks (Aferis → partner) | Worker | HMAC-SHA256 signature with per-endpoint secret | Requires connection with `analysis:read` + app grant `analysis:read` | Implemented, one event type + test |
| F | Team (internal) | viewer / manager / administrator / financial | Cookie + TOTP/passkey; Origin + CSRF on mutations | Role checks per route | Implemented |
| G | Public site / checkout | Titular | Same as C | Ownership by `owner_user_id` | Implemented (file analysis PIX; registry PIX gated) |
| H | Promotions (coupon/link) | Titular entering a code | `promotion_code` field on analysis quote | none (no partner auth) | Implemented for file analysis quotes only |
| I | Commercial policy channels (site/integration/promotion) | Admin config | — | — | Config implemented; only `site/public` and `promotion` code path resolved |
| J | Inbound Asaas webhook | Asaas | `asaas-access-token` header | — | Implemented (not partner-facing) |
| K | Public anonymous | anyone | none | — | `/health`, `/v1/registry-offices`, `/seals/{code}/verify` |

### 2.2 Mode A — Application credentials (client_credentials)

- **Credential issue:** secret `token_urlsafe(32)`, client_id `token_urlsafe(18)`, scrypt hash `app/integrations/svc/credentials.py:65-90`. Default name "Credencial inicial", default scopes `["application:read"]`, default expiry 90 days (`:67-77`).
- **Validation rules:** name ≤120, no control chars; `expires_in_days ∈ {30, 90, 180}`; 1–16 unique scopes; each scope must be granted to the app (`app/integrations/svc/credential_rules.py:27-37`). `Idempotency-Key` UUIDv7 required (`credential_rules.py:9-19`).
- **Max 2 active credentials:** `app/integrations/partner_credential_routes.py:160-161` and `app/integrations/svc/credential_admin.py:64-65` (`CredentialActiveLimitError`), count at `app/integrations/repo/integration_repo.py:186`.
- **Token:** `POST /oauth/token` `app/integrations/routes.py:128`; form `grant_type=client_credentials`, `scope` param rejected with `invalid_scope` (`:205-209`); token = Fernet(credential UUID), `expires_in: 900` (`:226-230`; TTL check `credentials.py:130`). No refresh token. scrypt concurrency limited to 4 slots, busy → `503 temporarily_unavailable` (`credentials.py:21-32`, `routes.py:250-251`).
- **Endpoints:**

| Method | Path | File:line | Auth | Scope |
|---|---|---|---|---|
| POST | `/oauth/token` | `app/integrations/routes.py:128` | HTTP Basic | — |
| GET | `/v1/applications/{application_id}` | `app/integrations/routes.py:258` | Bearer (client_credentials) | `application:read` |

- **Isolation:** token resolves to one credential → one application; path ID must equal it, else 404 (`routes.py:289-290`).
- **Credential management endpoints** (team and partner):

| Method | Path | File:line | Who |
|---|---|---|---|
| GET | `/v1/team/applications/{application_id}/credentials` | `app/integrations/admin_routes.py:419` | manager+ (svc `app/integrations/svc/credential_admin.py:105`) |
| POST | `/v1/team/applications/{application_id}/credentials` | `app/integrations/admin_routes.py:464` | manager+ |
| DELETE | `/v1/team/applications/{application_id}/credentials/{credential_id}` | `app/integrations/admin_routes.py:515` | manager+ |
| GET | `/v1/partner/applications/{application_id}/credentials` | `app/integrations/partner_credential_routes.py:94` | partner member |
| POST | `/v1/partner/applications/{application_id}/credentials` | `app/integrations/partner_credential_routes.py:131` | partner member + CSRF |
| DELETE | `/v1/partner/applications/{application_id}/credentials/{credential_id}` | `app/integrations/partner_credential_routes.py:186` | partner member + CSRF |

- **Gaps:** the only data an app token can read is its own `id/name/status`. No app-level (non-delegated) read of anything else (metrics, connections, commissions). No rotation with overlap besides the "2 active" window. No refresh token. `can_access_own_application` helper unused by routes.

### 2.3 Mode B — Delegated OAuth (authorization code + PKCE)

**Implemented end to end** (not only registered). Flow:

| Step | Method + path | File:line | Checks |
|---|---|---|---|
| 1. Partner redirects user | GET `/oauth/authorize` | `app/integrations/routes.py:73` | `response_type=code`, `S256` only; `state` 16–256, challenge 43 chars; scopes ⊆ `DELEGATED_SCOPES`, ⊆ credential scopes, each granted to app; `redirect_uri` exact match (`app/integrations/svc/delegated.py:97-124`). Redirects 303 to `{USER_FRONTEND_ORIGIN}/conexoes/aprovar?...` (`routes.py:110-125`). Errors never redirect to partner. |
| 2. User reads proposal | GET `/v1/users/connections/{application_id}` | `app/integrations/user_routes.py:154` | Lists only delegated scopes granted to app (`app/integrations/svc/connections.py:40-64`). |
| 3. User approves scopes | PUT `/v1/users/connections/{application_id}` | `app/integrations/user_routes.py:190` | Full set, `expected_version`; increments `grant_version` (`connections.py:66-114`). Audited `UserConnectionEvent`. |
| 4. Site requests code | POST `/v1/users/connections/{application_id}/authorization-codes` | `app/integrations/user_routes.py:248` | Code TTL 2 min (`delegated.py:35`), SHA-256 digest stored, bound to credential, connection, scopes, version, redirect, challenge (`delegated.py:126-176`). |
| 5. Partner exchanges | POST `/oauth/token` `grant_type=authorization_code` | `app/integrations/routes.py:128` (branch `:231-249`) | Same credential (Basic), single-use, PKCE verify, redirect still registered, live `has_scope` per scope (`delegated.py:178-240`). Returns sealed `delegated-v1` claims (credential, app, user, connection, grant_version, scopes), `expires_in` 900 (`delegated.py:36,230-240`). |
| 6. Use | Bearer on `/v1/partner/analyses*` | `app/integrations/deps.py:82-111` | Re-checks credential, scope in credential, app/org active, app grant, connection id+version+scope, user active; connection row share-locked during request (`delegated.py:276-281`). |

- **Redirect URIs:** max 5, HTTPS, DNS name with dot, no query/fragment/credentials/port≠443 (`app/integrations/svc/redirects.py:19-35,64`). Managed only by team: GET `app/integrations/admin_routes.py:284` (manager+, svc `redirects.py:92`), PUT `:312` (manager+). **Partner cannot manage redirect URIs** (no `/v1/partner/...redirect-uris` route).
- **Delegated analysis endpoints:**

| Method | Path | File:line | Scope | Data returned |
|---|---|---|---|---|
| POST | `/v1/partner/analyses` | `app/analyses/partner_routes.py:127` | `analysis:submit:upload` | Binary PDF/PNG/JPEG ≤200 MB, `Idempotency-Key` UUIDv7; creates request for `claims.user_id`, no charge. 201 `{id,state}`; 303 on replay. |
| GET | `/v1/partner/analyses` | `app/analyses/partner_routes.py:231` | `analysis:read` | `id, created_at` page (limit 1–50). |
| GET | `/v1/partner/analyses/{analysis_id}` | `app/analyses/partner_routes.py:261` | `analysis:read` | `id, state, result_available`. |
| GET | `/v1/partner/analyses/{analysis_id}/result` | `app/analyses/partner_routes.py:334` | `analysis:read` | Preliminary findings (same as owner result). |
| GET | `/v1/partner/analyses/{analysis_id}/report.pdf` | `app/analyses/partner_routes.py:363` | `analysis:read` | PDF report. |

- **Isolation:** by `owner_user_id == claims.user_id`. **Not** by application: no `application_id`/`connection_id` is recorded on the analysis request created via partner (`AnalysisRequestSvc(session).submit_http_upload(claims.user_id, ...)`, `app/analyses/partner_routes.py:209`; no attribution columns found in `app/analyses/models.py`).
- **Gaps / oddities:**
  - Created analyses carry no initiating application/connection — contradicts `docs/partner-connection-blueprint.md:56` ("registra separadamente a aplicação iniciadora e a conexão usada"). Without it, per-partner analysis counts and `integration/connected` commission attribution are impossible.
  - `Location` and 303 redirect point to the **cookie-only** owner route `/v1/analyses/{id}` (`app/analyses/partner_routes.py:214,225`), not to `/v1/partner/analyses/{id}`.
  - No delegated quote, payment (PIX), original-document read, registry request (number/CNM/address), certificate read. (DOC-ONLY intentions at `docs/partner-connection-blueprint.md:31-36`, `docs/registry-execution-plan.md:39,59`.)
  - All delegated routes and `/oauth/authorize` are excluded from public `/openapi.json` (`app/api_docs.py:18` allows only `getHealth, createPartnerToken, getOwnApplication, listRegistryOffices, verifySeal`).
  - No refresh token: the connection persists, but after 15 minutes the partner must send the user through the browser authorize/code flow again to get a new token (no silent renewal). Consequence of `delegated.py:36` plus only two grant types accepted (`routes.py:203`).

### 2.4 Mode C — End-user account, connections (consentimentos)

| Method | Path | File:line | Notes |
|---|---|---|---|
| POST | `/v1/users/login-codes` | `app/users/routes.py:68` | Email code login |
| POST | `/v1/users/sessions` | `app/users/routes.py:98` | |
| GET/DELETE | `/v1/users/sessions/current` | `app/users/routes.py:140,186` | |
| POST | `/v1/users/sessions/current/csrf` | `app/users/routes.py:162` | |
| GET | `/v1/users/connections` | `app/integrations/user_routes.py:115` | User's active connections |
| GET/PUT/DELETE | `/v1/users/connections/{application_id}` | `app/integrations/user_routes.py:154,190,225` | proposal / approve / revoke |
| POST | `/v1/users/connections/{application_id}/authorization-codes` | `app/integrations/user_routes.py:248` | |

Team oversight: `GET /v1/team/connections` (`app/integrations/team_routes.py:54`, **any** authenticated team role — no role check in handler; includes `financial`), `POST /v1/team/connections/{connection_id}/revoke` (`:95`, manager+ at `:115`).

One active connection per (user, application); revocation sets `revoked_at`, reconnection gets new UUID; `grant_version` bump invalidates older tokens (`docs/partner-connection-blueprint.md:44`, `connections.py:94-103,116-134`).

### 2.5 Mode D — Partner human portal (`/v1/partner/*`)

All under `require_partner_origin` (`app/partner/routes.py:49`). Context: `require_partner_organization` / `require_partner_application` re-check membership, org and app on every call (`app/partner/deps.py:83-115`). **No partner roles** — `PartnerMember`/`PartnerMembership` only have status (`app/partner/models.py:27,46`).

| Method | Path | File:line | Capability |
|---|---|---|---|
| POST | `/v1/partner/invitations/enroll` · `/confirm` · `/accept` | `app/partner/routes.py:461,480,597` | Onboarding (password + TOTP) / accept extra org |
| POST | `/v1/partner/sessions` | `app/partner/routes.py:500` | Login |
| GET/DELETE | `/v1/partner/sessions/current` | `app/partner/routes.py:526,634` | |
| POST | `/v1/partner/sessions/current/csrf` | `app/partner/routes.py:614` | |
| GET | `/v1/partner/organizations` | `app/partner/routes.py:548` | Orgs where member is active |
| POST | `/v1/partner/sessions/current/organization` | `app/partner/routes.py:570` | Switch active org |
| GET | `/v1/partner/applications` | `app/partner/routes.py:658` | Active apps of active org (`id,name,status`) |
| GET | `/v1/partner/applications/{application_id}` | `app/partner/routes.py:680` | |
| GET | `/v1/partner/applications/{application_id}/permissions` | `app/integrations/partner_credential_routes.py:71` | Granted codes + descriptions |
| GET/POST/DELETE | `.../credentials[/{credential_id}]` | `app/integrations/partner_credential_routes.py:94,131,186` | Self-service credentials |
| POST/GET/DELETE | `.../webhook-endpoint` | `app/integrations/partner_webhook_routes.py:59,89,164` | One endpoint per app |
| POST | `.../webhook-endpoint/test` | `app/integrations/partner_webhook_routes.py:112` | Signed `webhook.test` |
| PUT | `.../webhook-endpoint/status` | `app/integrations/partner_webhook_routes.py:136` | Activate requires prior successful test (`:157`) |
| GET | `.../webhook-deliveries` · `/{delivery_id}` | `app/integrations/partner_webhook_routes.py:187,217` | Delivery history |

Missing for partner (FACT: no routes): redirect-URI management, connections list/count, any metrics, commissions/settlements, promotions/coupons/links, commercial terms, analyses of connected users without a delegated token, partner people management (team-only), audit events of own credentials/permissions.

Team management of partner people (all `/v1/team/organizations/{organization_id}/...`): invitations POST `app/partner/routes.py:244` (admin, `:237`), resend `:360`, revoke `:394`, suspend `:416`, reactivate `:431` (admin); people list `:293` and events `:329` (manager+, `:308,345`).

### 2.6 Mode E — Outbound webhooks

- **Model:** one endpoint per application (`uq_webhook_endpoints_application`), status `draft|active|suspended`, secret Fernet-encrypted (`app/integrations/models.py:319-345`).
- **Event types (DB CHECK):** `analysis.completed`, `webhook.test` only (`app/integrations/models.py:353`). No others planned in code.
- **Delivery states:** `pending | attempted | delivered | unknown | skipped` (`app/integrations/models.py:352`).
- **Seeding:** on analysis work `completed` → `seed_for_analysis_request(owner_id, request_id)` (`app/analyses/svc/work.py:142-148`) → one row per active connection of that user containing `analysis:read` whose app has an `active` endpoint (`app/integrations/repo/webhook_delivery.py:18-47`). Unique per (connection, request, event) (`models.py:354-355`).
- **Send:** worker claims pending with `SKIP LOCKED` (`webhook_delivery.py:49-58`), marks `attempted` **before** POST (`workers/lanes/webhook_delivery_worker.py:139`), re-checks endpoint active, connection not revoked and still has `analysis:read`, app/org active, app grant `analysis:read` → else `skipped` (`:60-90`). POST once with 10 s timeout (`:36,106-111`).
- **Outcome:** 2xx → `delivered`; HTTP non-2xx → stays `attempted`; no response/timeout → `unknown` (`workers/lanes/webhook_delivery_worker.py:113-125`; `repo` `:112-133`). **No automatic retries** of any state (`docs/api-guide.md:462`).
- **Signing:** body = canonical JSON `{id, event, occurred_at, ...data}` sorted keys; header `X-Aferis-Signature: sha256=<hex HMAC-SHA256(secret, body)>`, `X-Aferis-Event-Id` (`app/integrations/svc/webhook_transport.py:17-30`). No timestamp header / anti-replay window (receiver must dedupe by id, `docs/api-guide.md:462`).
- **Transport safety:** HTTPS only, DNS resolved once, non-global IPs rejected, IP pinned with SNI, no redirects (`webhook_transport.py:33-78`).
- **Payload of `analysis.completed`:** `analysis_request_id`, `connection_id` (+ id, event, occurred_at) (`workers/lanes/webhook_delivery_worker.py:97-103`; `docs/api-guide.md:459`).
- **`webhook.test`:** synthetic, `message: "Teste de integração AferisAI"`, reserved as `attempted` before POST, quota **10 per hour per application** (`app/integrations/svc/webhook_tests.py:40-42,26`; repo `webhook_delivery.py:67-80,103-110`). Success sets `last_successful_test_at` (`webhook_tests.py:68`), which is required to activate (`partner_webhook_routes.py:157`, `admin_routes.py:736`).
- **Team endpoints:** POST/GET/DELETE `/v1/team/applications/{application_id}/webhook-endpoint` `app/integrations/admin_routes.py:616,670,751`; PUT status `:710`; POST test `:811`; GET deliveries `:837`, detail `:872`. Reads manager+ (`get_team_partner_reader`, `admin_routes.py:51-57`); writes manager+.
- **Gaps:** single event type; no event-type selection per endpoint; no retry/backoff, no manual redelivery; no secret rotation (delete + recreate); events fire for all analyses of a connected user regardless of origin; no events for analysis failure/needs-review, quote ready, payment received, connection revoked, credential expiring.

### 2.7 Mode F — Team roles

Roles: `viewer, manager, administrator, financial` (`app/team/roles.py:4-8`). Hierarchy viewer<manager<administrator; `financial` is isolated — `permits()` returns true only for exact match when either side is financial (`app/team/roles.py:18-25`). So `financial` fails every "viewer+" check.

| Area | Route(s) | viewer | manager | administrator | financial | Enforced at |
|---|---|---|---|---|---|---|
| Onboard org + first app (issues credential, grants `application:read`) | POST `/v1/team/organizations` `app/integrations/admin_routes.py:159` | – | ✓ | ✓ | – | `app/integrations/svc/onboarding.py:44` |
| Additional app | PUT `/v1/team/organizations/{oid}/applications/{aid}` `admin_routes.py:213` | – | ✓ | ✓ | – | `onboarding.py:84` |
| List applications | GET `/v1/team/applications` `app/integrations/application_team_routes.py:51` | ✓ | ✓ | ✓ | – | `application_team_routes.py:74` |
| Grant/revoke permission | PUT/DELETE `.../permissions/{code}` `admin_routes.py:345,383` | – | ✓ | ✓ | – | `app/integrations/svc/admin.py:53` |
| Bulk app edit | `app/integrations/bulk_routes.py:115,157` | – | ✓ | ✓ | – | `app/integrations/svc/bulk.py:69` |
| Redirect URIs | GET/PUT `admin_routes.py:284,312` | – | ✓ | ✓ | – | `app/integrations/svc/redirects.py:92` |
| Credentials | `admin_routes.py:419,464,515` | – | ✓ | ✓ | – | `app/integrations/svc/credential_admin.py:105` |
| Webhook endpoint/deliveries | `admin_routes.py:616-872` | – | ✓ | ✓ | – | `admin_routes.py:55`, `app/team/deps.py:102` |
| List connections | GET `/v1/team/connections` `app/integrations/team_routes.py:54` | ✓ | ✓ | ✓ | ✓ (no role check) | session only |
| Revoke connection | POST `.../connections/{id}/revoke` `team_routes.py:95` | – | ✓ | ✓ | – | `team_routes.py:115` |
| Org directory / detail / logo read | `app/organizations/admin_routes.py:109,156,395` | ✓ | ✓ | ✓ | – | `app/organizations/svc/directory.py:24`, `detail.py:32`, `logo.py:77` |
| Org profile / logo write / describe permission | `admin_routes.py:316,432,490,358` | – | ✓ | ✓ | – | `svc/profile.py:21`, `logo.py:118`, `catalog.py:21` |
| Org status / CNPJ | `admin_routes.py:266,281` | – | – (route dep allows, svc denies) | ✓ | – | `app/organizations/svc/management.py:95-99` |
| Org events | `admin_routes.py:296` | – | – | ✓ | – | `admin_routes.py:309` |
| Partner invites / suspend / reactivate | `app/partner/routes.py:244,360,394,416,431` | – | – | ✓ | – | `app/partner/routes.py:237,276` |
| Partner people list / events | `app/partner/routes.py:293,329` | – | ✓ | ✓ | – | `:308,345` |
| Commercial policies (all) | `app/pricing/admin_routes.py:166-313` | – | – | ✓ | – | `admin_routes.py:36,55`; repo `app/pricing/repo/commercial.py:116-120` |
| Promotions (all) | `app/pricing/promotion_routes.py:104-169` | – | – | ✓ | – | uses `get_commercial_reader/editor` |
| Commissions / settlements / reverse | `app/pricing/financial_routes.py:133,157,178,205` | – | – | – | ✓ | `financial_routes.py:35,54` |
| Dashboard counts/series | `app/team/dashboard_routes.py:147,205` | analyses | +registry | all 4 | payments+commissions | `dashboard_routes.py:172-188,244-247` |
| Team members list / invite / role / status / events | `app/team/routes.py:210`; `app/team/management_routes.py:131-270` | – | – | ✓ | – | `team/routes.py:247`; `management_routes.py:152,173,283`; `app/team/deps.py:85` |
| Users (CRM) list / events / status | `app/users/team_routes.py:57,155,138` | – | list ✓ | ✓ | – | `users/team_routes.py:84,168`; `app/users/svc/management.py:29` |
| Analysis triage / source / review / original access | `app/analyses/team_routes.py:333-712` | – | ✓ | ✓ | – | `app/analyses/svc/operations.py:56`, `source.py:68,88,141`, `review.py:94,125,151,253`, `team_read.py:48` |
| Payment exceptions | `app/payments/team_exception_routes.py:93-290` | – | ✓ (manager side) | ✓ (manager side) | ✓ (financial side; refunds only financial) | `app/payments/svc/exception_cases.py:85-97,139,184,220-246`; `exception_execution.py:46` |
| Provider accounts | `app/analyses/provider_account_routes.py:138-215` | – | – | ✓ | – | `:80,99` |
| ONR preview review | `app/acquisition/preview_review_routes.py:85-193` | – | ✓ | ✓ | – | `app/acquisition/preview_review.py:46` |
| Registry submission reconciliation | `app/acquisition/submission_reconciliation_routes.py:74-140` | – | ✓ | ✓ | – | `:61,94` |
| Registry requests list | GET `/v1/team/registry-requests` `app/acquisition/team_routes.py:53` | ✓ | ✓ | ✓ | ✓ (no role check; exposes `owner_user_id`) | session only |

### 2.8 Mode G — Public site / checkout (titular)

| Method | Path | File:line |
|---|---|---|
| POST/GET | `/v1/analyses` | `app/analyses/routes.py:384,578` |
| GET | `/v1/analyses/{id}` · `/original` · `/result` · `/report.pdf` | `app/analyses/routes.py:615,733,799,860` |
| POST | `/v1/analyses/{id}/quotes` (accepts optional `promotion_code`) | `app/analyses/routes.py:654` (field `:138`, passed `:719`) |
| POST | `/v1/payments/payer-profile` | `app/payments/user_routes.py:113` |
| POST/GET | `/v1/payments/analyses/{id}/pix` | `app/payments/user_routes.py:143,201` |
| POST | `/v1/registry-requests/number` · `/address` | `app/acquisition/owner_routes.py:132,161` |
| GET | `/v1/registry-requests` · `/{operation_id}` | `app/acquisition/owner_routes.py:190,222` |
| POST/GET | `/v1/registry-requests/{operation_id}/quote` | `app/acquisition/quote_routes.py:104,152` |
| POST/GET | `/v1/payments/registry-requests/{operation_id}/pix` | `app/payments/registry_routes.py:88,132` |
| GET | `/v1/registry-address/suggestions` · `/place` | `app/acquisition/address_routes.py:71,102` |

No `link`/referral landing endpoint exists (no route that captures a promo link and binds it to a session/user).

### 2.9 Modes H/I — Commercial policies, attribution, promotions, commissions

**Model (FACT)** `app/pricing/commercial_models.py`:
- `channel ∈ {site, integration, promotion}`, `source ∈ {number, cnm, address, upload}`, `attribution ∈ {public, connected, coupon, link}`, status `draft|published|suspended` (`:23-26`).
- Constraints: site ⇒ no org/app, `public`, no commission (`:31-32`); integration ⇒ app required, `connected` (`:33`); promotion ⇒ org required, `coupon|link` (`:34`).
- `PromotionAsset` kind `coupon|link`, `use_limit`, `use_count`, code stored as SHA-256 (`:117-141`); kind must equal policy attribution (`app/pricing/repo/commercial.py:482-483`).
- `CommissionEntry` `item_kind ∈ {analysis_completed, registry_completed}`, status `provisional|owed|settled|reversed` (`:95-96`); `CommissionSettlement` (`:74-87`).

**Runtime resolution (FACT):**
| Path | Where | What actually happens |
|---|---|---|
| Site/public | `app/pricing/repo/registry.py:283-287` | Registry quotes resolve only `channel="site", attribution="public"`. |
| Promotion (coupon/link) | `app/pricing/svc/quotes.py:141-156` → `PromotionRepo.redeem` `app/pricing/repo/commercial.py:518-541` | File-analysis quotes only. Increments `use_count` **at quote time** (not at payment). Computes discount and commission for beneficiary org. `redeem` does not check that the policy's `source`/`item_code` match `upload` (not verified elsewhere — ambiguity). Registry quotes have no promotion input (no hit in `app/acquisition/quote_routes.py`, `app/pricing/svc/registry_quotes.py`). |
| Integration/connected | — | **Never resolved at runtime.** `resolve()` is only called with `site/public` (`registry.py:283`); nothing calls it with `integration/connected`. Policies can be created but have no effect. |
| Commission lifecycle | seed `provisional` on payment `app/payments/svc/reconciliation.py:340` (`commercial.py:402-424`, analysis only); → `owed` on analysis completion `app/analyses/svc/work.py:143-145` (`commercial.py:426-441`); settle/reverse by `financial` (`app/pricing/financial_routes.py:178,205`). `registry_completed` is allowed by schema but never written. |

**Endpoints:** commercial policies `app/pricing/admin_routes.py:166,189,211,234,250,281,297,313`; promotions `app/pricing/promotion_routes.py:104,130,153,169`; commissions `app/pricing/financial_routes.py:133,157,178,205`. All team-only (admin / financial). None partner-facing.

### 2.10 Modes J/K

- Inbound Asaas: POST `/webhooks/asaas/payments` `app/payments/routes.py:41`, header `asaas-access-token` (`:58,100`). Event names handled: `PAYMENT_RECEIVED` (`app/payments/routes.py:86`), `PAYMENT_CONFIRMED`, `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_RECEIVED_IN_CASH_UNDONE` (`app/payments/svc/reconciliation.py:30-40`). Not partner-facing.
- Public anonymous: `/health` `app/main.py:242`, `/v1/registry-offices` `app/acquisition/catalog_routes.py:32`, `/seals/{code}/verify` `app/seals/routes.py:28`, `/openapi.json` `app/api_docs.py:38`.

---

## 3. Per-mode data-scope isolation (FACT)

| Mode | Isolation key | Where |
|---|---|---|
| A app token | credential → application; path must match | `app/integrations/routes.py:289-290` |
| B delegated | `claims.user_id` = analysis `owner_user_id`; connection id+version live | `app/integrations/svc/connections.py:136-168`; `app/analyses/partner_routes.py` reads via `*_for_owner(claims.user_id, …)` |
| C user | session user owns connection | `app/integrations/svc/connections.py:66-134` |
| D partner human | membership(active) + active org on session + app.organization_id == active org | `app/partner/deps.py:83-115` |
| E webhook | per connection of the analysis owner with `analysis:read`; endpoint per app | `app/integrations/repo/webhook_delivery.py:24-33`; worker `:60-90` |
| F team | role checks (table 2.7); not org-scoped (team sees all orgs) | — |

---

## 4. Events and metrics

### 4.1 Event types

| Event | Direction | Status | Where |
|---|---|---|---|
| `analysis.completed` | Aferis → partner | Implemented | `app/integrations/models.py:353`; seed `app/integrations/repo/webhook_delivery.py:41`; trigger `app/analyses/svc/work.py:146` |
| `webhook.test` | Aferis → partner | Implemented | `app/integrations/repo/webhook_delivery.py:73`; `app/integrations/svc/webhook_tests.py` |
| `PAYMENT_*` (11 names) | Asaas → Aferis | Implemented (inbound) | `app/payments/svc/reconciliation.py:30-40` |
| Owner notices (email/WhatsApp) to titular | Aferis → titular | Implemented, not partner events | `app/notifications/analysis.py:1-29`; `docs/owner-notice-blueprint.md` |
| Event categories per connection scope | — | DOC-ONLY | `docs/partner-connection-blueprint.md:35` |
| Registry/certificate events for partner | — | DOC-ONLY | `docs/registry-execution-plan.md:39` |

Internal audit event tables (not webhooks): `PermissionChangeEvent` (`app/integrations/models.py:232`), credential change events (`:203`), `UserConnectionEvent` (`:143`), `PartnerOnboardingEvent`, `PartnerManagementEvent` (`app/partner/models.py:79-80`), organization permission events (`database/versions/f4a8296c73de_organization_permission_events.py:17`), commercial policy events (`app/pricing/commercial_models.py:60-71`). No route exposes credential/permission change events to partners.

### 4.2 Metrics / reports exposing partner-related data

| Metric | Implemented? | Endpoint / where | Partner-scoped? |
|---|---|---|---|
| Applications per organization | Yes | `GET /v1/team/organizations` field `applications_count` (`app/organizations/admin_routes.py:48,148`) | Team only |
| Active connections (list, filter by app) | Yes (list, not counts) | `GET /v1/team/connections?application_id=` (`app/integrations/team_routes.py:54`) | Team only |
| Webhook deliveries per app (with status filter) | Yes (list) | team `app/integrations/admin_routes.py:837`; partner `app/integrations/partner_webhook_routes.py:187` | Partner sees own |
| Global analyses / registry / payments / commissions status counts and daily series | Yes | `GET /v1/team/dashboard`, `/series` (`app/team/dashboard_routes.py:147,205`) | **Global**, not per org/app |
| Promotion asset usage (`use_count`, `use_limit`) | Yes | `GET /v1/team/promotions[/{id}]` (`app/pricing/promotion_routes.py:130,153`; field `:53,68,86`) | Admin only |
| Commission entries / settlements by beneficiary & status | Yes | `GET /v1/team/commissions`, `/commission-settlements` (`app/pricing/financial_routes.py:133,157`) | Financial only |
| Analyses per partner application / connection | **No** (no attribution stored) | — | — |
| Referrals / link clicks / coupon conversions (paid) | **No** (`use_count` counts quote redemptions only) | — | — |
| Partner self-service commission statement | **No** | DOC-ONLY gap `docs/pending.md:3496-3501` | — |
| Webhook delivery aggregate counts | Worker CLI only | `WebhookDeliveryRepo.status_counts` `app/integrations/repo/webhook_delivery.py:135-139`, `workers/lanes/webhook_delivery_worker.py:191-193` | Not via HTTP |

---

## 5. Ambiguities / not confirmed

1. Whether `PromotionRepo.redeem` should reject a promotion policy whose `source`/`item_code` differs from the file-upload quote — the code at `app/pricing/repo/commercial.py:518-541` and `app/pricing/svc/quotes.py:141-156` does not check it; I did not find another guard.
2. `use_count` increments at quote creation; if a quote is created and abandoned, the use is consumed. Whether that is intended is not documented.
3. Team `GET /v1/team/connections` and `GET /v1/team/registry-requests` have no role check (financial can read). `docs/api-guide.md:424` says "qualquer papel" for connections, so it seems intended; for registry requests I found no doc statement.
4. I did not run the test suite or the app against a database; behaviour is inferred from code and docs.
5. Front-end consent screen (`/conexoes/aprovar`) lives in another repo (`../frontend`), not inspected.

---

## 6. PROPOSAL — gap list for a complete integration product (not facts)

### 6.1 Permissions / scopes
- `analysis:quote:read` / `analysis:quote:create` — delegated quote of a submitted file.
- `payment:create` (PIX intent for the titular, with explicit user confirmation) and `payment:read` (status only).
- `registry:create:number`, `registry:create:address`, `registry:read` — delegated registry acquisition (docs already demand separate scopes, `docs/registry-execution-plan.md:59`).
- `certificate:read` (when certificates exist).
- `analysis:original:read` — explicitly separate, high-sensitivity.
- `events:analysis` (or per-event subscription scopes) — decouple webhook delivery from `analysis:read`.
- App-level (non-delegated) scopes for the partner's own data: `metrics:read`, `commissions:read`, `connections:read` (counts, no PII), `webhooks:manage` (for API-driven endpoint management).
- Restrict delegated reads to analyses originated by the application, or add an explicit `analysis:read:all` vs `analysis:read:own-origin` distinction.
- Partner member roles (e.g., `owner`, `developer`, `finance-viewer`) instead of all-powerful membership.

### 6.2 Data model prerequisites
- Persist `origin_application_id` + `connection_id` on analysis requests / registry operations created via partner (needed for metrics, `integration/connected` commissions, scoped reads).
- Wire `channel=integration, attribution=connected` resolution into quotes.
- A `CommercialAttribution` record per quote (already in blueprint, `docs/commercial-policy-blueprint.md:26`).
- Promotion link landing/capture endpoint and attribution persistence across signup/session.

### 6.3 Events
- `analysis.created`, `analysis.quote_ready`, `analysis.failed` / `analysis.needs_review`, `analysis.result_updated`.
- `payment.received`, `payment.refunded`.
- `registry.request.updated`, `registry.document.acquired`.
- `connection.granted`, `connection.changed`, `connection.revoked`.
- `credential.expiring` (before the 30/90/180-day expiry), `webhook.endpoint.disabled`.
- `commission.owed`, `commission.settled`.
- Delivery: retries with backoff for `attempted`, manual redelivery with audit, timestamp header for anti-replay, secret rotation with overlap, per-endpoint event-type selection.

### 6.4 Metrics / reports for partners
- Per application: connections (active/revoked counts), delegated submissions, completed analyses, result reads, webhook success rate.
- Per promotion asset: redemptions, paid conversions, revenue, discount granted.
- Commission statement: provisional / owed / settled / reversed totals and items, settlement evidence references.
- Exposed via partner portal (`/v1/partner/...`) and optionally via app token with a `metrics:read`/`commissions:read` scope.
