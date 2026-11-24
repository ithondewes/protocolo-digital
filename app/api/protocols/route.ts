import { NextResponse } from "next/server";
import { readSubmission } from "@/lib/filing-request";
import { submitProtocol } from "@/lib/filing-store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Send the form as multipart data." },
      { status: 400 },
    );
  }

  const submission = await readSubmission(formData);
  if (submission.issues.length > 0) {
    return NextResponse.json(
      { error: "Check the form.", issues: submission.issues },
      { status: 400 },
    );
  }

  const result = await submitProtocol({
    user,
    typeKey: submission.typeKey,
    answers: submission.answers,
    files: submission.files,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, issues: result.issues ?? [] },
      { status: result.status },
    );
  }
  return NextResponse.json({ code: result.code }, { status: 201 });
}
