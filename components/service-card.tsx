import Link from "next/link";
import type { ServiceView } from "@/lib/queries";
import { RouteStrip } from "./route-strip";

export function ServiceCard({ service }: { service: ServiceView }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-3xl border border-sand bg-card p-5">
      <div>
        <h3 className="font-display text-2xl">{service.name}</h3>
        <p className="mt-2 text-sm text-muted">{service.summary}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-copper">
          Published by {service.publishedBy}
        </p>
      </div>
      <RouteStrip stages={service.stages} />
      <div>
        <h4 className="text-sm font-semibold">Form from the catalog</h4>
        <ul className="mt-2 space-y-2 text-sm text-muted">
          {service.sections.map((section) => (
            <li key={section.key}>
              <span className="font-medium text-ink">{section.title}. </span>
              {section.fields}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Documents</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {service.documents.map((document) => (
            <li key={document.label}>
              {document.label}
              {document.required ? " · required" : " · optional"}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/file/${service.key}`}
        className="mt-auto inline-flex w-fit rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper"
      >
        File this request
      </Link>
    </article>
  );
}
