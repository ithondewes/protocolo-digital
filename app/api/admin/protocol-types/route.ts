import { NextResponse } from "next/server";
import { issuesFrom, protocolTypeInputSchema } from "@/lib/protocol-type-input";
import { listProtocolTypeSummaries, writeProtocolType } from "@/lib/protocol-type-store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

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

export async function GET(): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const services = await listProtocolTypeSummaries();
  return NextResponse.json({ services });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const parsed = protocolTypeInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form.", issues: issuesFrom(parsed.error) },
      { status: 400 },
    );
  }
  const result = await writeProtocolType(parsed.data, "create");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ key: parsed.data.key }, { status: 201 });
}
