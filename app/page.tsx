import Link from "next/link";
import { DatabaseNotice } from "@/components/database-notice";
import { ProtocolList } from "@/components/protocol-list";
import { RouteStrip } from "@/components/route-strip";
import { TrackForm } from "@/components/track-form";
import { municipality } from "@/lib/demo";
import { getLandingData, type LandingData } from "@/lib/queries";

export default async function HomePage() {
  let data: LandingData | null = null;
  let failure: unknown = null;
  try {
    data = await getLandingData();
  } catch (error) {
    failure = error;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6">
      <section className="grid items-end gap-10 lg:grid-cols-[1.35fr_0.9fr]">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-copper">
            {municipality.name}
          </p>
          <h1 className="mt-3 max-w-xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
            Every city request gets one protocol number.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Sectors publish services with their own questions and documents. A workflow
            then walks the protocol from desk to desk. The number is enough to follow that
            walk in public.
          </p>
          <Link
            href="/file"
            className="mt-6 inline-flex rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
          >
            File a request
          </Link>
        </div>
        <TrackForm />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-pine px-5 py-6 text-paper">
          <h2 className="font-display text-2xl">Configurable services</h2>
          <p className="mt-2 text-sm leading-relaxed text-sand">
            A protocol type carries its form and its required documents. Adding a desk or
            a service does not mean shipping a new wizard.
          </p>
        </article>
        <article className="rounded-3xl border border-sand bg-card px-5 py-6">
          <h2 className="font-display text-2xl">Several sectors, one file</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Clearing a stage hands the protocol to the next sector. It waits there until
            an analyst claims it. The last stage is the one that can approve.
          </p>
        </article>
        <article className="rounded-3xl border border-sand bg-card px-5 py-6">
          <h2 className="font-display text-2xl">Public timeline</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Anyone with the number can see the handoffs. Answers, notes, and files stay
            off that page.
          </p>
        </article>
      </section>

      {failure ? <DatabaseNotice error={failure} /> : null}

      {data ? (
        <>
          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-4xl">Sectors</h2>
              <Link
                href="/sectors"
                className="text-sm font-medium text-pine underline-offset-4 hover:underline"
              >
                All sectors
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.sectors.map((sector) => (
                <li key={sector.key}>
                  <Link
                    href={`/sectors/${sector.key}`}
                    className="block h-full rounded-3xl border border-sand bg-card p-5 transition hover:border-pine"
                  >
                    <h3 className="font-display text-3xl">{sector.name}</h3>
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
          </section>

          {data.featured ? (
            <section className="rounded-3xl bg-ink px-6 py-7 text-paper">
              <p className="text-sm uppercase tracking-[0.16em] text-sand">
                Longest sample route
              </p>
              <h2 className="mt-2 font-display text-4xl">{data.featured.name}</h2>
              <p className="mt-3 max-w-2xl text-sand">{data.featured.summary}</p>
              <div className="mt-5">
                <RouteStrip stages={data.featured.stages} tone="inverse" />
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-4xl">Recently active</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Public protocols only. Open one to read its timeline.
            </p>
            <div className="mt-6">
              <ProtocolList
                rows={data.recent}
                showApplicant={false}
                empty="No public protocols yet."
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
