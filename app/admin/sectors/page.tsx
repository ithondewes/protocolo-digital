import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { listSectors } from "@/lib/sector-store";

export const metadata: Metadata = { title: "Sectors" };

export default async function AdminSectorsPage() {
  await requireAdmin("/admin/sectors");
  const sectors = await listSectors();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link
        href="/admin"
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        Catalog admin
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Sectors</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Each sector is a desk that can publish services and receive protocols.
          </p>
        </div>
        <Link
          href="/admin/sectors/new"
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
        >
          New sector
        </Link>
      </div>
      <ul className="mt-8 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-card">
        {sectors.map((sector) => (
          <li key={sector.key}>
            <Link
              href={`/admin/sectors/${sector.key}`}
              className="flex flex-col gap-1 px-4 py-4 hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="block font-medium">{sector.name}</span>
                <span className="mt-1 block text-sm text-muted">{sector.summary}</span>
              </span>
              <span className="text-sm">{sector.active ? "Active" : "Inactive"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
