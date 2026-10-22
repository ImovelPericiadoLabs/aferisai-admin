import { readFile } from "node:fs/promises";
import { createHmac, randomBytes } from "node:crypto";
import { chromium } from "playwright-core";

const credentialsPath = process.env.E2E_CREDENTIALS_FILE;
if (!credentialsPath) throw new Error("E2E_CREDENTIALS_FILE is required");

const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
for (const key of ["email", "password", "totp_secret"]) {
  if (typeof credentials[key] !== "string" || !credentials[key]) {
    throw new Error(`Missing synthetic credential field: ${key}`);
  }
}

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const letter of secret.replace(/=/g, "").toUpperCase()) {
    const digit = alphabet.indexOf(letter);
    if (digit < 0) throw new Error("Invalid TOTP secret format");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hash.at(-1) & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const origin = process.env.E2E_PANEL_URL || "http://localhost:5173";
const slug = `e2e-${Date.now()}-${randomBytes(3).toString("hex")}`;
const viewerMode = process.env.E2E_ROLE === "viewer";
let pageErrors = 0;
page.on("pageerror", () => { pageErrors += 1; });

try {
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Entrar na área da equipe" }).waitFor();
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.waitForTimeout(30000 - (Date.now() % 30000) + 300);
  await page.locator("#otp").fill(totp(credentials.totp_secret));
  await page.getByRole("button", { name: "Entrar com segurança" }).click();
  await page.getByRole("heading", { name: "Visão geral" }).waitFor();

  if (viewerMode) {
    await page.getByText("Leitor", { exact: true }).waitFor();
    await page.getByRole("button", { name: /Organizações/ }).click();
    await page.getByRole("heading", { name: "Organizações cadastradas" }).waitFor();
    if (await page.getByRole("button", { name: /Nova organização/ }).count()) throw new Error("Viewer can see organization creation");
    await page.getByRole("row").filter({ has: page.getByRole("button", { name: /^Abrir / }) }).first().getByRole("button", { name: /^Abrir / }).click();
    await page.getByRole("heading", { name: "Perfil" }).waitFor();
    for (const name of ["Editar perfil", "Editar descrição", "Enviar logo", /Conceder/, /Revogar/]) {
      if (await page.getByRole("button", { name }).count()) throw new Error(`Viewer can see mutation: ${name}`);
    }
    await page.getByRole("button", { name: /Sair da conta/ }).click();
    await page.getByRole("heading", { name: "Entrar na área da equipe" }).waitFor();
    if (pageErrors) throw new Error(`Browser reported ${pageErrors} page error(s)`);
    process.stdout.write("E2E local: leitor consultou diretório e detalhe sem ações de mudança; saída passou.\n");
  } else {
  await page.getByRole("button", { name: /Organizações/ }).click();
  await page.getByRole("heading", { name: "Organizações cadastradas" }).waitFor();
  await page.getByRole("button", { name: /Nova organização/ }).click();
  await page.locator("#org-name").fill("Organização de teste E2E");
  await page.locator("#org-slug").fill(slug);
  await page.locator("#app-name").fill("Aplicação de teste E2E");
  await page.getByRole("button", { name: /Cadastrar parceria/ }).click();
  await page.getByRole("heading", { name: "Credencial criada" }).waitFor();
  const secret = await page.locator(".result .secret").textContent();
  if (!secret?.trim()) throw new Error("One-time credential was not displayed");
  const initialClientId = await page.locator(".result dl > div").filter({ hasText: "Client ID" }).locator("dd").textContent();
  if (!initialClientId?.trim()) throw new Error("Initial client ID was not displayed");
  await page.getByRole("button", { name: "Limpar e voltar à lista" }).click();
  await page.locator("#org-search").fill(slug);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByText(slug, { exact: true }).waitFor();
  await page.getByRole("row").filter({ hasText: slug }).getByRole("button", { name: "Abrir Organização de teste E2E" }).click();
  try {
    await page.getByRole("heading", { name: "Organização de teste E2E" }).waitFor({ timeout: 10000 });
  } catch (cause) {
    const alerts = await page.getByRole("alert").allTextContents();
    throw new Error(`Detail did not load; alerts: ${alerts.join(" | ")}`, { cause });
  }
  await page.getByRole("heading", { name: "Aplicações" }).waitFor();
  await page.getByText("Aplicação de teste E2E").waitFor();
  await page.getByRole("region", { name: "Aplicações" }).getByText("application:read", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`Detail overflows narrow screen by ${overflow}px`);
  await page.screenshot({ path: "/tmp/aferisai-admin-detail-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Editar perfil" }).click();
  await page.locator("#profile-name").fill("Organização de teste E2E atualizada");
  await page.locator("#profile-description").fill("Descrição sintética para teste de persistência.");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await page.getByRole("heading", { name: "Organização de teste E2E atualizada" }).waitFor();
  await page.getByText("Descrição sintética para teste de persistência.").waitFor();
  await page.getByRole("button", { name: "Editar descrição" }).click();
  await page.locator("#permission-description").fill("Leitura sintética da aplicação E2E");
  await page.getByRole("button", { name: "Salvar descrição" }).click();
  await page.getByText("Leitura sintética da aplicação E2E").waitFor();
  await page.getByRole("button", { name: "Revogar application:read" }).click();
  await page.getByRole("button", { name: "Conceder application:read" }).waitFor();
  await page.getByRole("button", { name: "Conceder application:read" }).click();
  await page.getByRole("button", { name: "Revogar application:read" }).waitFor();
  await page.locator("#logo-file").setInputFiles(new URL("../public/icon-192.png", import.meta.url).pathname);
  await page.getByRole("button", { name: "Enviar logo" }).click();
  await page.locator(".detail-logo img").waitFor();
  await page.getByRole("button", { name: "Remover logo" }).click();
  await page.locator(".detail-logo img").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Emitir nova credencial" }).click();
  await page.getByRole("button", { name: "Confirmar emissão" }).click();
  try {
    await page.getByText("Novo segredo: exibição única").waitFor({ timeout: 10000 });
  } catch (cause) {
    const alerts = await page.getByRole("alert").allTextContents();
    const recovery = await page.locator(".credential-recovery").allTextContents();
    throw new Error(`Credential was not displayed; alerts: ${alerts.join(" | ")}; recovery: ${recovery.join(" | ")}`, { cause });
  }
  const replacementSecret = await page.locator(".credential-issued .secret").textContent();
  if (!replacementSecret?.trim() || replacementSecret === secret) throw new Error("Replacement secret was missing or reused");
  await page.getByRole("button", { name: "Entendi, ocultar segredo" }).click();
  await page.locator(".credential-issued .secret").waitFor({ state: "detached" });
  const originalCredential = page.locator(".credential-list > li").filter({ hasText: initialClientId.trim() });
  await originalCredential.getByRole("button", { name: "Revogar credencial" }).click();
  await originalCredential.getByRole("button", { name: "Confirmar revogação" }).click();
  await originalCredential.getByText("Revogada", { exact: true }).waitFor();
  let intercepted = false;
  const lostResponse = async (route) => {
    if (route.request().method() !== "POST" || intercepted) {
      await route.continue();
      return;
    }
    intercepted = true;
    const response = await route.fetch();
    if (response.status() !== 201) throw new Error(`Synthetic issue failed: ${response.status()}`);
    await route.abort("failed");
  };
  await page.route("**/v1/team/applications/*/credentials", lostResponse);
  await page.getByRole("button", { name: "Emitir nova credencial" }).click();
  await page.getByRole("button", { name: "Confirmar emissão" }).click();
  await page.getByText("Emissão com resultado desconhecido").waitFor();
  await page.unroute("**/v1/team/applications/*/credentials", lostResponse);
  if (!intercepted) throw new Error("Lost-response scenario did not intercept issue");
  const attempt = await page.locator(".credential-recovery code").first().textContent();
  if (!attempt?.trim()) throw new Error("Lost issue request ID was not retained");
  await page.getByRole("button", { name: "Atualizar" }).click();
  await page.getByText(/foi registrada, mas o segredo não pode ser recuperado/).waitFor();
  const orphanCredential = page.locator(".credential-list > li").filter({ hasText: attempt.trim() });
  await orphanCredential.getByRole("button", { name: "Revogar credencial" }).click();
  await orphanCredential.getByRole("button", { name: "Confirmar revogação" }).click();
  await page.locator(".credential-recovery").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Voltar ao diretório" }).click();
  await page.locator("#org-search").fill(slug);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("row").filter({ hasText: slug }).getByRole("button", { name: "Abrir Organização de teste E2E atualizada" }).click();
  await page.getByText("Descrição sintética para teste de persistência.").waitFor();
  await page.getByRole("button", { name: /Sair da conta/ }).click();
  await page.getByRole("heading", { name: "Entrar na área da equipe" }).waitFor();
  if (pageErrors) throw new Error(`Browser reported ${pageErrors} page error(s)`);
  process.stdout.write("E2E local: login, diretório, cadastro sintético, perfil, catálogo, concessão, logo, troca e reconciliação de credenciais e saída passaram.\n");
  }
} finally {
  await context.close();
  await browser.close();
}
