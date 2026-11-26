import type { Metadata } from "next";
import Link from "next/link";
import { SectorEditor } from "@/components/sector-editor";
import { requireAdmin } from "@/lib/guards";

export const metadata: Metadata = { title: "New sector" };

export default async function NewSectorPage() {
  await requireAdmin("/admin/sectors/new");

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/admin/sectors"
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        All sectors
      </Link>
      <h1 className="mt-3 font-display text-5xl">New sector</h1>
      <SectorEditor
        mode="create"
        initial={{ key: "", name: "", summary: "", order: 10, active: true }}
      />
    </div>
  );
}
