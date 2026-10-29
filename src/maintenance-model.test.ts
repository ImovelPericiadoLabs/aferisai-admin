import { describe, expect, it } from "vitest";
import {
  describeWindow,
  draftChanges,
  isoValue,
  localValue,
  maintenanceState,
  presetEnd,
  windowProblem,
  type MaintenanceDraft,
} from "./maintenance-model";

const now = new Date("2026-10-29T15:00:00Z").getTime();
const policy = (over: object = {}) => ({
  enabled: true,
  starts_at: null as string | null,
  ends_at: null as string | null,
  ...over,
});

describe("maintenanceState", () => {
  it("is off when the switch is off, whatever the dates say", () => {
    expect(
      maintenanceState(
        policy({ enabled: false, starts_at: "2026-10-29T10:00:00Z" }),
        now,
      ),
    ).toBe("off");
  });
  it("is active with no dates, or inside the window", () => {
    expect(maintenanceState(policy(), now)).toBe("active");
    expect(
      maintenanceState(
        policy({
          starts_at: "2026-10-29T14:00:00Z",
          ends_at: "2026-10-29T16:00:00Z",
        }),
        now,
      ),
    ).toBe("active");
  });
  it("is scheduled before the start", () => {
    expect(
      maintenanceState(policy({ starts_at: "2026-10-29T16:00:00Z" }), now),
    ).toBe("scheduled");
  });
  it("is ended once the end has passed, and the end instant itself is over", () => {
    expect(
      maintenanceState(policy({ ends_at: "2026-10-29T15:00:00Z" }), now),
    ).toBe("ended");
    expect(
      maintenanceState(policy({ ends_at: "2026-10-29T14:59:00Z" }), now),
    ).toBe("ended");
  });
  it("accepts no policy yet", () => {
    expect(maintenanceState(null, now)).toBe("off");
  });
});

describe("local date helpers", () => {
  it("round-trips an instant through the datetime-local format", () => {
    const iso = "2026-10-29T15:30:00.000Z";
    expect(localValue(iso)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(isoValue(localValue(iso))).toBe(iso);
  });
  it("maps empty to null both ways", () => {
    expect(localValue(null)).toBe("");
    expect(isoValue("")).toBeNull();
  });
});

describe("windowProblem", () => {
  it("accepts an empty or open-ended window", () => {
    expect(windowProblem("", "", now)).toBe("");
    expect(windowProblem("2026-10-30T10:00", "", now)).toBe("");
  });
  it("rejects an end that is not after the start", () => {
    expect(windowProblem("2026-10-30T10:00", "2026-10-30T10:00", now)).toMatch(
      /depois do início/,
    );
    expect(windowProblem("2026-10-30T10:00", "2026-10-30T09:00", now)).toMatch(
      /depois do início/,
    );
  });
  it("rejects an end already in the past when there is no start", () => {
    const past = localValue(new Date(now - 3600_000).toISOString());
    expect(windowProblem("", past, now)).toMatch(/já passou/);
  });
});

describe("presetEnd", () => {
  it("counts from the start when there is one, otherwise from now", () => {
    const start = localValue("2026-10-30T10:00:00.000Z");
    expect(isoValue(presetEnd(start, 120, now))).toBe(
      "2026-10-30T12:00:00.000Z",
    );
    expect(isoValue(presetEnd("", 60, now))).toBe("2026-10-29T16:00:00.000Z");
  });
});

describe("describeWindow", () => {
  const fmt = (iso: string) => `<${iso}>`;
  it("says it in plain words for each combination", () => {
    expect(describeWindow(null, null, fmt)).toBe(
      "Vale a partir de agora e até alguém desligar.",
    );
    expect(describeWindow("a", null, fmt)).toBe(
      "Começa em <a> e dura até alguém desligar.",
    );
    expect(describeWindow(null, "b", fmt)).toBe(
      "Vale a partir de agora até <b>.",
    );
    expect(describeWindow("a", "b", fmt)).toBe("Das <a> até <b>.");
  });
});

describe("draftChanges", () => {
  const saved = {
    enabled: false,
    starts_at: null,
    ends_at: null,
    public_message: null,
    internal_note: null,
  };
  const draft: MaintenanceDraft = {
    enabled: false,
    startsAt: "",
    endsAt: "",
    publicMessage: "",
    note: "",
  };
  it("is empty when nothing changed", () => {
    expect(draftChanges(saved, draft)).toEqual([]);
  });
  it("names each field that changed", () => {
    const out = draftChanges(saved, {
      ...draft,
      enabled: true,
      publicMessage: "Voltamos já",
    });
    expect(out.map((c) => c.field)).toEqual(["enabled", "public_message"]);
  });
  it("treats blank text as no message, like the save does", () => {
    expect(draftChanges(saved, { ...draft, publicMessage: "   " })).toEqual([]);
  });
});

describe("draftChanges and the backend's date format", () => {
  it("does not flag a date the user did not touch (seconds, offsets)", () => {
    const saved = {
      enabled: true,
      starts_at: "2026-10-29T15:30:12.345+00:00",
      ends_at: null,
      public_message: null,
      internal_note: null,
    };
    const draft = {
      enabled: true,
      startsAt: localValue("2026-10-29T15:30:12.345+00:00"),
      endsAt: "",
      publicMessage: "",
      note: "",
    };
    expect(draftChanges(saved, draft)).toEqual([]);
  });
});
