import { describe, expect, it } from "vitest";
import type { DashboardMetrics, TeamMember } from "./api";
import { groupsForRole } from "./dashboard-model";

const allGroups: DashboardMetrics = {
  analyses: { queued: 1, running: 2, completed: 3, error: 4 },
  registry_requests: { pending: 1, dispatched: 2, confirmed: 3, error: 4 },
  payments: { prepared: 1, received: 2, review: 3 },
  commissions: { provisional: 1, owed: 2, settled: 3 },
};

describe("dashboard visual projection", () => {
  it.each<[TeamMember["role"], string[]]>([
    ["viewer", ["analyses"]],
    ["manager", ["analyses", "registry_requests"]],
    ["financial", ["payments", "commissions"]],
    [
      "administrator",
      ["analyses", "registry_requests", "payments", "commissions"],
    ],
  ])(
    "hides groups not approved for %s even if a stale response contains them",
    (role, expected) => {
      expect(groupsForRole(allGroups, role).map((group) => group.key)).toEqual(
        expected,
      );
    },
  );

  it("accepts omitted groups from the role-scoped endpoint", () => {
    expect(
      groupsForRole({ analyses: allGroups.analyses }, "viewer"),
    ).toHaveLength(1);
    expect(groupsForRole({}, "manager")).toEqual([]);
  });
});
