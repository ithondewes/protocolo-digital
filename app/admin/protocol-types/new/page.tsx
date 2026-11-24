import type { Metadata } from "next";
import Link from "next/link";
import {
  ProtocolTypeEditor,
  type ProtocolTypeDraft,
} from "@/components/protocol-type-editor";
import { requireAdmin } from "@/lib/guards";
import { catalogChoices } from "@/lib/protocol-type-store";

export const metadata: Metadata = { title: "New service" };

export default async function NewProtocolTypePage() {
  await requireAdmin("/admin/protocol-types/new");
  const choices = await catalogChoices();
  const sector = choices.sectors[0];
  const workflow = choices.workflows[0];
  if (!sector || !workflow) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl">Seed the city first</h1>
        <p className="mt-3 text-muted">
          A service needs at least one sector and one workflow. Run{" "}
          <code>npm run seed</code>.
        </p>
      </div>
    );
  }

  const initial: ProtocolTypeDraft = {
    key: "",
    name: "",
    summary: "",
    catalogSectorKey: sector.key,
    workflowKey: workflow.key,
    active: true,
    sections: [
      {
        key: "details",
        title: "Details",
        description: "",
        fields: [
          {
            key: "summary",
            label: "Summary",
            kind: "textarea",
            required: true,
            help: "",
            options: "",
          },
        ],
      },
    ],
    documents: [],
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/admin/protocol-types"
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        All services
      </Link>
      <h1 className="mt-3 font-display text-5xl">New service</h1>
      <ProtocolTypeEditor
        mode="create"
        initial={initial}
        sectors={choices.sectors}
        workflows={choices.workflows}
      />
    </div>
  );
}
