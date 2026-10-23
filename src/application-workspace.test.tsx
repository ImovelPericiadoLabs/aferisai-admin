import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApplicationWorkspace } from "./ApplicationWorkspace";

describe("abas da integração", () => {
  it("mostra ao leitor somente as áreas que ele pode consultar", () => {
    const markup = renderToStaticMarkup(
      <ApplicationWorkspace
        applications={[
          { id: "app", name: "Portal", status: "active", permissions: [] },
        ]}
        permissions={[]}
        selectedApplicationId="app"
        onSelectApplication={() => undefined}
        csrfToken=""
        canManage={false}
        canEdit={false}
        onUnauthorized={() => undefined}
        permissionBusy={false}
        onTogglePermission={() => undefined}
        additionalApplication={null}
      />,
    );
    expect(markup).toContain("Visão geral");
    expect(markup).toContain("Acessos");
    expect(markup).not.toContain("Webhooks");
    expect(markup).not.toContain("Entregas");
    expect(markup).not.toContain("Credenciais");
    expect(markup).toContain("Ver permissões");
    expect(markup).not.toContain("integration-mobile-nav");
  });
});
