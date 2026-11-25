import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CorrectionForm } from "@/components/correction-form";
import { readCorrectionDraft } from "@/lib/desk-store";
import type { FieldKind } from "@/lib/domain";
import { requireApplicant } from "@/lib/guards";
import { normalizeProtocolCode } from "@/lib/queries";

type CorrectProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: CorrectProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Correct ${normalizeProtocolCode(code)}` };
}

export default async function CorrectProtocolPage({ params }: CorrectProps) {
  const { code } = await params;
  const user = await requireApplicant(`/file/correct/${code}`);
  const draft = await readCorrectionDraft(code, user.id);
  if (!draft) {
    notFound();
  }

  const initial: Record<string, Record<string, string | boolean>> = {};
  for (const section of draft.sections) {
    initial[section.key] = {};
    for (const field of section.fields) {
      initial[section.key][field.key] = displayValue(
        field.kind,
        draft.answers[section.key]?.[field.key],
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href={`/file/sent/${draft.code}`}
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        Back to {draft.code}
      </Link>
      <h1 className="mt-3 font-display text-5xl">Send corrections</h1>
      <p className="mt-3 text-muted">
        Update the parts {draft.serviceName} sent back. The rest of the file stays as it
        was. The timeline keeps the earlier review.
      </p>
      <div className="mt-8">
        <CorrectionForm
          code={draft.code}
          sections={draft.sections}
          documents={draft.documents}
          initial={initial}
          editableSections={draft.corrections
            .filter((item) => item.kind === "section")
            .map((item) => item.key)}
          editableDocuments={draft.corrections
            .filter((item) => item.kind === "document")
            .map((item) => item.key)}
          comments={draft.corrections.map((item) => ({
            key: `${item.kind}:${item.key}`,
            label: item.label,
            comment: item.comment,
          }))}
        />
      </div>
    </div>
  );
}

function displayValue(kind: FieldKind, value: unknown): string | boolean {
  if (kind === "boolean") {
    return value === true;
  }
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}
