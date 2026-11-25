import { connectDb } from "@/lib/db";
import type { SectorInput } from "@/lib/sector-input";
import { Protocol } from "@/models/Protocol";
import { Sector } from "@/models/Sector";
import { User } from "@/models/User";
import { Workflow } from "@/models/Workflow";

export type SectorRow = SectorInput;

export async function listSectors(): Promise<SectorRow[]> {
  await connectDb();
  const sectors = await Sector.find().sort({ order: 1, name: 1 }).lean();
  return sectors.map((sector) => ({
    key: sector.key,
    name: sector.name,
    summary: sector.summary,
    order: sector.order,
    active: sector.active,
  }));
}

export async function readSector(key: string): Promise<SectorRow | null> {
  await connectDb();
  const sector = await Sector.findOne({ key }).lean();
  if (!sector) {
    return null;
  }
  return {
    key: sector.key,
    name: sector.name,
    summary: sector.summary,
    order: sector.order,
    active: sector.active,
  };
}

export async function writeSector(
  input: SectorInput,
  mode: "create" | "update",
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  await connectDb();
  if (mode === "create") {
    const existing = await Sector.findOne({ key: input.key }).lean();
    if (existing) {
      return { ok: false, status: 409, error: "A sector with this key already exists." };
    }
    await Sector.create(input);
    return { ok: true };
  }
  const updated = await Sector.findOneAndUpdate({ key: input.key }, input);
  if (!updated) {
    return { ok: false, status: 404, error: "That sector was not found." };
  }
  return { ok: true };
}

export async function removeSector(
  key: string,
): Promise<"removed" | "missing" | "in-use"> {
  await connectDb();
  const [protocols, workflows, analysts] = await Promise.all([
    Protocol.countDocuments({ currentSectorKey: key }),
    Workflow.countDocuments({ "stages.sectorKey": key }),
    User.countDocuments({ sectorKeys: key }),
  ]);
  if (protocols > 0 || workflows > 0 || analysts > 0) {
    return "in-use";
  }
  const deleted = await Sector.findOneAndDelete({ key });
  return deleted ? "removed" : "missing";
}
