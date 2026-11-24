import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseNotice } from "@/components/database-notice";
import { listOpenServices, type OpenService } from "@/lib/filing-store";
import { requireApplicant } from "@/lib/guards";

export const metadata: Metadata = { title: "File a request" };

export default async function FileIndexPage() {
  await requireApplicant("/file");
  let services: OpenService[] | null = null;
  let failure: unknown = null;
  try {
    services = await listOpenServices();
  } catch (error) {
    failure = error;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">File a request</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Each service brings its own questions and documents. Filing gives the request a
        protocol number and sends it to the first desk on its route.
      </p>
      <div className="mt-8">
        {failure ? <DatabaseNotice error={failure} /> : null}
        {services ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <li key={service.key}>
                <article className="flex h-full flex-col rounded-3xl border border-sand bg-card p-5">
                  <h2 className="font-display text-3xl">{service.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {service.summary}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-copper">
                    Published by {service.sectorName}
                  </p>
                  <Link
                    href={`/file/${service.key}`}
                    className="mt-5 inline-flex w-fit rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper"
                  >
                    Open the form
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
