import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseNotice } from "@/components/database-notice";
import { RouteStrip } from "@/components/route-strip";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { readFiledReceipt, type FiledReceipt } from "@/lib/filing-store";
import { requireApplicant } from "@/lib/guards";
import { normalizeProtocolCode } from "@/lib/queries";

type SentProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: SentProps): Promise<Metadata> {
  const { code } = await params;
  return { title: normalizeProtocolCode(code) };
}

export default async function FiledProtocolPage({ params }: SentProps) {
  const { code } = await params;
  const user = await requireApplicant(`/file/sent/${code}`);
  let receipt: FiledReceipt | null = null;
  try {
    receipt = await readFiledReceipt(code, user.id);
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <DatabaseNotice error={error} />
      </div>
    );
  }
  if (!receipt) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <div>
        <Link
          href="/account"
          className="text-sm font-medium text-pine underline-offset-4 hover:underline"
        >
          Your protocols
        </Link>
        <p className="mt-4 font-mono text-sm tracking-wide text-muted">{receipt.code}</p>
        <h1 className="mt-2 font-display text-5xl">{receipt.serviceName}</h1>
        {receipt.serviceSummary ? (
          <p className="mt-3 text-muted">{receipt.serviceSummary}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={receipt.status} />
          <p className="text-sm">
            {receipt.status === "draft"
              ? "Not filed yet."
              : `Now at ${receipt.currentSectorName}`}
          </p>
        </div>
        <p className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href={`/track/${receipt.code}`}
            className="font-medium text-pine underline-offset-4 hover:underline"
          >
            Open the public timeline
          </Link>
          {receipt.status === "corrections_requested" ? (
            <Link
              href={`/file/correct/${receipt.code}`}
              className="font-medium text-copper underline-offset-4 hover:underline"
            >
              Respond to corrections
            </Link>
          ) : null}
        </p>
      </div>

      {receipt.stages.length > 0 ? (
        <section>
          <h2 className="font-display text-3xl">Route</h2>
          <div className="mt-4">
            <RouteStrip stages={receipt.stages} currentKey={receipt.currentStageKey} />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-3xl">Answers</h2>
        <p className="mt-2 text-sm text-muted">
          These stay on your copy of the file. The public page does not show them.
        </p>
        <div className="mt-4 space-y-4">
          {receipt.sections.map((section) => (
            <section
              key={section.key}
              className="rounded-3xl border border-sand bg-card p-5"
            >
              <h3 className="font-display text-2xl">{section.title}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <dt className="font-medium">{field.label}</dt>
                    <dd className="text-muted">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl">Documents</h2>
        {receipt.documents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No documents were stored with this file.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {receipt.documents.map((document) => (
              <li
                key={document.key}
                className="rounded-2xl border border-sand bg-card px-4 py-3"
              >
                <p className="font-medium">{document.label}</p>
                <p className="mt-1 text-sm text-muted">{document.fileName}</p>
                {document.stored ? (
                  <a
                    href={`/api/protocols/${receipt.code}/files/${document.key}`}
                    className="mt-2 inline-block text-sm font-medium text-pine underline-offset-4 hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    The sample catalog names this file, and the bytes are not in the
                    store.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-3xl">History</h2>
        <div className="mt-6">
          <Timeline events={receipt.timeline} />
        </div>
      </section>
    </div>
  );
}
