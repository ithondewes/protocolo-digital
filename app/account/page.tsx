import type { Metadata } from "next";
import Link from "next/link";
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
  const sectors = await Sector.find({ key: { $in: user.sectorKeys }, active: true })
    .sort({ order: 1 })
    .lean();

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
            An analyst only covers the desks listed here. The shared review queue is still
            to come.
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
        <p className="mt-6 text-muted">
          Filing a protocol from a service&apos;s form is the next slice. Your account is
          ready for that.
        </p>
      ) : null}
    </div>
  );
}
