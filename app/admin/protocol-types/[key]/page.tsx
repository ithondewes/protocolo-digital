import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProtocolTypeEditor,
  type ProtocolTypeDraft,
} from "@/components/protocol-type-editor";
import { requireAdmin } from "@/lib/guards";
import { catalogChoices, readProtocolTypeInput } from "@/lib/protocol-type-store";

type EditProps = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: EditProps): Promise<Metadata> {
  const { key } = await params;
  return { title: key };
}

export default async function EditProtocolTypePage({ params }: EditProps) {
  const { key } = await params;
  await requireAdmin(`/admin/protocol-types/${key}`);
  const [service, choices] = await Promise.all([
    readProtocolTypeInput(key),
    catalogChoices(),
  ]);
  if (!service) {
    notFound();
  }

  const initial: ProtocolTypeDraft = {
    key: service.key,
    name: service.name,
    summary: service.summary,
    catalogSectorKey: service.catalogSectorKey,
    workflowKey: service.workflowKey,
    active: service.active,
    sections: service.formSchema.sections.map((section) => ({
      key: section.key,
      title: section.title,
      description: section.description ?? "",
      fields: section.fields.map((field) => ({
        key: field.key,
        label: field.label,
        kind: field.kind,
        required: field.required,
        help: field.help ?? "",
        options: field.options?.join(", ") ?? "",
      })),
    })),
    documents: service.documents.map((document) => ({
      key: document.key,
      label: document.label,
      detail: document.detail,
      required: document.required,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/admin/protocol-types"
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        All services
      </Link>
      <h1 className="mt-3 font-display text-5xl">{service.name}</h1>
      <ProtocolTypeEditor
        mode="edit"
        initial={initial}
        sectors={choices.sectors}
        workflows={choices.workflows}
      />
    </div>
  );
}
