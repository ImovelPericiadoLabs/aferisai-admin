import { chromium } from "playwright-core";

const origin = process.env.E2E_PANEL_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
});
const caseId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60b1";
const workId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60b2";
const proposalId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60b3";
const decisionId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60b4";
let role = "manager";
let proposal = null;
let confirmed = false;
let managerAssigned = false;
let financialAssigned = false;
let executionStatus = null;
let refundAttempts = 0;
const context = await browser.newContext();
const page = await context.newPage();
let pageErrors = 0;
page.on("pageerror", () => { pageErrors += 1; });
await page.route("**/v1/team/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  const send = (body, status = 200) => route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  if (path === "/v1/team/sessions/current/csrf") return send({ csrf_token: "synthetic-csrf" });
  if (path === "/v1/team/sessions/current") return send({
    id: role === "financial" ? decisionId : proposalId,
    email: `${role}@example.test`,
    role,
  });
  if (path === "/v1/team/payment-exceptions" && request.method() === "GET") {
    return send({
      items: [{
        id: caseId,
        work_id: workId,
        opened_at: "2026-10-19T12:00:00Z",
        due_at: "2026-10-21T12:00:00Z",
        reason_code: "registry_identifier_missing",
        amount_cents: 6386,
        latest_proposal_id: proposal ? proposalId : null,
        proposed_resolution: proposal?.resolution || null,
        proposal_reason: proposal?.reason || null,
        proposal_actor_id: proposal ? proposalId : null,
        proposal_at: proposal ? "2026-10-19T12:10:00Z" : null,
        resolution: confirmed ? "refund" : null,
        financial_decision_id: confirmed ? decisionId : null,
        manager_assignee_id: managerAssigned ? proposalId : null,
        financial_assignee_id: financialAssigned ? decisionId : null,
        execution_status: executionStatus,
      }],
      next_cursor: null,
    });
  }
  if (path === `/v1/team/payment-exceptions/${caseId}/claims`) {
    if (role === "financial") financialAssigned = true;
    else managerAssigned = true;
    return send({ member_id: role === "financial" ? decisionId : proposalId });
  }
  if (path === `/v1/team/payment-exceptions/${caseId}/proposals`) {
    if (role !== "manager") throw new Error("Financial role attempted manager proposal");
    proposal = request.postDataJSON();
    return send({ id: proposalId });
  }
  if (path === `/v1/team/payment-exceptions/${caseId}/confirmations`) {
    if (role !== "financial") throw new Error("Manager attempted financial confirmation");
    const body = request.postDataJSON();
    if (body.proposal_id !== proposalId) throw new Error("Confirmation used another proposal");
    confirmed = true;
    return send({ id: decisionId });
  }
  if (path === `/v1/team/payment-exceptions/${caseId}/refund-attempts`) {
    if (role !== "financial" || !confirmed) throw new Error("Refund without confirmed financial role");
    refundAttempts += 1;
    executionStatus = "pending";
    return send({ id: decisionId, status: executionStatus });
  }
  if (path === `/v1/team/payment-exceptions/${caseId}/refund-reconciliations`) {
    executionStatus = "done";
    return send({ id: decisionId, status: executionStatus });
  }
  return send({ code: "request.not_found", detail: "Unexpected route" }, 404);
});

try {
  await page.goto(`${origin}/#financial`);
  await page.getByRole("heading", { name: "Exceções financeiras" }).waitFor();
  await page.getByRole("button", { name: new RegExp(`Caso ${caseId}`) }).click();
  await page.getByRole("button", { name: "Assumir este caso" }).click();
  await page.getByText("Caso atribuído à sua conta.").waitFor();
  await page.getByLabel("Encaminhamento").selectOption("refund");
  await page.getByLabel("Motivo da decisão").fill("Matrícula não identificada no original");
  await page.getByRole("button", { name: "Registrar proposta" }).click();
  await page.getByText("Proposta do gestor registrada.", { exact: false }).waitFor();
  if (proposal?.resolution !== "refund") throw new Error("Manager proposal was not recorded");

  role = "financial";
  await page.reload();
  await page.getByRole("heading", { name: "Exceções financeiras" }).waitFor();
  if (await page.getByRole("button", { name: /Análises/ }).count())
    throw new Error("Financial role can navigate to legal review");
  await page.getByRole("button", { name: new RegExp(`Caso ${caseId}`) }).click();
  await page.getByRole("button", { name: "Assumir este caso" }).click();
  await page.getByText("Caso atribuído à sua conta.").waitFor();
  await page.getByText("Proposta vigente: Reembolsar").waitFor();
  await page.getByLabel("Motivo da decisão").fill("Confiro a decisão antes do estorno");
  await page.getByRole("button", { name: "Confirmar decisão financeira" }).click();
  await page.getByText("Decisão financeira registrada.", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Iniciar estorno integral no Asaas sandbox" }).click();
  await page.getByRole("button", { name: "Conciliar estorno por GET" }).click();
  await page.getByText("Execução: done.").waitFor();
  if (!confirmed || refundAttempts !== 1 || pageErrors) throw new Error("Financial execution or browser rendering failed");
  process.stdout.write("Financial UI: decisions, one refund attempt and reconciliation passed.\n");
} finally {
  await browser.close();
}
