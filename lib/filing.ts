import type { DocumentRequirement, FormSchema } from "./domain";
import type { StagePointer } from "./protocol-flow";
import {
  ProtocolFlowError,
  assertTransition,
  orderedStages,
  replayProtocol,
} from "./protocol-flow";

/** What the applicant form renders. It is the protocol type, not a fixed wizard. */
export type FilingFormView = {
  key: string;
  name: string;
  summary: string;
  sections: FormSchema["sections"];
  documents: DocumentRequirement[];
  stages: { key: string; sectorName: string }[];
};

const PROTOCOL_CODE = /^VC-(\d{4})-(\d{4})$/;

/** Next public number for a calendar year, based on numbers already issued. */
export function nextProtocolCode(existingCodes: readonly string[], year: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Protocol numbers use a four-digit year.");
  }

  let max = 0;
  for (const code of existingCodes) {
    const match = PROTOCOL_CODE.exec(code.trim().toUpperCase());
    if (!match || Number(match[1]) !== year) {
      continue;
    }
    max = Math.max(max, Number(match[2]));
  }

  const next = max + 1;
  if (next > 9999) {
    throw new Error(`No protocol numbers remain for ${year}.`);
  }
  return `VC-${year}-${String(next).padStart(4, "0")}`;
}

export function openingStage<T extends StagePointer>(stages: readonly T[]): T {
  const first = orderedStages(stages)[0];
  if (!first) {
    throw new ProtocolFlowError("A workflow needs at least one stage.");
  }
  return first;
}

export function filedHistory(input: {
  applicantName: string;
  serviceName: string;
  sectorKey: string;
  at: Date;
}) {
  return {
    kind: "filed" as const,
    title: "Protocol filed",
    detail: `${input.applicantName} filed ${input.serviceName}. It is waiting to be claimed.`,
    sectorKey: input.sectorKey,
    at: input.at,
    visibility: "public" as const,
  };
}

/**
 * The status and the first desk a filing lands on.
 * The file is treated as a draft until this transition, then it is `submitted`.
 */
export function openingSubmission(input: {
  stages: readonly StagePointer[];
  applicantName: string;
  serviceName: string;
  at: Date;
}) {
  assertTransition("draft", "submitted");
  const stage = openingStage(input.stages);
  const event = filedHistory({
    applicantName: input.applicantName,
    serviceName: input.serviceName,
    sectorKey: stage.sectorKey,
    at: input.at,
  });
  const replayed = replayProtocol([event], input.stages);
  if (replayed.status !== "submitted" || replayed.stageKey !== stage.key) {
    throw new ProtocolFlowError("Filing did not land on the opening desk.");
  }

  return {
    status: "submitted" as const,
    currentStageKey: stage.key,
    currentSectorKey: stage.sectorKey,
    submittedAt: input.at,
    event,
  };
}
