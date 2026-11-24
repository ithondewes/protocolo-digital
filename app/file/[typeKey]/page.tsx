import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicantForm } from "@/components/applicant-form";
import { DatabaseNotice } from "@/components/database-notice";
import { RouteStrip } from "@/components/route-strip";
import type { FilingFormView } from "@/lib/filing";
import { readFilingForm } from "@/lib/filing-store";
import { requireApplicant } from "@/lib/guards";

type FileTypeProps = {
  params: Promise<{ typeKey: string }>;
};

export async function generateMetadata({ params }: FileTypeProps): Promise<Metadata> {
  const { typeKey } = await params;
  try {
    const form = await readFilingForm(typeKey);
    return { title: form ? `File ${form.name}` : "File a request" };
  } catch {
    return { title: "File a request" };
  }
}

export default async function FileTypePage({ params }: FileTypeProps) {
  const { typeKey } = await params;
  await requireApplicant(`/file/${typeKey}`);

  let form: FilingFormView | null = null;
  let failure: unknown = null;
  try {
    form = await readFilingForm(typeKey);
  } catch (error) {
    failure = error;
  }

  if (failure) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <DatabaseNotice error={failure} />
      </div>
    );
  }
  if (!form) {
    notFound();
  }

  const first = form.stages[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/file"
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        All services
      </Link>
      <h1 className="mt-3 font-display text-5xl">{form.name}</h1>
      <p className="mt-3 text-lg text-muted">{form.summary}</p>
      <div className="mt-5">
        <RouteStrip stages={form.stages} currentKey={first?.key} />
      </div>
      <p className="mt-4 text-sm text-muted">
        {first
          ? `After you file, the protocol waits at ${first.sectorName} until an analyst claims it.`
          : "This service has no route yet."}{" "}
        Answers and files stay off the public timeline. The protocol number does not.
      </p>
      <div className="mt-8">
        <ApplicantForm form={form} />
      </div>
    </div>
  );
}
