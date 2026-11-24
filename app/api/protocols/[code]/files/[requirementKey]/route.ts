import { NextResponse } from "next/server";
import { readReviewerFile } from "@/lib/desk-store";
import { readOwnedFile } from "@/lib/filing-store";
import { createFileStore } from "@/lib/storage";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type FileRouteContext = {
  params: Promise<{ code: string; requirementKey: string }>;
};

export async function GET(
  request: Request,
  context: FileRouteContext,
): Promise<NextResponse> {
  const { code, requirementKey } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    const nextPath = `/api/protocols/${code}/files/${requirementKey}`;
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(nextPath)}`, request.url),
      303,
    );
  }

  const file =
    (await readOwnedFile({
      userId: user.id,
      code,
      requirementKey,
    })) ?? (await readReviewerFile({ user, code, requirementKey }));
  if (!file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const bytes = await createFileStore().read(file.storageKey);
  if (!bytes) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": file.mediaType,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
