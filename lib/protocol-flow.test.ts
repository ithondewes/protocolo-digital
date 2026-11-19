import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ProtocolFlowError,
  canTransition,
  handoffAfterClearance,
  replayProtocol,
  type StagePointer,
} from "./protocol-flow";

const route: StagePointer[] = [
  { key: "environment-screen", sectorKey: "meio-ambiente", order: 1 },
  { key: "works-review", sectorKey: "obras", order: 2 },
  { key: "revenue-note", sectorKey: "tributos", order: 3 },
];

describe("status transitions", () => {
  it("allows the documented edges and blocks terminal moves", () => {
    assert.equal(canTransition("draft", "submitted"), true);
    assert.equal(canTransition("submitted", "in_review"), true);
    assert.equal(canTransition("in_review", "corrections_requested"), true);
    assert.equal(canTransition("corrections_requested", "submitted"), true);
    assert.equal(canTransition("in_review", "rejected"), true);
    assert.equal(canTransition("approved", "submitted"), false);
    assert.equal(canTransition("rejected", "in_review"), false);
    assert.equal(canTransition("draft", "approved"), false);
  });
});

describe("sector handoff", () => {
  it("sends a cleared stage to the next sector as waiting to be claimed", () => {
    const handoff = handoffAfterClearance(route, "environment-screen");
    assert.equal(handoff.status, "submitted");
    if (handoff.status === "submitted") {
      assert.equal(handoff.next.key, "works-review");
      assert.equal(handoff.next.sectorKey, "obras");
    }
  });

  it("approves only when the current stage is the last one", () => {
    const handoff = handoffAfterClearance(route, "revenue-note");
    assert.deepEqual(handoff, { status: "approved" });
  });
});

describe("timeline replay", () => {
  it("walks a file across three sectors and approves it at the end", () => {
    const state = replayProtocol(
      [
        { kind: "filed" },
        { kind: "claimed" },
        { kind: "advanced" },
        { kind: "claimed" },
        { kind: "advanced" },
        { kind: "claimed" },
        { kind: "approved" },
      ],
      route,
    );
    assert.deepEqual(state, { status: "approved", stageKey: "revenue-note" });
  });

  it("keeps a correction loop on the same stage", () => {
    const state = replayProtocol(
      [
        { kind: "filed" },
        { kind: "claimed" },
        { kind: "correction_requested" },
        { kind: "resubmitted" },
        { kind: "claimed" },
      ],
      [{ key: "review", sectorKey: "meio-ambiente", order: 1 }],
    );
    assert.deepEqual(state, { status: "in_review", stageKey: "review" });
  });

  it("refuses to approve before the later sectors have seen the file", () => {
    assert.throws(
      () =>
        replayProtocol(
          [{ kind: "filed" }, { kind: "claimed" }, { kind: "approved" }],
          route,
        ),
      ProtocolFlowError,
    );
  });

  it("ignores internal events when replaying the public story", () => {
    const state = replayProtocol(
      [{ kind: "filed" }, { kind: "claimed", visibility: "internal" }],
      [{ key: "review", sectorKey: "tributos", order: 1 }],
    );
    assert.deepEqual(state, { status: "submitted", stageKey: "review" });
  });
});
