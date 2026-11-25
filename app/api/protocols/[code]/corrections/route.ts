import { NextResponse } from "next/server";
import { resubmitCorrections } from "@/lib/desk-store";
import { readSubmission } from "@/lib/filing-request";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type CorrectionContext = { params: Promise<{ code: string }> };

export async function POST(
  request: Request,
  context: CorrectionContext,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { code } = await context.params;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Send the form as multipart data." },
      { status: 400 },
    );
  }
  formData.set("typeKey", "correction");
  const submission = await readSubmission(formData);
  const issues = submission.issues.filter((issue) => issue.path !== "typeKey");
  if (issues.length > 0) {
    return NextResponse.json({ error: "Check the form.", issues }, { status: 400 });
  }
  const result = await resubmitCorrections({
    code,
    user,
    answers: submission.answers,
    files: submission.files,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, issues: result.issues ?? [] },
      { status: result.status },
    );
  }
  return NextResponse.json({ code });
}
