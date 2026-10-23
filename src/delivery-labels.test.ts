import { describe, expect, it } from "vitest";
import { eventLabel } from "./delivery-labels";

describe("eventLabel", () => {
  it("names every event the backend can deliver", () => {
    expect(eventLabel("analysis.created")).toBe("Análise criada");
    expect(eventLabel("analysis.completed")).toBe("Análise concluída");
    expect(eventLabel("webhook.test")).toBe("Evento de teste");
    expect(eventLabel("outro")).toBe("Evento não identificado");
  });
});
