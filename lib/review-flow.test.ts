import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDeskAction,
  type DeskSnapshot,
  type ReviewItem,
  type ReviewTarget,
} from "./review-flow";
import type { StagePointer } from "./protocol-flow";

const stages: StagePointer[] = [
  { key: "environment-screen", sectorKey: "environment", order: 1 },
  { key: "works-review", sectorKey: "public-works", order: 2 },
];

const targets: ReviewTarget[] = [
  { kind: "section", key: "proposal" },
  { kind: "document", key: "survey" },
];

const waiting: DeskSnapshot = {
  status: "submitted",
  stageKey: "environment-screen",
  sectorKey: "environment",
  assigneeHeld: false,
};

const reviewing: DeskSnapshot = {
  ...waiting,
  status: "in_review",
  assigneeHeld: true,
};

function cleared(): ReviewItem[] {
  return targets.map((target) => ({ target, decision: "cleared", comment: "" }));
}

describe("analyst desk actions", () => {
  it("claims an unclaimed protocol and refuses a second claim", () => {
    const claimed = applyDeskAction({
      snapshot: waiting,
      stages,
      expected: targets,
      items: [],
      action: { type: "claim" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
    });
    assert.equal(claimed.ok, true);
    if (claimed.ok) {
      assert.equal(claimed.move.status, "in_review");
      assert.equal(claimed.move.assigneeHeld, true);
      assert.equal(claimed.move.event.kind, "claimed");
    }

    const again = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: [],
      action: { type: "claim" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
    });
    assert.equal(again.ok, false);
  });

  it("sends the file back only when a correction has a comment", () => {
    const missing = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: [{ target: targets[0]!, decision: "changes_requested", comment: "   " }],
      action: { type: "request_corrections" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
    });
    assert.equal(missing.ok, false);

    const sent = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: [
        {
          target: targets[0]!,
          decision: "changes_requested",
          comment: "The floor area does not match the survey.",
        },
      ],
      action: { type: "request_corrections" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
    });
    assert.equal(sent.ok, true);
    if (sent.ok) {
      assert.equal(sent.move.status, "corrections_requested");
      assert.equal(sent.move.stageKey, "environment-screen");
      assert.equal(sent.move.assigneeHeld, true);
    }
  });

  it("refuses to advance while a section is still open", () => {
    const blocked = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: [
        { target: targets[0]!, decision: "cleared", comment: "" },
        { target: targets[1]!, decision: "pending", comment: "" },
      ],
      action: { type: "advance" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
      nextSectorName: "Public Works",
    });
    assert.equal(blocked.ok, false);
  });

  it("hands a cleared stage to the next sector and leaves it unclaimed", () => {
    const moved = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: cleared(),
      action: { type: "advance" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
      nextSectorName: "Public Works",
    });
    assert.equal(moved.ok, true);
    if (moved.ok) {
      assert.equal(moved.move.status, "submitted");
      assert.equal(moved.move.sectorKey, "public-works");
      assert.equal(moved.move.stageKey, "works-review");
      assert.equal(moved.move.assigneeHeld, false);
      assert.equal(moved.move.event.kind, "advanced");
    }
  });

  it("issues the protocol only on the last cleared stage", () => {
    const tooSoon = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: cleared(),
      action: { type: "approve" },
      actorName: "Helena Duarte",
      sectorName: "Environment",
    });
    assert.equal(tooSoon.ok, false);

    const last: DeskSnapshot = {
      status: "in_review",
      stageKey: "works-review",
      sectorKey: "public-works",
      assigneeHeld: true,
    };
    const issued = applyDeskAction({
      snapshot: last,
      stages,
      expected: targets,
      items: cleared(),
      action: { type: "approve" },
      actorName: "Caio Mendes",
      sectorName: "Public Works",
    });
    assert.equal(issued.ok, true);
    if (issued.ok) {
      assert.equal(issued.move.status, "approved");
      assert.equal(issued.move.event.title, "Protocol issued");
      assert.equal(issued.move.assigneeHeld, true);
    }
  });

  it("returns a corrected protocol to the same desk without an assignee", () => {
    const returned = applyDeskAction({
      snapshot: {
        status: "corrections_requested",
        stageKey: "environment-screen",
        sectorKey: "environment",
        assigneeHeld: true,
      },
      stages,
      expected: targets,
      items: [],
      action: { type: "resubmit" },
      actorName: "Marina Costa",
      sectorName: "Environment",
    });
    assert.equal(returned.ok, true);
    if (returned.ok) {
      assert.equal(returned.move.status, "submitted");
      assert.equal(returned.move.stageKey, "environment-screen");
      assert.equal(returned.move.assigneeHeld, false);
      assert.equal(returned.move.event.kind, "resubmitted");
    }
  });

  it("rejects a claimed protocol when a note is present", () => {
    const rejected = applyDeskAction({
      snapshot: reviewing,
      stages,
      expected: targets,
      items: [],
      action: { type: "reject", note: "The parcel is outside the review area." },
      actorName: "Helena Duarte",
      sectorName: "Environment",
    });
    assert.equal(rejected.ok, true);
    if (rejected.ok) {
      assert.equal(rejected.move.status, "rejected");
      assert.match(rejected.move.event.detail, /outside the review area/);
    }
  });
});
