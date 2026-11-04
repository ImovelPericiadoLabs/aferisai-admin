import { describe, expect, it } from "vitest";
import {
  causeOf,
  deliveryOf,
  isMyTurn,
  journeyOf,
  turnOf,
} from "./case-journey-model";
import { kase } from "./exception-model.fixture";

const item = (
  ordinal: number,
  item_status: string | null,
  work_status: string | null = null,
  error_code: string | null = null,
) => ({
  ordinal,
  work_id: work_status ? `w${ordinal}` : null,
  work_status,
  error_code,
  item_status,
  request_id: work_status ? `r${ordinal}` : null,
});

const person = (id: string | null) => (id ? `Pessoa ${id}` : "Sem responsável");

describe("causeOf", () => {
  it("explains a known technical code in plain words and says which supplier it came from", () => {
    const cause = causeOf("acquisition.infosimples_registration_not_found");
    expect(cause.title).toBe("Matrícula não encontrada no fornecedor");
    expect(cause.supplier).toBe("InfoSimples");
    expect(cause.uncertain).toBe(false);
  });
  it("flags causes whose outcome is uncertain, which belong in Conciliação", () => {
    expect(
      causeOf("acquisition.infosimples_submission_unknown").uncertain,
    ).toBe(true);
    expect(causeOf("acquisition.onr_portal_submission_unknown").uncertain).toBe(
      true,
    );
    expect(causeOf("acquisition.infosimples_download_unknown").uncertain).toBe(
      true,
    );
  });
  it("keeps the technical code for anything it does not know", () => {
    const cause = causeOf("paid_without_delivery");
    expect(cause.title).toBe("Causa ainda sem descrição");
    expect(cause.code).toBe("paid_without_delivery");
    expect(cause.supplier).toBeNull();
  });
});

describe("deliveryOf", () => {
  it("separates delivered, waiting and problem", () => {
    expect(deliveryOf("confirmed")).toEqual({
      label: "Entregue",
      state: "delivered",
    });
    expect(deliveryOf("dispatched").state).toBe("waiting");
    expect(deliveryOf("pending").state).toBe("waiting");
    expect(deliveryOf("awaiting_input").state).toBe("waiting");
    expect(deliveryOf("unavailable").state).toBe("problem");
    expect(deliveryOf("failed").state).toBe("problem");
    expect(deliveryOf("unknown").state).toBe("problem");
  });
  it("does not invent a state for an unknown or missing value", () => {
    expect(deliveryOf(null).state).toBe("waiting");
    expect(deliveryOf("weird").label).toBe("Estado não identificado");
  });
});

describe("journeyOf: a purchase of three documents, one delivered", () => {
  const c = kase({
    amount_cents: 4500,
    funding_source: "pix",
    affected_items: [
      item(1, "confirmed", "completed"),
      item(
        2,
        "unavailable",
        null,
        "acquisition.onr_portal_document_unavailable",
      ),
      item(3, "unavailable"),
    ],
  });
  const journey = journeyOf(c);

  it("counts what was delivered, what is pending and what has a problem", () => {
    expect(journey.kind).toBe("registry");
    expect(journey.total).toBe(3);
    expect(journey.delivered).toBe(1);
    expect(journey.waiting).toBe(0);
    expect(journey.problems).toBe(2);
  });

  it("counts analyses separately from deliveries", () => {
    expect(journey.analysesDone).toBe(1);
    expect(journey.analysesNotCreated).toBe(2);
  });

  it("states the situation in one sentence", () => {
    expect(journey.headline).toBe(
      "Compra de 3 documentos: 1 entregue, 2 com problema.",
    );
  });

  it("lists every document with its delivery and its analysis", () => {
    expect(
      journey.documents.map((d) => [
        d.ordinal,
        d.delivery.label,
        d.analysis.label,
      ]),
    ).toEqual([
      [1, "Entregue", "Análise concluída"],
      [2, "Indisponível", "Análise ainda não criada"],
      [3, "Indisponível", "Análise ainda não criada"],
    ]);
    expect(journey.documents[1].errorCode).toBe(
      "acquisition.onr_portal_document_unavailable",
    );
    expect(journey.documents[0].workId).toBe("w1");
    expect(journey.documents[0].requestId).toBe("r1");
  });

  it("tracks the stages: payment done, documents blocked, analyses waiting", () => {
    expect(journey.stages.map((s) => [s.id, s.state])).toEqual([
      ["payment", "done"],
      ["documents", "problem"],
      ["analysis", "pending"],
    ]);
    expect(journey.stages[0].detail).toBe("PIX · R$ 45,00");
    expect(journey.stages[1].detail).toBe("1 de 3 entregues");
    expect(journey.stages[2].detail).toBe("1 de 3 concluídas");
  });
});

describe("journeyOf: other shapes", () => {
  it("says everything was delivered when every document is", () => {
    const j = journeyOf(
      kase({
        affected_items: [
          item(1, "confirmed", "completed"),
          item(2, "confirmed", "running"),
        ],
      }),
    );
    expect(j.headline).toBe("Compra de 2 documentos: todos entregues.");
    expect(j.stages.map((s) => s.state)).toEqual(["done", "done", "current"]);
  });
  it("uses the singular for one document", () => {
    expect(
      journeyOf(kase({ affected_items: [item(1, "dispatched")] })).headline,
    ).toBe("Compra de 1 documento: 1 aguardando o fornecedor.");
  });
  it("treats a case with no listed items as a file sent by the customer", () => {
    const j = journeyOf(kase({ affected_items: [] }));
    expect(j.kind).toBe("upload");
    expect(j.total).toBe(1);
    expect(j.headline).toBe("Arquivo enviado pelo cliente.");
    expect(j.documents[0].delivery.label).toBe("Arquivo enviado pelo cliente");
    expect(j.stages.map((s) => s.id)).toEqual(["payment"]);
  });
  it("names credits as the way of payment", () => {
    expect(
      journeyOf(kase({ funding_source: "credits", amount_cents: 1000 }))
        .stages[0].detail,
    ).toBe("Créditos · R$ 10,00");
  });
});

