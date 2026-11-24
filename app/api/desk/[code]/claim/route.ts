import { NextResponse } from "next/server";
import { claimProtocol } from "@/lib/desk-store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type ClaimContext = { params: Promise<{ code: string }> };

export async function POST(
  request: Request,
  context: ClaimContext,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { code } = await context.params;
  const result = await claimProtocol(code, user);
  if (!result.ok) {
    const accepts = request.headers.get("accept") ?? "";
    if (accepts.includes("application/json")) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.redirect(
      new URL(`/desk/${code}?error=${encodeURIComponent(result.error)}`, request.url),
      303,
    );
  }
  const accepts = request.headers.get("accept") ?? "";
  if (accepts.includes("application/json")) {
    return NextResponse.json({ code });
  }
  return NextResponse.redirect(new URL(`/desk/${code}`, request.url), 303);
}
