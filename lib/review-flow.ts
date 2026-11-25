import type { ProtocolStatus, TimelineKind } from "./domain";
import {
  ProtocolFlowError,
  assertTransition,
  handoffAfterClearance,
  type StagePointer,
} from "./protocol-flow";

export type ReviewTarget = {
  kind: "section" | "document";
  key: string;
};

export type ItemDecision = "pending" | "cleared" | "changes_requested";

export type ReviewItem = {
  target: ReviewTarget;
  decision: ItemDecision;
  comment: string;
};

export type DeskAction =
  | { type: "claim" }
  | { type: "request_corrections" }
  | { type: "advance" }
  | { type: "approve" }
  | { type: "reject"; note: string }
  | { type: "resubmit" };

export type DeskSnapshot = {
  status: ProtocolStatus;
  stageKey: string;
  sectorKey: string;
  assigneeHeld: boolean;
};

export type PlannedEvent = {
  kind: TimelineKind;
  title: string;
  detail: string;
  sectorKey: string;
};

export type PlannedMove = DeskSnapshot & { event: PlannedEvent };

export type DeskResult = { ok: true; move: PlannedMove } | { ok: false; error: string };

export function sameTarget(left: ReviewTarget, right: ReviewTarget): boolean {
  return left.kind === right.kind && left.key === right.key;
}

