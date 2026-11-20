import { NextResponse } from "next/server";
import { issuesFrom, protocolTypeInputSchema } from "@/lib/protocol-type-input";
import {
  readProtocolTypeInput,
  removeProtocolType,
  writeProtocolType,
} from "@/lib/protocol-type-store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ key: string }> };

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
  context: RouteContext,
): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const { key } = await context.params;
  const service = await readProtocolTypeInput(key);
  if (!service) {
    return NextResponse.json({ error: "That service was not found." }, { status: 404 });
  }
  return NextResponse.json(service);
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const { key } = await context.params;
  const parsed = protocolTypeInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form.", issues: issuesFrom(parsed.error) },
      { status: 400 },
    );
  }
  if (parsed.data.key !== key) {
    return NextResponse.json(
      { error: "The service key cannot change." },
      { status: 400 },
    );
  }
  const result = await writeProtocolType(parsed.data, "update");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ key });
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) {
    return denied;
  }
  const { key } = await context.params;
  const result = await removeProtocolType(key);
  if (result === "missing") {
    return NextResponse.json({ error: "That service was not found." }, { status: 404 });
  }
  if (result === "in-use") {
    return NextResponse.json(
      { error: "Protocols still use this service. Mark it inactive instead." },
      { status: 409 },
    );
  }
  return NextResponse.json({ key });
}
