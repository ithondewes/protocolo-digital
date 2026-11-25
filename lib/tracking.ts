import type { ProtocolStatus } from "./domain";

export type StageProgress =
  | "not_filed"
  | "not_started"
  | "waiting"
  | "in_review"
  | "corrections"
  | "cleared"
  | "issued"
  | "closed";

const LABEL: Record<StageProgress, string> = {
  not_filed: "Not filed",
  not_started: "Not started",
  waiting: "Waiting to be claimed",
  in_review: "In review",
  corrections: "Corrections requested",
  cleared: "Cleared",
  issued: "Issued",
  closed: "Closed",
};

export function stageProgressLabel(progress: StageProgress): string {
  return LABEL[progress];
}

/** Public status of one sector on the route. Earlier desks are cleared; later desks have not started. */
export function stageProgress(input: {
  status: ProtocolStatus;
  stageIndex: number;
  currentIndex: number;
}): StageProgress {
  if (input.currentIndex < 0) {
    return "not_started";
  }
  if (input.status === "draft") {
    return input.stageIndex === 0 ? "not_filed" : "not_started";
  }
  if (input.stageIndex < input.currentIndex) {
    return "cleared";
  }
  if (input.stageIndex > input.currentIndex) {
    return "not_started";
  }
  switch (input.status) {
    case "submitted":
      return "waiting";
    case "in_review":
      return "in_review";
    case "corrections_requested":
      return "corrections";
    case "approved":
      return "issued";
    case "rejected":
      return "closed";
    default:
      return "not_started";
  }
}

export function describeRoute(input: {
  status: ProtocolStatus;
  currentStageKey: string;
  stages: readonly { key: string; sectorName: string }[];
}): { key: string; sectorName: string; progress: StageProgress; label: string }[] {
  const currentIndex = input.stages.findIndex(
    (stage) => stage.key === input.currentStageKey,
  );
  return input.stages.map((stage, stageIndex) => {
    const progress = stageProgress({
      status: input.status,
      stageIndex,
      currentIndex,
    });
    return {
      key: stage.key,
      sectorName: stage.sectorName,
      progress,
      label: stageProgressLabel(progress),
    };
  });
}