describe("turnOf: who has to act now", () => {
  it("asks the manager first, and says when nobody took the case", () => {
    const turn = turnOf(kase(), person);
    expect(turn.role).toBe("Gestor");
    expect(turn.person).toBeNull();
    expect(turn.what).toBe(
      "Assumir o caso e propor: corrigir a entrega ou reembolsar.",
    );
  });
  it("names the manager who took it", () => {
    const turn = turnOf(kase({ manager_assignee_id: "m1" }), person);
    expect(turn.person).toBe("Pessoa m1");
    expect(turn.what).toBe("Propor: corrigir a entrega ou reembolsar.");
  });
  it("then asks the financial team to confirm the proposal", () => {
    const turn = turnOf(
      kase({
        latest_proposal_id: "p1",
        proposed_resolution: "refund",
        manager_assignee_id: "m1",
      }),
      person,
    );
    expect(turn.role).toBe("Financeiro");
    expect(turn.what).toBe(
      "Confirmar a decisão financeira. Proposta do gestor: Reembolsar.",
    );
  });
  it("then asks the financial owner to execute", () => {
    const base = {
      latest_proposal_id: "p1",
      proposed_resolution: "refund" as const,
      financial_decision_id: "d1",
      resolution: "refund" as const,
      financial_assignee_id: "f1",
      funding_source: "pix" as const,
    };
    expect(turnOf(kase(base), person).what).toBe(
      "Iniciar o estorno integral no Asaas.",
    );
    expect(
      turnOf(kase({ ...base, funding_source: "credits" }), person).what,
    ).toBe("Devolver os créditos ao cliente.");
    expect(
      turnOf(kase({ ...base, execution_status: "attempted" }), person).what,
    ).toBe("Conciliar o estorno com o Asaas.");
  });
  it("for a correction, asks to recover what is missing, then to verify", () => {
    const base = {
      latest_proposal_id: "p1",
      proposed_resolution: "correct" as const,
      financial_decision_id: "d1",
      resolution: "correct" as const,
      financial_assignee_id: "f1",
    };
    expect(
      turnOf(
        kase({
          ...base,
          affected_items: [item(1, "confirmed"), item(2, "unavailable")],
        }),
        person,
      ).what,
    ).toBe("Recuperar 1 documento pendente junto ao fornecedor.");
    expect(
      turnOf(
        kase({
          ...base,
          affected_items: [item(1, "confirmed"), item(2, "dispatched")],
        }),
        person,
      ).what,
    ).toBe("Aguardar o fornecedor entregar 1 documento.");
    expect(
      turnOf(
        kase({
          ...base,
          affected_items: [item(1, "confirmed"), item(2, "confirmed")],
        }),
        person,
      ).what,
    ).toBe("Verificar a entrega corrigida.");
  });
  it("has nobody to wait for once it is done", () => {
    const turn = turnOf(
      kase({
        latest_proposal_id: "p1",
        proposed_resolution: "refund",
        financial_decision_id: "d1",
        resolution: "refund",
        execution_status: "done",
        funding_source: "pix",
      }),
      person,
    );
    expect(turn.done).toBe(true);
    expect(turn.role).toBeNull();
    expect(turn.what).toBe("Nada a fazer: caso concluído (Reembolsar).");
  });
});

describe("isMyTurn", () => {
  const proposed = kase({
    manager_assignee_id: "me",
    latest_proposal_id: "p1",
    proposed_resolution: "refund",
  });
  it("is the manager's turn until a proposal exists, and only for a manager or administrator", () => {
    const open = kase({ manager_assignee_id: "me" });
    expect(isMyTurn(open, "manager", "me")).toBe(true);
    expect(isMyTurn(open, "administrator", "me")).toBe(true);
    expect(isMyTurn(open, "financial", "me")).toBe(false);
    expect(isMyTurn(open, "viewer", "me")).toBe(false);
  });
  it("is not the manager's turn once the proposal is in, even for the one who made it", () => {
    expect(isMyTurn(proposed, "manager", "me")).toBe(false);
  });
  it("is the financial team's turn after the proposal", () => {
    expect(isMyTurn(proposed, "financial", "f1")).toBe(true);
    expect(
      isMyTurn({ ...proposed, financial_assignee_id: "f1" }, "financial", "f1"),
    ).toBe(true);
    expect(
      isMyTurn({ ...proposed, financial_assignee_id: "f2" }, "financial", "f1"),
    ).toBe(false);
  });
  it("is nobody's turn when it is done", () => {
    const done = kase({
      latest_proposal_id: "p1",
      proposed_resolution: "refund",
      financial_decision_id: "d1",
      resolution: "refund",
      execution_status: "done",
      financial_assignee_id: "f1",
    });
    expect(isMyTurn(done, "financial", "f1")).toBe(false);
  });
});
