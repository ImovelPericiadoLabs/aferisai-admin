import { describe, expect, it } from "vitest";
import {
  analysisWorkStatusLabel,
  decisionLabel,
  itemLabel,
  registryStatusLabel,
  scopeLabel,
  teamRoleLabel,
} from "./display-labels";

describe("rótulos do painel", () => {
  it("traduz papel e permissões sem mostrar códigos ao usuário", () => {
    expect(teamRoleLabel("viewer")).toBe("Consulta");
    expect(scopeLabel("analysis:submit:upload")).toBe(
      "Enviar matrícula para análise",
    );
    expect(scopeLabel("future:permission")).toBe("Permissão não identificada");
  });

  it("usa o contexto do módulo para estados iguais", () => {
    expect(analysisWorkStatusLabel("pending")).toBe("Na fila");
    expect(registryStatusLabel("pending")).toBe("Aguardando cotação ou envio");
    expect(decisionLabel("purchase_suspected")).toBe("Compra sob suspeita");
    expect(itemLabel("registry_completed")).toBe("Matrícula entregue");
    expect(itemLabel("*")).toBe("Todos os itens");
  });
});
