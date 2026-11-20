import Link from "next/link";
import { municipality, previewAnalyst } from "@/lib/demo";

export function SiteHeader() {
  return (
    <header className="border-b border-pine bg-pine-deep text-paper">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="block">
            <span className="block font-display text-2xl leading-none">
              {municipality.product}
            </span>
            <span className="mt-1 block text-sm text-sand">
              {municipality.name} protocol hub
            </span>
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
            <Link href="/sectors" className="underline-offset-4 hover:underline">
              Sectors
            </Link>
            <Link href="/track" className="underline-offset-4 hover:underline">
              Track
            </Link>
          </nav>
        </div>
        <p className="max-w-3xl text-sm text-sand">
          Previewing as {previewAnalyst.name}, {previewAnalyst.role} at{" "}
          {previewAnalyst.sectorNames.join(", ")}. Sign-in is not built yet, so every page
          is readable.
        </p>
      </div>
    </header>
  );
}
