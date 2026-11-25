import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { PROTOCOL_STATUSES } from "@/lib/domain";
import { listInbox, type InboxFilters } from "@/lib/desk-store";
import { formatWhen } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { STATUS_LABEL } from "@/lib/labels";
import { inboxQuerySchema } from "@/lib/review-input";

export const metadata: Metadata = { title: "Inbox" };

type InboxProps = {
  searchParams: Promise<{ status?: string; sector?: string; type?: string }>;
};

export default async function InboxPage({ searchParams }: InboxProps) {
  const user = await requireUser("/desk");
  if (user.role === "applicant") {
    redirect("/account");
  }
  const query = await searchParams;
  const parsed = inboxQuerySchema.safeParse({
    status: query.status || undefined,
    sector: query.sector,
    type: query.type,
  });
  const filters: InboxFilters = parsed.success ? parsed.data : {};
  const inbox = await listInbox(user, filters);
  if (!inbox) {
    redirect("/account");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Inbox</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Protocols sitting at {user.role === "admin" ? "any desk" : "your sectors"}. Claim
        a waiting file, then review each section and document.
      </p>
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-1 block rounded-xl border border-sand bg-card px-3 py-2"
          >
            <option value="">Any open status</option>
            {PROTOCOL_STATUSES.filter((status) => status !== "draft").map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Sector
          <select
            name="sector"
            defaultValue={filters.sector ?? ""}
            className="mt-1 block rounded-xl border border-sand bg-card px-3 py-2"
          >
            <option value="">All of your sectors</option>
            {inbox.sectors.map((sector) => (
              <option key={sector.key} value={sector.key}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Service
          <select
            name="type"
            defaultValue={filters.type ?? ""}
            className="mt-1 block rounded-xl border border-sand bg-card px-3 py-2"
          >
            <option value="">All services</option>
            {inbox.services.map((service) => (
              <option key={service.key} value={service.key}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper"
        >
          Filter
        </button>
      </form>

      {inbox.rows.length === 0 ? (
        <p className="mt-8 text-muted">No protocols match these filters.</p>
      ) : (
        <ul className="mt-8 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-card">
          {inbox.rows.map((row) => (
            <li key={row.code}>
              <Link
                href={`/desk/${row.code}`}
                className="flex flex-col gap-2 px-4 py-4 hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block font-mono text-sm">{row.code}</span>
                  <span className="mt-1 block font-medium">{row.serviceName}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {row.applicantName} · {row.sectorName}
                    {row.assigneeName ? ` · ${row.assigneeName}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={row.status} />
                  <time dateTime={row.updatedAt} className="text-xs text-muted">
                    {formatWhen(row.updatedAt)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
