import { NextResponse } from "next/server";
import { actOnProtocol } from "@/lib/desk-store";
import { issuesFrom, reviewActionSchema } from "@/lib/review-input";
import type { DeskAction, ReviewItem } from "@/lib/review-flow";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type ReviewContext = { params: Promise<{ code: string }> };

export async function POST(
  request: Request,
  context: ReviewContext,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { code } = await context.params;
  const parsed = reviewActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the review.", issues: issuesFrom(parsed.error) },
      { status: 400 },
    );
  }

  const items: ReviewItem[] =
    parsed.data.action === "reject"
      ? []
      : parsed.data.items.map((item) => ({
          target: { kind: item.kind, key: item.key },
          decision: item.decision,
          comment: item.comment,
        }));
  const action: DeskAction | { type: "save" } =
    parsed.data.action === "reject"
      ? { type: "reject", note: parsed.data.note }
      : { type: parsed.data.action };

  const result = await actOnProtocol({ code, user, action, items });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, issues: result.issues ?? [] },
      { status: result.status },
    );
  }
  return NextResponse.json({ code });
}
