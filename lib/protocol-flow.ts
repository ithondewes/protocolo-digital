import { PROTOCOL_STATUSES, type ProtocolStatus, type TimelineKind } from "./domain";

/**
 * Protocol status and sector routing.
 *
 * Statuses
 * --------
 * draft                  The applicant is still filling the service's form.
 * submitted              Waiting for an analyst at the current sector to claim it.
 *                        Also used after a correction comes back, and after a
 *                        sector hands the file to the next sector.
 * in_review              An analyst at the current sector has claimed the file.
 * corrections_requested  The current sector sent the file back to the applicant.
 * approved               The last sector cleared the file. Terminal.
 * rejected               A sector closed the file. Terminal.
 *
 * Allowed transitions
 * -------------------
 * draft                  → submitted
 * submitted              → in_review
 * in_review              → corrections_requested
 * in_review              → submitted     handoff to the next sector only
 * in_review              → approved      last sector only
 * in_review              → rejected
 * corrections_requested  → submitted
 * approved               → none
 * rejected               → none
 *
 * Routing is not its own status. `handoffAfterClearance` is the rule for a
 * cleared stage: move the protocol back to `submitted` at the next sector, or
 * finish it as `approved` when the workflow has no further stage. Callers must
 * not approve a file while a later sector is still on the route.
 */
export class ProtocolFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolFlowError";
  }
}

export const STATUS_TRANSITIONS: Record<ProtocolStatus, readonly ProtocolStatus[]> = {
  draft: ["submitted"],
  submitted: ["in_review"],
  in_review: ["corrections_requested", "submitted", "approved", "rejected"],
  corrections_requested: ["submitted"],
  approved: [],
  rejected: [],
};

export function canTransition(from: ProtocolStatus, to: ProtocolStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ProtocolStatus, to: ProtocolStatus): void {
  if (!canTransition(from, to)) {
    throw new ProtocolFlowError(`Cannot move a protocol from ${from} to ${to}.`);
  }
}

export type StagePointer = {
  key: string;
  sectorKey: string;
  order: number;
};

export function orderedStages<T extends StagePointer>(stages: readonly T[]): T[] {
  return [...stages].sort((left, right) => left.order - right.order);
}

export function stageAfter<T extends StagePointer>(
  stages: readonly T[],
  currentKey: string,
): T | undefined {
  const ordered = orderedStages(stages);
  const index = ordered.findIndex((stage) => stage.key === currentKey);
  if (index === -1) {
    throw new ProtocolFlowError(`Stage "${currentKey}" is not in this workflow.`);
  }
  return ordered[index + 1];
}

export function visitedStages<T extends StagePointer>(
  stages: readonly T[],
  currentKey: string,
): T[] {
  const ordered = orderedStages(stages);
  const index = ordered.findIndex((stage) => stage.key === currentKey);
  if (index === -1) {
    throw new ProtocolFlowError(`Stage "${currentKey}" is not in this workflow.`);
  }
  return ordered.slice(0, index + 1);
}

/**
 * What happens when the current sector clears its stage.
 * The protocol must already be `in_review`.
 */
export function handoffAfterClearance<T extends StagePointer>(
  stages: readonly T[],
  currentKey: string,
): { status: "submitted"; next: T } | { status: "approved" } {
  const next = stageAfter(stages, currentKey);
  if (!next) {
    assertTransition("in_review", "approved");
    return { status: "approved" };
  }
  assertTransition("in_review", "submitted");
  return { status: "submitted", next };
}

export type ReplayEvent = {
  kind: TimelineKind;
  visibility?: "public" | "internal";
};

export type ReplayState = {
  status: ProtocolStatus;
  stageKey: string;
};

/** Replay public timeline events into the status and stage they imply. */
export function replayProtocol(
  events: readonly ReplayEvent[],
  stages: readonly StagePointer[],
): ReplayState {
  const ordered = orderedStages(stages);
  const first = ordered[0];
  if (!first) {
    throw new ProtocolFlowError("A workflow needs at least one stage.");
  }

  let status: ProtocolStatus = "draft";
  let stage = first;

  for (const event of events) {
    if ((event.visibility ?? "public") === "internal") {
      continue;
    }

    switch (event.kind) {
      case "filed": {
        assertTransition(status, "submitted");
        status = "submitted";
        break;
      }
      case "claimed": {
        assertTransition(status, "in_review");
        status = "in_review";
        break;
      }
      case "correction_requested": {
        assertTransition(status, "corrections_requested");
        status = "corrections_requested";
        break;
      }
      case "resubmitted": {
        assertTransition(status, "submitted");
        status = "submitted";
        break;
      }
      case "advanced": {
        if (status !== "in_review") {
          throw new ProtocolFlowError(
            "A protocol can only advance while it is in review.",
          );
        }
        const handoff = handoffAfterClearance(ordered, stage.key);
        if (handoff.status === "approved") {
          throw new ProtocolFlowError(
            "The last sector finishes a protocol with an approval, not a handoff.",
          );
        }
        status = handoff.status;
        stage = handoff.next;
        break;
      }
      case "approved": {
        if (status !== "in_review") {
          throw new ProtocolFlowError(
            "A protocol can only be approved while it is in review.",
          );
        }
        const handoff = handoffAfterClearance(ordered, stage.key);
        if (handoff.status !== "approved") {
          throw new ProtocolFlowError(
            "A later sector still has to review this protocol before it can be approved.",
          );
        }
        status = "approved";
        break;
      }
      case "rejected": {
        assertTransition(status, "rejected");
        status = "rejected";
        break;
      }
      default: {
        const unknown: never = event.kind;
        throw new ProtocolFlowError(`Unknown timeline event ${String(unknown)}.`);
      }
    }
  }

  return { status, stageKey: stage.key };
}

export function isProtocolStatus(value: string): value is ProtocolStatus {
  return (PROTOCOL_STATUSES as readonly string[]).includes(value);
}
