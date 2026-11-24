import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewForm } from "@/components/review-form";
import { RouteStrip } from "@/components/route-strip";
import { StatusBadge } from "@/components/status-badge";
import { readDeskCase } from "@/lib/desk-store";
import { requireUser } from "@/lib/guards";
import { normalizeProtocolCode } from "@/lib/queries";

type DeskCaseProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: DeskCaseProps): Promise<Metadata> {
  const { code } = await params;
  return { title: normalizeProtocolCode(code) };
}

export default async function DeskCasePage({ params, searchParams }: DeskCaseProps) {
  const { code } = await params;
  const user = await requireUser(`/desk/${code}`);
  if (user.role === "applicant") {
    redirect("/account");
  }
  const query = await searchParams;
  const deskCase = await readDeskCase(code, user);
  if (!deskCase) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Link
          href="/desk"
          className="text-sm font-medium text-pine underline-offset-4 hover:underline"
        >
          Inbox
        </Link>
        <p className="mt-4 font-mono text-sm text-muted">{deskCase.code}</p>
        <h1 className="mt-2 font-display text-5xl">{deskCase.serviceName}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={deskCase.status} />
          <p className="text-sm">
            {deskCase.applicantName} · now at {deskCase.currentSectorName}
            {deskCase.assigneeName ? ` · claimed by ${deskCase.assigneeName}` : ""}
          </p>
        </div>
      </div>
      <RouteStrip stages={deskCase.stages} currentKey={deskCase.currentStageKey} />
      {query.error ? (
        <p role="alert" className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">
          {query.error}
        </p>
      ) : null}
      {deskCase.canClaim ? (
        <form action={`/api/desk/${deskCase.code}/claim`} method="post">
          <button
            type="submit"
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
          >
            Claim this protocol
          </button>
        </form>
      ) : null}
      {deskCase.canReview ? (
        <ReviewForm
          code={deskCase.code}
          targets={deskCase.targets}
          nextSectorName={deskCase.nextSectorName}
        />
      ) : null}
      {!deskCase.canClaim && !deskCase.canReview ? (
        <p className="text-muted">
          This protocol is {deskCase.status.replaceAll("_", " ")} and is not open for your
          review.
        </p>
      ) : null}
    </div>
  );
}
