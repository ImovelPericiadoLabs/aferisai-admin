import { describe, expect, it } from "vitest";
import { homePageFor, showsOverview } from "./home-page";

describe("home page", () => {
  it("sends the administrator to the executive panel", () => {
    expect(homePageFor("administrator")).toBe("executive");
  });

  it.each(["manager", "viewer"] as const)(
    "keeps the overview for %s",
    (role) => {
      expect(homePageFor(role)).toBe("overview");
    },
  );

  it("sends the financial role to its exceptions queue", () => {
    expect(homePageFor("financial")).toBe("financial");
  });

  it("hides the overview entry only where the executive panel replaces it", () => {
    expect(showsOverview("administrator")).toBe(false);
    expect(showsOverview("manager")).toBe(true);
    expect(showsOverview("financial")).toBe(true);
  });
});
