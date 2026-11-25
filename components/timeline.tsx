import { formatWhen } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  filed: "Filed",
  claimed: "Claimed",
  correction_requested: "Corrections",
  resubmitted: "Resubmitted",
  advanced: "Moved",
  approved: "Issued",
  rejected: "Closed",
};

export function Timeline({
  events,
}: {
  events: {
    id: string;
    kind?: string;
    title: string;
    detail: string;
    at: string;
    sectorName: string;
  }[];
}) {
  if (events.length === 0) {
    return <p className="text-muted">No public events yet.</p>;
  }

  return (
    <ol aria-label="Public timeline" className="space-y-6 border-l border-sand pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.95rem] top-1.5 size-3 rounded-full border-2 border-paper bg-pine"
          />
          <p className="text-xs uppercase tracking-[0.12em] text-muted">
            <time dateTime={event.at}>{formatWhen(event.at)}</time>
            {" · "}
            {event.sectorName}
            {event.kind ? ` · ${KIND_LABEL[event.kind] ?? event.kind}` : ""}
          </p>
          <h3 className="mt-1 font-display text-2xl sm:text-3xl">{event.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {event.detail}
          </p>
        </li>
      ))}
    </ol>
  );
}
