import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseNotice } from "@/components/database-notice";
import { RouteStrip } from "@/components/route-strip";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { TrackForm } from "@/components/track-form";
import { listOpenCorrections, type OpenCorrection } from "@/lib/desk-store";
import { getCurrentUser } from "@/lib/session";
import {
  getPublicProtocol,
  normalizeProtocolCode,
  type PublicProtocol,
} from "@/lib/queries";

type TrackCodeProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: TrackCodeProps): Promise<Metadata> {
  const { code } = await params;
  return { title: normalizeProtocolCode(code) };
}

export default async function PublicProtocolPage({ params }: TrackCodeProps) {
  const { code } = await params;
  let protocol: PublicProtocol | null = null;
  let corrections: OpenCorrection[] = [];
  let viewerId: string | null = null;
  try {
    const [loaded, notes, viewer] = await Promise.all([
      getPublicProtocol(code),
      listOpenCorrections(code),
      getCurrentUser(),
    ]);
    protocol = loaded;
    corrections = notes;
    viewerId = viewer?.id ?? null;
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <DatabaseNotice error={error} />
      </div>
    );
  }

  if (!protocol) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
      <div>
        <Link
          href="/track"
          className="text-sm font-medium text-pine underline-offset-4 hover:underline"
        >
          Track another number
        </Link>
        <p className="mt-4 font-mono text-sm tracking-wide text-muted">{protocol.code}</p>
        <h1 className="mt-2 font-display text-5xl">{protocol.serviceName}</h1>
        <p className="mt-3 max-w-2xl text-muted">{protocol.serviceSummary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={protocol.status} />
          <p className="text-sm">
            {protocol.isDraft
              ? "Still a draft. The public timeline starts when it is filed."
              : `Now at ${protocol.currentSectorName}`}
          </p>
        </div>
      </div>

      <section>
        <h2 className="font-display text-3xl">Route</h2>
        <div className="mt-4">
          <RouteStrip stages={protocol.stages} currentKey={protocol.currentStageKey} />
        </div>
      </section>

      {corrections.length > 0 ? (
        <section className="rounded-3xl border border-copper/40 bg-card p-5">
          <h2 className="font-display text-3xl">Corrections requested</h2>
          <ul className="mt-4 space-y-3">
            {corrections.map((item) => (
              <li key={`${item.kind}:${item.key}`}>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted">{item.comment}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link
              href={`/file/correct/${protocol.code}`}
              className="font-medium text-pine underline-offset-4 hover:underline"
            >
              {viewerId ? "Respond in your account" : "Sign in to respond"}
            </Link>
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-3xl">Timeline</h2>
        <div className="mt-6">
          {protocol.isDraft ? (
            <p className="max-w-2xl text-muted">
              This number is not public yet. Answers and documents are not shown here.
            </p>
          ) : (
            <Timeline events={protocol.timeline} />
          )}
        </div>
      </section>

      <div className="max-w-xl">
        <TrackForm />
      </div>
    </div>
  );
}
