import type { ProtocolStatus } from "@/lib/domain";
import { STATUS_LABEL } from "@/lib/labels";

const tone: Record<ProtocolStatus, string> = {
  draft: "bg-sand text-ink",
  submitted: "bg-paper text-pine ring-1 ring-pine/40",
  in_review: "bg-copper/15 text-copper",
  corrections_requested: "bg-clay-soft text-clay",
  approved: "bg-pine text-paper",
  rejected: "bg-ink text-paper",
};

export function StatusBadge({ status }: { status: ProtocolStatus }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${tone[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
