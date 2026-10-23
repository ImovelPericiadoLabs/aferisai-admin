import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const origin = process.env.E2E_PANEL_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
});
const workId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0";
const requestId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1";
const decisionId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a2";
const attentionWorkId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a5";
const outdatedWorkId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a6";
const inconclusiveWorkId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a7";
const expiredUndecidedWorkId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a8";
const automaticExceptionWorkId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a9";
const sourceDecisionIds = [
  "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a3",
  "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a4",
];
const icon = await readFile(new URL("../public/icon-192.png", import.meta.url));
function makePdf() {
  const pageText = (label) => `BT /F1 18 Tf 24 350 Td (${label}) Tj ET`;
  const stream = (content) =>
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    stream(pageText("Pagina um")),
    stream(pageText("Pagina dois")),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let value = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(value));
    value += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(value);
  value += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    value += `${String(offset).padStart(10, "0")} 00000 n \n`;
  value += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(value);
}
const pdf = makePdf();
const packet = {
  work_id: workId,
  request_id: requestId,
  expires_at: "2026-11-18T12:00:00Z",
  latest_decision_id: null,
  latest_outcome: null,
  flags: ["timeline_unresolved"],
  findings: {
    registry_identifiers: {
      registration_numbers: [{ value: "123", page: 1 }],
      registry_offices: [],
      municipalities: [],
    },
    persons_mentioned: [
      { name: "Pessoa A", page: 1, ownership_form: "unspecified" },
    ],
    burdens_mentioned: { penhora: [], hipoteca: [] },
    acts_cited: [],
  },
  citation_checks: [
    { kind: "owner", value: "Pessoa A", page: 1, status: "no_text_layer" },
  ],
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
let pageErrors = 0;
const consoleIssues = [];
let decisionBody;
let originalBody;
let sourceLatest = null;
const sourceBodies = [];
let originalMime = "image/png";
page.on("pageerror", () => {
  pageErrors += 1;
});
page.on("console", (entry) => {
  if (entry.type() === "error" || entry.type() === "warning")
    consoleIssues.push(`${entry.text()} ${entry.location().url}`);
});
await page.route("**/v1/team/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  const send = (body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  if (path === "/v1/team/sessions/current/csrf")
    return send({ csrf_token: "synthetic-csrf" });
  if (path === "/v1/team/sessions/current")
    return send({ id: workId, email: "equipe@example.test", role: "manager" });
  if (path === "/v1/team/dashboard")
    return send({
      analyses: { queued: 0, running: 0, completed: 1, error: 0 },
      registry_requests: { pending: 0, dispatched: 0, confirmed: 0, error: 0 },
    });
  if (path === "/v1/team/dashboard/series") {
    const url = new URL(request.url());
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const compare = url.searchParams.get("compare") === "true";
    const first = new Date(`${startDate}T00:00:00Z`);
    const days =
      Math.round(
        (Date.parse(`${endDate}T00:00:00Z`) - first.valueOf()) / 86400000,
      ) + 1;
    const make = (offset) =>
      Array.from({ length: days }, (_, index) => ({
        date: new Date(first.valueOf() + (index + offset) * 86400000)
          .toISOString()
          .slice(0, 10),
        count: index % 4,
      }));
    const series = {
      current: make(0),
      ...(compare ? { previous: make(-days) } : {}),
    };
    return send({
      timezone: "UTC",
      start_date: startDate,
      end_date: endDate,
      compare,
      series: { analyses: series, registry_requests: series },
    });
  }
  if (path === "/v1/team/analysis-requests")
    return send({ items: [], next_cursor: null });
  if (path === "/v1/team/analysis-works/pending-reviews")
    return send({
      items: packet.latest_decision_id
        ? []
        : [
            {
              work_id: workId,
              request_id: requestId,
              completed_at: "2026-10-19T12:00:00Z",
              expires_at: packet.expires_at,
            },
          ],
      next_cursor: null,
    });
  if (path === "/v1/team/analysis-works/attention")
    return send({
      items: [
        {
          work_id: attentionWorkId,
          request_id: requestId,
          status: "unknown",
          error_code: "analysis.work_interrupted",
          finished_at: "2026-10-19T12:00:00Z",
        },
        {
          work_id: outdatedWorkId,
          request_id: requestId,
          status: "completed",
          error_code: "analysis.review_version_outdated",
          finished_at: "2026-10-19T12:00:00Z",
        },
        {
          work_id: inconclusiveWorkId,
          request_id: requestId,
          status: "completed",
          error_code: "analysis.review_inconclusive",
          finished_at: "2026-10-19T12:00:00Z",
        },
        {
          work_id: automaticExceptionWorkId,
          request_id: requestId,
          status: "completed",
          error_code: "analysis.automatic_exception",
          finished_at: "2026-10-19T12:00:00Z",
        },
        {
          work_id: expiredUndecidedWorkId,
          request_id: requestId,
          status: "completed",
          error_code: "analysis.review_expired_undecided",
          finished_at: "2026-10-19T12:00:00Z",
        },
      ],
      next_cursor: null,
    });
  if (path === "/v1/team/analysis-requests/pending-source-classifications")
    return send({
      items: sourceLatest
        ? []
        : [
            {
              request_id: requestId,
              created_at: "2026-10-19T12:00:00Z",
              expires_at: "2026-11-18T12:00:00Z",
            },
          ],
      next_cursor: null,
    });
  if (path === `/v1/team/analysis-works/${workId}/review`) return send(packet);
  if (
    path === `/v1/team/analysis-requests/${requestId}/source-decisions/latest`
  )
    return send({ decision: sourceLatest });
  if (path === `/v1/team/analysis-requests/${requestId}/source-decisions`) {
    const body = request.postDataJSON();
    sourceBodies.push(body);
    const id = sourceDecisionIds[sourceBodies.length - 1];
    sourceLatest = {
      id,
      source_kind: body.source_kind,
      reason: body.reason,
      revision: sourceBodies.length,
      created_at: "2026-10-19T12:00:00Z",
    };
    return send({ id }, 201);
  }
  if (path === `/v1/team/analysis-requests/${requestId}/original-accesses`) {
    originalBody = request.postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: originalMime,
      body: originalMime === "application/pdf" ? pdf : icon,
    });
  }
  if (path === `/v1/team/analysis-works/${workId}/review-decisions`) {
    decisionBody = request.postDataJSON();
    packet.latest_decision_id = decisionId;
    packet.latest_outcome = "approved";
    return send({ id: decisionId });
  }
  return send({ code: "not_found", detail: "Rota sintética ausente." }, 404);
});

