import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { listOwnedProtocols } from "@/lib/filing-store";
import { requireUser } from "@/lib/guards";
import { connectDb } from "@/lib/db";
import { Sector } from "@/models/Sector";

export const metadata: Metadata = { title: "Account" };

type AccountProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function AccountPage({ searchParams }: AccountProps) {
  const user = await requireUser("/account");
  const query = await searchParams;
  await connectDb();
  const [sectors, protocols] = await Promise.all([
    Sector.find({ key: { $in: user.sectorKeys }, active: true })
      .sort({ order: 1 })
      .lean(),
    user.role === "applicant" ? listOwnedProtocols(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Account</h1>
      <p className="mt-3 text-lg">
        {user.name}{" "}
        <span className="text-muted">
          · {user.role} · {user.email}
        </span>
      </p>
      {query.notice === "admin" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay"
        >
          Only an admin can edit the service catalog.
        </p>
      ) : null}
      {query.notice === "applicant" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay"
        >
          Only an applicant can file a protocol.
        </p>
      ) : null}

      {user.role === "admin" ? (
        <p className="mt-6 text-muted">
          You can change protocol types, including their forms and required documents.{" "}
          <Link
            href="/admin/protocol-types"
            className="font-medium text-pine underline-offset-4 hover:underline"
          >
            Open the catalog
          </Link>
          .
        </p>
      ) : null}

      {user.role === "analyst" ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl">Your sectors</h2>
          <p className="mt-2 text-sm text-muted">
            An analyst only covers the desks listed here.{" "}
            <Link
              href="/desk"
              className="font-medium text-pine underline-offset-4 hover:underline"
            >
              Open the inbox
            </Link>
            .
          </p>
          {sectors.length === 0 ? (
            <p className="mt-4 text-muted">No sector is assigned to this account.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {sectors.map((sector) => (
                <li key={sector.key}>
                  <Link
                    href={`/sectors/${sector.key}`}
                    className="font-medium text-pine underline-offset-4 hover:underline"
                  >
                    {sector.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {user.role === "applicant" ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl">Your protocols</h2>
            <Link
              href="/file"
              className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper"
            >
              File a request
            </Link>
          </div>
          {protocols.length === 0 ? (
            <p className="mt-4 text-muted">You have not filed a protocol yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-card">
              {protocols.map((protocol) => (
                <li key={protocol.code}>
                  <Link
                    href={`/file/sent/${protocol.code}`}
                    className="flex flex-col gap-2 px-4 py-4 hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="block font-medium">{protocol.serviceName}</span>
                      <span className="mt-1 block font-mono text-sm text-muted">
                        {protocol.code}
                      </span>
                    </span>
                    <StatusBadge status={protocol.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
