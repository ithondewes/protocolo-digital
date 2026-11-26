import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { listProtocolTypeSummaries } from "@/lib/protocol-type-store";

export const metadata: Metadata = { title: "Service catalog" };

export default async function ProtocolTypeListPage() {
  await requireAdmin("/admin/protocol-types");
  const services = await listProtocolTypeSummaries();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/admin" className="text-sm font-medium text-pine underline-offset-4 hover:underline">
        Catalog admin
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Service catalog</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Each service is a protocol type. Its form and required documents are defined
            here, not hard-coded in a wizard.
          </p>
        </div>
        <Link
          href="/admin/protocol-types/new"
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
        >
          New service
        </Link>
      </div>
      <ul className="mt-8 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-card">
        {services.map((service) => (
          <li key={service.key}>
            <Link
              href={`/admin/protocol-types/${service.key}`}
              className="flex flex-col gap-2 px-4 py-4 hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="block font-medium">{service.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  {service.key} · {service.sectionCount} sections ·{" "}
                  {service.documentCount} documents · {service.workflowKey}
                </span>
              </span>
              <span className="text-sm">{service.active ? "Active" : "Inactive"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
