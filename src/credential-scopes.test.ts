import { describe, expect, it } from "vitest";
import { allScopesSelected, toggleAllScopes } from "./credential-scopes";

describe("credential scope selection", () => {
  it("selects every available scope in one action", () => {
    expect(toggleAllScopes(["application:read", "analysis:read"], [])).toEqual([
      "application:read",
      "analysis:read",
    ]);
  });

  it("clears only available scopes when all are selected", () => {
    expect(
      toggleAllScopes(
        ["application:read", "analysis:read"],
        ["application:read", "analysis:read", "stale:scope"],
      ),
    ).toEqual(["stale:scope"]);
    expect(allScopesSelected(["application:read"], ["application:read"])).toBe(
      true,
    );
  });
});
