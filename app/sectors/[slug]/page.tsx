import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseNotice } from "@/components/database-notice";
import { ProtocolList } from "@/components/protocol-list";
import { ServiceCard } from "@/components/service-card";
import { getSectorPage, type SectorPageData } from "@/lib/queries";

type SectorRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: SectorRouteProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getSectorPage(slug);
    return { title: data?.sector.name ?? "Sector" };
  } catch {
    return { title: "Sector" };
  }
}

export default async function SectorPage({ params }: SectorRouteProps) {
  const { slug } = await params;
  let data: SectorPageData | null = null;
  try {
    data = await getSectorPage(slug);
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <DatabaseNotice error={error} />
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6">
      <div>
        <Link
          href="/sectors"
          className="text-sm font-medium text-pine underline-offset-4 hover:underline"
        >
          All sectors
        </Link>
        <h1 className="mt-3 font-display text-5xl">{data.sector.name}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{data.sector.summary}</p>
      </div>

      <section>
        <h2 className="font-display text-3xl">Services that stop here</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The form and the document list come from the protocol type. Nothing on this page
          is a hard-coded filing wizard.
        </p>
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.services.map((service) => (
            <li key={service.key}>
              <ServiceCard service={service} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-3xl">At this desk</h2>
        <p className="mt-2 text-sm text-muted">
          Waiting, in review, or closed here. Applicant names are visible in this preview
          because sign-in does not exist yet.
        </p>
        <div className="mt-5">
          <ProtocolList
            rows={data.atDesk}
            showApplicant
            empty="No protocols are sitting at this desk."
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl">Already moved on</h2>
        <p className="mt-2 text-sm text-muted">
          These protocols visited this sector and now sit somewhere else on their route.
        </p>
        <div className="mt-5">
          <ProtocolList
            rows={data.movedOn}
            showApplicant
            empty="No protocols have left this desk for another sector."
          />
        </div>
      </section>
    </div>
  );
}
