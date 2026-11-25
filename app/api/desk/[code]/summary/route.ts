import { NextResponse } from "next/server";
import { assistantConfig, summarizeProtocol } from "@/lib/assistant";
import { readDeskCase } from "@/lib/desk-store";
import { STATUS_LABEL } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type SummaryContext = { params: Promise<{ code: string }> };

export async function POST(
  _request: Request,
  context: SummaryContext,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "analyst" && user.role !== "admin")) {
    return NextResponse.json({ error: "Sign in as an analyst." }, { status: 401 });
  }
  const config = assistantConfig();
  if (!config) {
    return NextResponse.json({ error: "The analyst assistant is off." }, { status: 409 });
  }
  const { code } = await context.params;
  const deskCase = await readDeskCase(code, user);
  if (!deskCase) {
    return NextResponse.json(
      { error: "That protocol is not in your inbox." },
      { status: 404 },
    );
  }
  try {
    const summary = await summarizeProtocol(
      {
        code: deskCase.code,
        serviceName: deskCase.serviceName,
        statusLabel: STATUS_LABEL[deskCase.status],
        currentSector: deskCase.currentSectorName,
        route: deskCase.stages.map((stage) => stage.sectorName),
        sections: deskCase.targets
          .filter((target) => target.kind === "section")
          .map((target) => ({ title: target.label, text: target.body })),
        documents: deskCase.targets
          .filter((target) => target.kind === "document")
          .map((target) => ({
            label: target.label,
            fileName: target.body.startsWith("File on record: ")
              ? target.body.slice("File on record: ".length)
              : null,
          })),
        openCorrections: deskCase.targets
          .filter(
            (target) => target.decision === "changes_requested" && target.comment.trim(),
          )
          .map((target) => ({ label: target.label, comment: target.comment })),
      },
      config,
    );
    return NextResponse.json({ summary });
  } catch (error) {
    console.error(
      "Assistant summary failed",
      error instanceof Error ? error.name : "Error",
    );
    return NextResponse.json(
      { error: "The analyst assistant could not summarize this protocol." },
      { status: 502 },
    );
  }
}
