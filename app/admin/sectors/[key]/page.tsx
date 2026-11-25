import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectorEditor } from "@/components/sector-editor";
import { requireAdmin } from "@/lib/guards";
import { readSector } from "@/lib/sector-store";

type EditSectorProps = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: EditSectorProps): Promise<Metadata> {
  const { key } = await params;
  return { title: key };
}

export default async function EditSectorPage({ params }: EditSectorProps) {
  const { key } = await params;
  await requireAdmin(`/admin/sectors/${key}`);
  const sector = await readSector(key);
  if (!sector) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/admin/sectors"
        className="text-sm font-medium text-pine underline-offset-4 hover:underline"
      >
        All sectors
      </Link>
      <h1 className="mt-3 font-display text-5xl">{sector.name}</h1>
      <SectorEditor mode="edit" initial={sector} />
    </div>
  );
}
