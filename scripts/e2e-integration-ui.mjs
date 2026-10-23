import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
});
const origin = process.env.E2E_PANEL_URL || "http://127.0.0.1:5173";
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
let loggedIn = false;
let endpoint = null;
let credentials = [];
const applicationId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0";
const deliveryId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1";
const event = {
  id: deliveryId,
  event_type: "webhook.test",
  status: "delivered",
  endpoint_url: "https://api.exemplo.com/webhooks/aferis",
  http_status: 200,
  duration_ms: 184,
  created_at: "2026-10-23T12:00:00Z",
  attempted_at: "2026-10-23T12:00:00Z",
  is_test: true,
};

const respond = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
await page.route("**/v1/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  if (path === "/v1/partner/sessions/current" && request.method() === "GET")
    return respond(
      route,
      loggedIn
        ? {
            id: "member",
            email: "parceiro@exemplo.com",
            organization_id: "org",
            organization_name: "Cartório Central",
          }
        : { detail: "Sem sessão" },
      loggedIn ? 200 : 401,
    );
  if (path === "/v1/partner/sessions/current/csrf")
    return respond(route, { csrf_token: "csrf" });
  if (path === "/v1/partner/sessions" && request.method() === "POST") {
    loggedIn = true;
    return respond(route, { csrf_token: "csrf", expires_in: 3600 });
  }
  if (path === "/v1/partner/applications")
    return respond(route, {
      items: [
        { id: applicationId, name: "Integração principal", status: "active" },
      ],
      next_cursor: null,
    });
  if (path.endsWith("/permissions"))
    return respond(route, {
      items: [
        {
          code: "application:read",
          description: "Consultar a própria integração.",
        },
      ],
    });
  if (path.endsWith("/webhook-endpoint") && request.method() === "GET")
    return endpoint
      ? respond(route, endpoint)
      : respond(route, { detail: "Ausente" }, 404);
  if (path.endsWith("/webhook-endpoint") && request.method() === "POST") {
    endpoint = {
      id: "endpoint",
      application_id: applicationId,
      url: JSON.parse(request.postData()).url,
      status: "draft",
      created_at: "2026-10-23T12:00:00Z",
      plain_secret: "chave-de-teste",
    };
    return respond(route, endpoint, 201);
  }
  if (path.endsWith("/webhook-endpoint/test")) return respond(route, event);
  if (path.endsWith("/webhook-endpoint/status")) {
    endpoint = {
      ...endpoint,
      status: JSON.parse(request.postData()).status,
      plain_secret: null,
    };
    return respond(route, endpoint);
  }
  if (path.endsWith("/webhook-deliveries"))
    return respond(route, { items: [event], next_cursor: null });
  if (path.endsWith(`/webhook-deliveries/${deliveryId}`))
    return respond(route, event);
  if (path.endsWith("/credentials") && request.method() === "GET")
    return respond(route, { items: credentials, next_cursor: null });
  if (path.endsWith("/credentials") && request.method() === "POST") {
    const input = JSON.parse(request.postData());
    credentials = [
      {
        id: "cred",
        client_id: "af_test_1",
        status: "active",
        created_at: "2026-10-23T12:00:00Z",
        revoked_at: null,
        issue_request_id: request.headers()["idempotency-key"],
        name: input.name,
        scopes: input.scopes,
        expires_at: "2027-01-23T12:00:00Z",
      },
    ];
    return respond(
      route,
      { ...credentials[0], client_secret: "secret-once" },
      201,
    );
  }
  return respond(route, { detail: `Sem resposta simulada: ${path}` }, 404);
});

try {
  await page.goto(`${origin}/#parceiro`);
  await page
    .getByRole("heading", { name: "Entre na sua integração" })
    .waitFor();
  await page.getByLabel("E-mail").fill("parceiro@exemplo.com");
  await page.getByLabel("Senha").fill("senha-de-teste-com-15-caracteres");
  await page.getByLabel("Código do autenticador").fill("123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("heading", { name: "Integração principal" }).waitFor();
  if (await page.getByRole("button", { name: "Parceiros" }).count())
    throw new Error("Navegação interna exposta ao parceiro");
  await page
    .getByRole("button", { name: "Webhooks", exact: true })
    .first()
    .click();
  await page
    .getByLabel("URL do webhook")
    .fill("https://api.exemplo.com/webhooks/aferis");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Chave de assinatura · exibição única").waitFor();
  await page
    .getByLabel("Configurei a verificação da assinatura no meu servidor.")
    .check();
  await page.getByRole("button", { name: "Enviar teste assinado" }).click();
  await page.getByText("Teste recebido pelo destino").waitFor();
  await page.getByRole("button", { name: "Ativar webhook" }).click();
  await page
    .locator(".webhook-destination .integration-status")
    .filter({ hasText: "Ativo" })
    .waitFor();
  await page
    .getByRole("button", { name: "Entregas", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Evento de teste/ }).click();
  await page.getByRole("dialog").getByText("HTTP 200").waitFor();
  await page.getByRole("button", { name: "Fechar detalhe" }).click();
  await page
    .getByRole("button", { name: "Credenciais", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Emitir nova credencial" }).click();
  await page.getByLabel("Nome da credencial").fill("Sistema de produção");
  await page.screenshot({
    path: "/tmp/aferis-credential-form-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Confirmar emissão" }).click();
  await page
    .getByText("Credencial emitida · segredo exibido uma vez")
    .waitFor();
  await page.getByRole("button", { name: "Entendi, ocultar segredo" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "/tmp/aferis-partner-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByText("Consulta os dados da própria aplicação.").waitFor();
  await page.screenshot({
    path: "/tmp/aferis-permissions-mobile.png",
    fullPage: true,
  });
  const width = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  if (width.doc > width.viewport)
    throw new Error(`Rolagem horizontal em 390px: ${JSON.stringify(width)}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "Webhooks", exact: true })
    .first()
    .click();
  await page.getByRole("heading", { name: "Webhook", exact: true }).waitFor();
  await page.screenshot({
    path: "/tmp/aferis-partner-desktop.png",
    fullPage: true,
  });
  if (failures.length)
    throw new Error(`Erros de página: ${failures.join("; ")}`);
  process.stdout.write(
    "E2E integração: login parceiro, aplicação única, webhook, teste, ativação, entregas, credencial e 390px passaram.\n",
  );
} finally {
  await browser.close();
}