try {
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Relatórios/ }).click();
  await page.locator(".dash-report-card").first().waitFor();
  await page.waitForTimeout(800);
  const donutOffset = await page.locator(".dash-report-card").first().evaluate((card) => {
    const track = card.querySelector(".dash-donut-track")?.getBoundingClientRect();
    const segment = card.querySelector(".dash-donut-segment")?.getBoundingClientRect();
    return track && segment ? Math.abs((track.top + track.bottom) / 2 - (segment.top + segment.bottom) / 2) : Infinity;
  });
  if (donutOffset > 2) throw new Error(`Donut segments are displaced from the track by ${donutOffset}px`);
  await page.locator(".dash-report-card").first().screenshot({ path: "/tmp/aferisai-donut-fixed.png" });
  await page.getByRole("button", { name: /Fontes/ }).click();
  await page
    .getByRole("heading", { name: "Aguardando classificação" })
    .waitFor();
  await page
    .locator(".review-queue-list")
    .getByRole("button", { name: "Conferir" })
    .click();
  if ((await page.getByLabel("ID da solicitação").inputValue()) !== requestId)
    throw new Error("The queue did not select the pending request");
  await page.getByText("Ainda não existe decisão para este arquivo.").waitFor();
  await page
    .getByLabel("Motivo da leitura")
    .fill("Conferência da fonte antes da cobrança.");
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page.getByAltText("Original enviado para conferência").waitFor();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(250);
  const sourcePreviewOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (sourcePreviewOverflow > 1)
    throw new Error(
      `Source preview overflows 320px by ${sourcePreviewOverflow}px`,
    );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Natureza do original").selectOption("registry_record");
  await page
    .getByLabel("Motivo da classificação")
    .fill("Certidão registral conferida visualmente.");
  await page
    .getByLabel(
      "Conferi visualmente o original e as páginas relevantes para esta classificação.",
    )
    .check();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page
    .getByText(`Classificação ${sourceDecisionIds[0]} registrada.`, {
      exact: false,
    })
    .waitFor();
  if (
    sourceBodies[0].supersedes_decision_id !== null ||
    sourceBodies[0].source_kind !== "registry_record"
  )
    throw new Error("First source classification payload was invalid");
  if (await page.getByRole("button", { name: "Registrar decisão" }).isEnabled())
    throw new Error("Correction did not require a new motivated original read");
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page.getByAltText("Original enviado para conferência").waitFor();
  await page
    .getByLabel("Natureza do original")
    .selectOption("third_party_report");
  await page
    .getByLabel("Motivo da classificação")
    .fill("O arquivo é um relatório derivado do fornecedor.");
  await page
    .getByLabel(
      "Conferi visualmente o original e as páginas relevantes para esta classificação.",
    )
    .check();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page
    .getByText(`Classificação ${sourceDecisionIds[1]} registrada.`, {
      exact: false,
    })
    .waitFor();
  if (
    sourceBodies[1].supersedes_decision_id !== sourceDecisionIds[0] ||
    sourceBodies[1].source_kind !== "third_party_report"
  )
    throw new Error("Source correction did not carry the previous decision");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 1)
      throw new Error(
        `Source classification overflows ${width}px by ${overflow}px`,
      );
    if (width === 320)
      await page.screenshot({
        path: "/tmp/aferisai-source-mobile.png",
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "/tmp/aferisai-source-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Análises/ }).click();
  await page
    .getByRole("button", { name: "Revisar análise", exact: true })
    .click();
  await page.getByRole("tab", { name: "Atenção" }).click();
  await page.getByRole("heading", { name: "Exigem atenção" }).waitFor();
  for (const code of [
    "analysis.work_interrupted",
    "analysis.review_version_outdated",
    "analysis.review_inconclusive",
    "analysis.automatic_exception",
    "analysis.review_expired_undecided",
  ])
    await page.getByText(code, { exact: true }).waitFor();
  await page
    .getByRole("heading", { name: "Exigem atenção" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/aferisai-attention-desktop.png" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(350);
  await page
    .getByRole("heading", { name: "Exigem atenção" })
    .scrollIntoViewIfNeeded();
  const attentionOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (attentionOverflow > 1)
    throw new Error(
      `Attention queue overflows 320px by ${attentionOverflow}px`,
    );
  await page.locator('section[aria-labelledby="attention-title"]').screenshot({
    path: "/tmp/aferisai-attention-mobile.png",
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("tab", { name: "Revisar análise" }).click();
  await page.getByRole("button", { name: "Conferir", exact: true }).click();
  await page
    .getByRole("heading", { name: "Achados para conferência" })
    .waitFor();
  await page
    .getByLabel("Motivo da leitura")
    .fill("Conferência visual da matrícula.");
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page.getByAltText("Original enviado para conferência").waitFor();
  await page.getByLabel("Aprovar pacote factual").check();
  await page.getByLabel("Natureza do original").selectOption("registry_record");
  await page.getByLabel("Cronologia exige revisão").check();
  const citation = page.locator(".review-citation").first();
  await citation.getByRole("button", { name: "Marcar no original" }).click();
  const surface = await page
    .locator(".review-page-overlay.is-marking")
    .boundingBox();
  if (!surface) throw new Error("Review surface was not visible");
  await page.mouse.move(
    surface.x + surface.width * 0.1,
    surface.y + surface.height * 0.2,
  );
  await page.mouse.down();
  await page.mouse.move(
    surface.x + surface.width * 0.8,
    surface.y + surface.height * 0.7,
    { steps: 6 },
  );
  await page.mouse.up();
  if (
    (await citation.getByLabel("Esquerda").inputValue()) !== "100" ||
    (await citation.getByLabel("Topo").inputValue()) !== "200" ||
    (await citation.getByLabel("Direita").inputValue()) !== "800" ||
    (await citation.getByLabel("Base").inputValue()) !== "700"
  )
    throw new Error("Drag did not fill normalized citation coordinates");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".review-mobile-steps").getByRole("button", { name: /Decisão/ }).click();
  await page.getByRole("heading", { name: "Decisão", exact: true }).waitFor();
  await citation.getByRole("button", { name: "Citação selecionada" }).click();
  await page.getByRole("heading", { name: "Original", exact: true }).waitFor();
  if ((await citation.getByLabel("Esquerda").inputValue()) !== "100")
    throw new Error("Mobile step switch discarded citation coordinates");
  await page.locator(".review-mobile-steps").getByRole("button", { name: /Decisão/ }).click();
  await citation
    .getByLabel("Motivo desta conferência")
    .fill("Nome localizado no original da página.");
  await page
    .getByLabel("Motivo da decisão")
    .fill("Conferi a citação e as flags no original.");
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page.getByText("Aprovação registrada.").waitFor();
  if (originalBody.reason !== "Conferência visual da matrícula.")
    throw new Error("Original access reason was not sent");
  if (
    decisionBody.outcome !== "approved" ||
    decisionBody.source_kind !== "registry_record" ||
    decisionBody.citation_reviews[0].box.join(",") !== "100,200,800,700" ||
    decisionBody.acknowledged_flags[0] !== "timeline_unresolved"
  )
    throw new Error("Review decision payload was incomplete");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 1)
      throw new Error(`Review layout overflows ${width}px by ${overflow}px`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: "/tmp/aferisai-review-mobile.png",
  });
  if (pageErrors)
    throw new Error(`Browser reported ${pageErrors} page error(s)`);
  if (consoleIssues.length)
    throw new Error(
      `Browser reported ${consoleIssues.length} console issue(s): ${consoleIssues.join(" | ")}`,
    );
  await page.setViewportSize({ width: 1440, height: 900 });
  originalMime = "application/pdf";
  await page.getByLabel("ID do trabalho").fill(workId);
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await page
    .getByRole("heading", { name: "Achados para conferência" })
    .waitFor();
  await page.getByRole("button", { name: "Abrir original auditado" }).click();
  await page.getByText("Página 1 de 2").waitFor();
  await page.getByLabel("Aprovar pacote factual").check();
  await page
    .locator(".review-citation")
    .first()
    .getByRole("button", { name: "Marcar no original" })
    .click();
  await page
    .locator(".review-page-overlay.is-marking")
    .scrollIntoViewIfNeeded();
  const pdfSurface = await page
    .locator(".review-page-overlay.is-marking")
    .boundingBox();
  if (!pdfSurface) throw new Error("PDF review surface was not visible");
  await page.mouse.move(
    pdfSurface.x + pdfSurface.width * 0.12,
    pdfSurface.y + pdfSurface.height * 0.15,
  );
  await page.mouse.down();
  await page.mouse.move(
    pdfSurface.x + pdfSurface.width * 0.45,
    pdfSurface.y + pdfSurface.height * 0.3,
    { steps: 4 },
  );
  await page.mouse.up();
  const pdfX = Number(
    await page
      .locator(".review-citation")
      .first()
      .getByLabel("Esquerda")
      .inputValue(),
  );
  if (Math.abs(pdfX - 120) > 2)
    throw new Error(
      `PDF marking did not use page-relative coordinates: ${pdfX}, surface ${pdfSurface.width}x${pdfSurface.height}`,
    );
  await page.screenshot({ path: "/tmp/aferisai-review-pdf.png" });
  await page.getByRole("button", { name: "Próxima" }).click();
  await page.getByText("Página 2 de 2").waitFor();
  await page.getByLabel("Página 2 do original").waitFor();
  if (await page.locator(".review-page-overlay.is-marking").count())
    throw new Error("Citation from page one remained markable on page two");
  if (await page.getByRole("alert").count())
    throw new Error("PDF renderer displayed an error");
  if (pageErrors)
    throw new Error(
      `Browser reported ${pageErrors} page error(s) after PDF rendering`,
    );
  if (consoleIssues.length)
    throw new Error(
      `Browser reported ${consoleIssues.length} console issue(s) after PDF rendering: ${consoleIssues.join(" | ")}`,
    );
  process.stdout.write(
    "Review UI: visual marking, decision, PDF pages and narrow layouts passed.\n",
  );
} finally {
  await browser.close();
}
