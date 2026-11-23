import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FormSchema } from "./domain";
import { nextProtocolCode, openingSubmission } from "./filing";
import { parseAnswers } from "./form-schema";
import type { StagePointer } from "./protocol-flow";

const route: StagePointer[] = [
  { key: "environment-screen", sectorKey: "environment", order: 1 },
  { key: "works-review", sectorKey: "public-works", order: 2 },
  { key: "revenue-note", sectorKey: "taxes", order: 3 },
];

const treeCare: FormSchema = {
  sections: [
    {
      key: "place",
      title: "Place",
      fields: [
        { key: "nearbyStreet", label: "Nearby street", kind: "text", required: true },
        { key: "landmark", label: "Landmark", kind: "text", required: false },
      ],
    },
    {
      key: "care",
      title: "Care",
      fields: [
        {
          key: "action",
          label: "Action",
          kind: "select",
          required: true,
          options: ["Prune", "Inspect only"],
        },
        { key: "seats", label: "Seats", kind: "number", required: false },
        { key: "startsOn", label: "Starts on", kind: "date", required: true },
        { key: "cooksOnSite", label: "Cooks on site", kind: "boolean", required: true },
      ],
    },
  ],
};

describe("protocol numbers", () => {
  it("continues the highest number for that year and ignores other years", () => {
    const code = nextProtocolCode(
      ["VC-2026-1118", "vc-2025-9999", "VC-2026-1077", "not-a-code"],
      2026,
    );
    assert.equal(code, "VC-2026-1119");
  });

  it("starts at 0001 when the year has no protocols yet", () => {
    assert.equal(nextProtocolCode([], 2026), "VC-2026-0001");
  });

  it("stops when the four-digit sequence is exhausted", () => {
    assert.throws(() => nextProtocolCode(["VC-2026-9999"], 2026), /No protocol numbers/);
  });
});

describe("opening submission", () => {
  it("files onto the first sector and records a public filed event", () => {
    const at = new Date("2026-11-23T15:00:00.000Z");
    const filed = openingSubmission({
      stages: route,
      applicantName: "Marina Costa",
      serviceName: "Building file",
      at,
    });

    assert.equal(filed.status, "submitted");
    assert.equal(filed.currentStageKey, "environment-screen");
    assert.equal(filed.currentSectorKey, "environment");
    assert.equal(filed.event.kind, "filed");
    assert.equal(filed.event.visibility, "public");
    assert.equal(filed.event.sectorKey, "environment");
    assert.match(filed.event.detail, /Marina Costa filed Building file/);
  });

  it("refuses a workflow with no stages", () => {
    assert.throws(
      () =>
        openingSubmission({
          stages: [],
          applicantName: "Marina Costa",
          serviceName: "Building file",
          at: new Date("2026-11-23T15:00:00.000Z"),
        }),
      /at least one stage/,
    );
  });
});

describe("answer parsing", () => {
  it("accepts form-control strings and drops empty optional fields", () => {
    const parsed = parseAnswers(treeCare, {
      place: { nearbyStreet: "  Rua dos Exemplos, 40  ", landmark: "  " },
      care: {
        action: "Prune",
        seats: "",
        startsOn: "2026-12-01",
        cooksOnSite: "false",
      },
      extra: { ignored: "no" },
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.answers, {
        place: { nearbyStreet: "Rua dos Exemplos, 40" },
        care: {
          action: "Prune",
          startsOn: "2026-12-01",
          cooksOnSite: false,
        },
      });
    }
  });

  it("reports a missing required answer and a number that is not numeric", () => {
    const parsed = parseAnswers(treeCare, {
      place: { nearbyStreet: "" },
      care: {
        action: "Demolish",
        seats: "many",
        startsOn: "tomorrow",
        cooksOnSite: false,
      },
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      const paths = parsed.issues.map((issue) => issue.path);
      assert.ok(paths.includes("place.nearbyStreet"));
      assert.ok(paths.includes("care.action"));
      assert.ok(paths.includes("care.seats"));
      assert.ok(paths.includes("care.startsOn"));
    }
  });
});
