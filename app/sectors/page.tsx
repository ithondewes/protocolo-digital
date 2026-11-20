import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseNotice } from "@/components/database-notice";
import { getLandingData, type SectorSummary } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Sectors",
};

export default async function SectorsPage() {
  let sectors: SectorSummary[] | null = null;
  let failure: unknown = null;
  try {
    const data = await getLandingData();
    sectors = data.sectors;
  } catch (error) {
    failure = error;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Sectors</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Each sector is a desk that can publish services and receive protocols from a
        workflow. The list below is the Vale Claro sample.
      </p>
      <div className="mt-8">
        {failure ? <DatabaseNotice error={failure} /> : null}
        {sectors ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sectors.map((sector) => (
              <li key={sector.key}>
                <Link
                  href={`/sectors/${sector.key}`}
                  className="block h-full rounded-3xl border border-sand bg-card p-5 transition hover:border-pine"
                >
                  <h2 className="font-display text-3xl">{sector.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {sector.summary}
                  </p>
                  <p className="mt-4 text-sm font-medium">
                    {sector.atDesk} at this desk · {sector.serviceCount} services
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