export function applyDeskAction(input: {
  snapshot: DeskSnapshot;
  stages: readonly StagePointer[];
  expected: readonly ReviewTarget[];
  items: readonly ReviewItem[];
  action: DeskAction;
  actorName: string;
  sectorName: string;
  nextSectorName?: string;
}): DeskResult {
  try {
    return { ok: true, move: plan(input) };
  } catch (error) {
    if (error instanceof ProtocolFlowError || error instanceof ReviewRuleError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

class ReviewRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRuleError";
  }
}

function plan(input: {
  snapshot: DeskSnapshot;
  stages: readonly StagePointer[];
  expected: readonly ReviewTarget[];
  items: readonly ReviewItem[];
  action: DeskAction;
  actorName: string;
  sectorName: string;
  nextSectorName?: string;
}): PlannedMove {
  const { snapshot, action } = input;
  switch (action.type) {
    case "claim": {
      if (snapshot.status !== "submitted" || snapshot.assigneeHeld) {
        throw new ReviewRuleError("Only an unclaimed protocol can be claimed.");
      }
      assertTransition("submitted", "in_review");
      return {
        status: "in_review",
        stageKey: snapshot.stageKey,
        sectorKey: snapshot.sectorKey,
        assigneeHeld: true,
        event: {
          kind: "claimed",
          title: "Claimed for review",
          detail: `${input.actorName} claimed this protocol at ${input.sectorName}.`,
          sectorKey: snapshot.sectorKey,
        },
      };
    }
    case "request_corrections": {
      requireInReview(snapshot);
      assertKnownItems(input.expected, input.items);
      const flagged = input.items.filter((item) => item.decision === "changes_requested");
      if (flagged.length === 0) {
        throw new ReviewRuleError(
          "Mark at least one section or document for correction.",
        );
      }
      for (const item of flagged) {
        if (item.comment.trim().length === 0) {
          throw new ReviewRuleError("Each correction needs a comment.");
        }
      }
      assertTransition("in_review", "corrections_requested");
      return {
        status: "corrections_requested",
        stageKey: snapshot.stageKey,
        sectorKey: snapshot.sectorKey,
        assigneeHeld: true,
        event: {
          kind: "correction_requested",
          title: "Corrections requested",
          detail: `${input.sectorName} sent ${flagged.length} item${flagged.length === 1 ? "" : "s"} back to the applicant.`,
          sectorKey: snapshot.sectorKey,
        },
      };
    }
    case "advance": {
      requireInReview(snapshot);
      requireCleared(input.expected, input.items);
      const handoff = handoffAfterClearance(input.stages, snapshot.stageKey);
      if (handoff.status === "approved") {
        throw new ReviewRuleError(
          "The last sector issues the protocol instead of handing it on.",
        );
      }
      return {
        status: "submitted",
        stageKey: handoff.next.key,
        sectorKey: handoff.next.sectorKey,
        assigneeHeld: false,
        event: {
          kind: "advanced",
          title: `Moved to ${input.nextSectorName ?? "the next sector"}`,
          detail: `${input.sectorName} cleared its review. The protocol is waiting at ${input.nextSectorName ?? "the next sector"}.`,
          sectorKey: handoff.next.sectorKey,
        },
      };
    }
    case "approve": {
      requireInReview(snapshot);
      requireCleared(input.expected, input.items);
      const handoff = handoffAfterClearance(input.stages, snapshot.stageKey);
      if (handoff.status !== "approved") {
        throw new ReviewRuleError("A later sector still has to review this protocol.");
      }
      return {
        status: "approved",
        stageKey: snapshot.stageKey,
        sectorKey: snapshot.sectorKey,
        assigneeHeld: true,
        event: {
          kind: "approved",
          title: "Protocol issued",
          detail: `${input.sectorName} approved the protocol and issued the decision.`,
          sectorKey: snapshot.sectorKey,
        },
      };
    }
    case "reject": {
      requireInReview(snapshot);
      if (action.note.trim().length === 0) {
        throw new ReviewRuleError("A rejection needs a note.");
      }
      assertTransition("in_review", "rejected");
      return {
        status: "rejected",
        stageKey: snapshot.stageKey,
        sectorKey: snapshot.sectorKey,
        assigneeHeld: true,
        event: {
          kind: "rejected",
          title: "Protocol rejected",
          detail: `${input.sectorName} closed the protocol. ${action.note.trim()}`,
          sectorKey: snapshot.sectorKey,
        },
      };
    }
    case "resubmit": {
      if (snapshot.status !== "corrections_requested") {
        throw new ReviewRuleError(
          "Only a protocol sent back for corrections can be resubmitted.",
        );
      }
      assertTransition("corrections_requested", "submitted");
      return {
        status: "submitted",
        stageKey: snapshot.stageKey,
        sectorKey: snapshot.sectorKey,
        assigneeHeld: false,
        event: {
          kind: "resubmitted",
          title: "Corrections returned",
          detail: `${input.actorName} sent the corrected protocol back to ${input.sectorName}.`,
          sectorKey: snapshot.sectorKey,
        },
      };
    }
  }
}

function requireInReview(snapshot: DeskSnapshot): void {
  if (snapshot.status !== "in_review" || !snapshot.assigneeHeld) {
    throw new ReviewRuleError("Claim the protocol before reviewing it.");
  }
}

function assertKnownItems(
  expected: readonly ReviewTarget[],
  items: readonly ReviewItem[],
): void {
  for (const item of items) {
    if (!expected.some((target) => sameTarget(target, item.target))) {
      throw new ReviewRuleError(
        `Unknown review target ${item.target.kind}:${item.target.key}.`,
      );
    }
  }
  const seen = new Set<string>();
  for (const item of items) {
    const id = `${item.target.kind}:${item.target.key}`;
    if (seen.has(id)) {
      throw new ReviewRuleError("Each section or document can only be reviewed once.");
    }
    seen.add(id);
  }
}

function requireCleared(
  expected: readonly ReviewTarget[],
  items: readonly ReviewItem[],
): void {
  assertKnownItems(expected, items);
  if (expected.length === 0) {
    throw new ReviewRuleError("This service has nothing to review.");
  }
  for (const target of expected) {
    const item = items.find((candidate) => sameTarget(candidate.target, target));
    if (!item || item.decision !== "cleared") {
      throw new ReviewRuleError(
        "Clear every section and document before moving the protocol on.",
      );
    }
  }
}
