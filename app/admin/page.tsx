import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/guards";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHomePage() {
  await requireAdmin("/admin");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Catalog admin</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Sectors are the city desks. Protocol types are the services those desks publish,
        including the form and the documents each service requires.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/admin/sectors"
            className="block h-full rounded-3xl border border-sand bg-card p-5 hover:border-pine"
          >
            <h2 className="font-display text-3xl">Sectors</h2>
            <p className="mt-2 text-sm text-muted">
              Add a desk, rename it, or mark it inactive.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/protocol-types"
            className="block h-full rounded-3xl border border-sand bg-card p-5 hover:border-pine"
          >
            <h2 className="font-display text-3xl">Protocol types</h2>
            <p className="mt-2 text-sm text-muted">
              Edit the form schema and the required documents for each service.
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
