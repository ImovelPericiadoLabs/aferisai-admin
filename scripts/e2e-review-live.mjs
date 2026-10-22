import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { chromium } from "playwright-core";

const file = process.env.E2E_CREDENTIALS_FILE;
if (!file) throw new Error("E2E_CREDENTIALS_FILE is required");
const credentials = JSON.parse(await readFile(file, "utf8"));
for (const field of [
  "email",
  "password",
  "totp_secret",
  "work_id",
  "request_id",
  "source_request_id",
]) {
  if (typeof credentials[field] !== "string" || !credentials[field]) {
    throw new Error(`Missing synthetic field: ${field}`);
  }
}

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const letter of secret.replace(/=/g, "").toUpperCase()) {
    const digit = alphabet.indexOf(letter);
    if (digit < 0) throw new Error("Invalid TOTP secret");
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
  return String(
    (hash.readUInt32BE(hash.at(-1) & 15) & 0x7fffffff) % 1000000,
  ).padStart(6, "0");
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("requestfailed", (request) => {
  browserErrors.push(
    `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
  );
});

try {
  await page.goto(process.env.E2E_PANEL_URL || "http://localhost:5173", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "Entrar na área da equipe" })
    .waitFor();
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.waitForTimeout(30000 - (Date.now() % 30000) + 300);
  await page.locator("#otp").fill(totp(credentials.totp_secret));
  await page.getByRole("button", { name: "Entrar com segurança" }).click();
  await page
    .getByRole("heading", { name: "Visão geral" })
    .waitFor({ timeout: 15000 });
  browserErrors.length = 0;
  await page.getByRole("button", { name: /Fontes/ }).click();
  await page.locator(".review-queue-list").getByRole("button", { name: "Conferir" }).click();
  if (await page.getByLabel("ID da solicitação").inputValue() !== credentials.source_request_id)
    throw new Error("Source queue selected the wrong request");
  await page.getByText("Ainda não existe decisão para este arquivo.").waitFor();
  await page
    .getByLabel("Motivo da leitura")
    .fill("Conferência pré-cobrança do original sintético isolado.");
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page.getByAltText("Original enviado para conferência").waitFor();
  await page.getByLabel("Natureza do original").selectOption("registry_record");
  await page
    .getByLabel("Motivo da classificação")
    .fill("Documento sintético classificado para teste da rota.");
  await page
    .getByLabel("Conferi visualmente o original e as páginas relevantes para esta classificação.")
    .check();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page.getByText(/Classificação .* registrada/).waitFor();
  await page.locator(".source-current dd").filter({ hasText: "Documento registral" }).waitFor();
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page.getByAltText("Original enviado para conferência").waitFor();
  await page.getByLabel("Natureza do original").selectOption("third_party_report");
  await page
    .getByLabel("Motivo da classificação")
    .fill("Correção da fonte sintética após nova leitura auditada.");
  await page
    .getByLabel("Conferi visualmente o original e as páginas relevantes para esta classificação.")
    .check();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page.getByText(/Classificação .* registrada/).waitFor();
  await page.locator(".source-current dd").filter({ hasText: "Relatório derivado" }).waitFor();
  const sourceRevision = await page.locator(".source-current dd").nth(1).innerText();
  if (sourceRevision.trim() !== "2")
    throw new Error(`Expected the second source revision, got ${sourceRevision}`);
  await page.getByRole("button", { name: /Análises/ }).click();
  await page.getByRole("heading", { name: "Revisar evidências" }).waitFor();
  await page.getByText(`Trabalho ${credentials.work_id}`).waitFor();
  await page.getByRole("button", { name: "Conferir", exact: true }).click();
  await page
    .getByRole("heading", { name: "Achados para conferência" })
    .waitFor();
  await page.getByText(credentials.request_id).waitFor();
  await page
    .getByLabel("Motivo da leitura")
    .fill("Conferência técnica do original sintético isolado.");
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page
    .getByAltText("Original enviado para conferência")
    .waitFor({ timeout: 15000 });
  await page.getByLabel("Aprovar pacote factual").check();
  await page.getByLabel("Natureza do original").selectOption("registry_record");
  const flags = await page
    .locator("fieldset")
    .filter({ hasText: "Flags técnicas confirmadas" })
    .locator('input[type="checkbox"]')
    .all();
  for (const flag of flags) await flag.check();
  const citations = await page.locator(".review-citation").all();
  if (citations.length !== 2)
    throw new Error(`Expected two citations, got ${citations.length}`);
  for (const citation of citations) {
    await citation.getByRole("button", { name: "Marcar no original" }).click();
    const overlay = page.locator(".review-page-overlay.is-marking");
    await overlay.scrollIntoViewIfNeeded();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("Visual marking surface absent");
    await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.08);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.45, {
      steps: 5,
    });
    await page.mouse.up();
    await citation
      .getByLabel("Motivo desta conferência")
      .fill("Trecho sintético conferido na imagem de teste.");
  }
  await page
    .getByLabel("Motivo da decisão")
    .fill("Revisão sintética integrada do pacote e das citações.");
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page.getByText(/Decisão .* registrada/).waitFor({ timeout: 15000 });
  await page.getByText("Aprovada", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Sair da conta/ }).click();
  await page
    .getByRole("heading", { name: "Entrar na área da equipe" })
    .waitFor();
  if (browserErrors.length)
    throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
  process.stdout.write(
    "PASS: login, source classification and correction, queue, audited original, image, citations, persisted decision, logout.\n",
  );
} catch (error) {
  process.stderr.write(`FAIL: ${error.message}\n`);
  process.stderr.write(
    `Alerts: ${(await page.getByRole("alert").allTextContents()).join(" | ")}\n`,
  );
  process.stderr.write(`Browser: ${browserErrors.join(" | ")}\n`);
  process.stderr.write(
    `Page: ${(await page.locator("body").innerText()).slice(0, 800)}\n`,
  );
  throw error;
} finally {
  await context.close();
  await browser.close();
}
