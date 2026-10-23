export type HomeRole = "administrator" | "manager" | "viewer" | "financial";

/** The administrator's start page is the executive panel; it replaces the overview. */
export const homePageFor = (role: HomeRole) =>
  role === "administrator"
    ? ("executive" as const)
    : role === "financial"
      ? ("financial" as const)
      : ("overview" as const);

export const showsOverview = (role: HomeRole) => role !== "administrator";
