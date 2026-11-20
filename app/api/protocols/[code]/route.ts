import { NextResponse } from "next/server";
import { getPublicProtocol } from "@/lib/queries";

type ProtocolRouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(
  _request: Request,
  context: ProtocolRouteContext,
): Promise<NextResponse> {
  const { code } = await context.params;
  try {
    const protocol = await getPublicProtocol(code);
    if (!protocol) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(protocol);
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
