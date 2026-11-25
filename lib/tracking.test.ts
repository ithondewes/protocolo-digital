import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeRoute } from "./tracking";

const stages = [
  { key: "environment-screen", sectorName: "Environment" },
  { key: "works-review", sectorName: "Public Works" },
  { key: "tax-note", sectorName: "Taxes" },
];

describe("public route status", () => {
  it("marks earlier sectors cleared and later sectors not started", () => {
    const route = describeRoute({
      status: "in_review",
      currentStageKey: "works-review",
      stages,
    });
    assert.deepEqual(
      route.map((stage) => stage.label),
      ["Cleared", "In review", "Not started"],
    );
  });

  it("shows corrections on the current sector only", () => {
    const route = describeRoute({
      status: "corrections_requested",
      currentStageKey: "environment-screen",
      stages,
    });
    assert.equal(route[0]?.label, "Corrections requested");
    assert.equal(route[1]?.label, "Not started");
  });

  it("issues only the last sector when the protocol is approved", () => {
    const route = describeRoute({
      status: "approved",
      currentStageKey: "tax-note",
      stages,
    });
    assert.deepEqual(
      route.map((stage) => stage.progress),
      ["cleared", "cleared", "issued"],
    );
  });

  it("keeps a draft off the public route", () => {
    const route = describeRoute({
      status: "draft",
      currentStageKey: "environment-screen",
      stages,
    });
    assert.equal(route[0]?.progress, "not_filed");
    assert.equal(route[2]?.progress, "not_started");
  });
});
