import { NextResponse } from "next/server";
import { sectorInputSchema, sectorIssues } from "@/lib/sector-input";
import { readSector, removeSector, writeSector } from "@/lib/sector-store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type SectorContext = { params: Promise<{ key: string }> };

async function adminGuard(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only an admin can change the catalog." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(
  _request: Request,
  context: SectorContext,
): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const { key } = await context.params;
  const sector = await readSector(key);
  if (!sector) {
    return NextResponse.json({ error: "That sector was not found." }, { status: 404 });
  }
  return NextResponse.json(sector);
}

export async function PUT(
  request: Request,
  context: SectorContext,
): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const { key } = await context.params;
  const parsed = sectorInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form.", issues: sectorIssues(parsed.error) },
      { status: 400 },
    );
  }
  if (parsed.data.key !== key) {
    return NextResponse.json({ error: "The sector key cannot change." }, { status: 400 });
  }
  const result = await writeSector(parsed.data, "update");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ key });
}

export async function DELETE(
  _request: Request,
  context: SectorContext,
): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const { key } = await context.params;
  const result = await removeSector(key);
  if (result === "missing") {
    return NextResponse.json({ error: "That sector was not found." }, { status: 404 });
  }
  if (result === "in-use") {
    return NextResponse.json(
      {
        error:
          "This sector is still used by a workflow, an analyst, or a protocol. Mark it inactive instead.",
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ key });
}
