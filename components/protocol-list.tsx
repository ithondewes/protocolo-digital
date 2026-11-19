import Link from "next/link";
import type { ProtocolRow } from "@/lib/queries";
import { formatWhen } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function ProtocolList({
  rows,
  showApplicant,
  empty,
}: {
  rows: ProtocolRow[];
  showApplicant: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-sand px-4 py-6 text-muted">
        {empty}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-card">
      {rows.map((row) => (
        <li key={row.code}>
          <Link
            href={`/track/${row.code}`}
            className="flex flex-col gap-3 px-4 py-4 transition hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <span className="block font-mono text-sm tracking-wide">{row.code}</span>
              <span className="mt-1 block font-medium">{row.serviceName}</span>
              <span className="mt-1 block text-sm text-muted">
                {showApplicant ? `${row.applicantName} · ` : null}
                Now at {row.currentSectorName}
              </span>
            </span>
            <span className="flex items-center gap-3 sm:flex-col sm:items-end">
              <StatusBadge status={row.status} />
              <time dateTime={row.activityAt} className="text-xs text-muted">
                {formatWhen(row.activityAt)}
              </time>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
