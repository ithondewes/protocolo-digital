import type { ProtocolStatus } from "./domain";

export const STATUS_LABEL: Record<ProtocolStatus, string> = {
  draft: "Draft",
  submitted: "Waiting to be claimed",
  in_review: "In review",
  corrections_requested: "Corrections requested",
  approved: "Approved",
  rejected: "Rejected",
};
