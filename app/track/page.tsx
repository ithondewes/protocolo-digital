import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DatabaseNotice } from "@/components/database-notice";
import { ProtocolList } from "@/components/protocol-list";
import { TrackForm } from "@/components/track-form";
import { getLandingData, normalizeProtocolCode, type ProtocolRow } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Track a protocol",
};

type TrackSearchProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

export default async function TrackPage({ searchParams }: TrackSearchProps) {
  const query = await searchParams;
  const raw = Array.isArray(query.code) ? query.code[0] : query.code;
  if (raw?.trim()) {
    redirect(`/track/${encodeURIComponent(normalizeProtocolCode(raw))}`);
  }

  let recent: ProtocolRow[] = [];
  let failure: unknown = null;
  try {
    const data = await getLandingData();
    recent = data.recent;
  } catch (error) {
    failure = error;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl">Follow a protocol</h1>
        <p className="mt-3 text-lg text-muted">
          Enter the number the city issued. You will see which desk holds the file and the
          public events so far.
        </p>
      </div>
      <div className="max-w-xl">
        <TrackForm />
      </div>
      {failure ? <DatabaseNotice error={failure} /> : null}
      {recent.length > 0 ? (
        <section>
          <h2 className="font-display text-3xl">Try a sample number</h2>
          <div className="mt-5">
            <ProtocolList
              rows={recent}
              showApplicant={false}
              empty="No public protocols yet."
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
