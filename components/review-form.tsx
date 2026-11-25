"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ItemDecision } from "@/lib/review-flow";

type Target = {
  kind: "section" | "document";
  key: string;
  label: string;
  body: string;
  stored: boolean;
  decision: ItemDecision;
  comment: string;
};

export function ReviewForm({
  code,
  targets,
  nextSectorName,
}: {
  code: string;
  targets: Target[];
  nextSectorName: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(targets);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(key: string, kind: Target["kind"], patch: Partial<Target>) {
    setItems((current) =>
      current.map((item) =>
        item.key === key && item.kind === kind ? { ...item, ...patch } : item,
      ),
    );
  }

  async function send(
    action: "save" | "request_corrections" | "advance" | "approve" | "reject",
  ) {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    const payload =
      action === "reject"
        ? { action, note }
        : {
            action,
            items: items.map((item) => ({
              kind: item.kind,
              key: item.key,
              decision: item.decision,
              comment: item.comment,
            })),
          };
    try {
      const response = await fetch(`/api/desk/${code}/review`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "The review could not be saved.");
        setPending(false);
        return;
      }
      router.refresh();
      setPending(false);
    } catch {
      setError("The review could not be saved.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">
          {error}
        </p>
      ) : null}
      {items.map((item) => (
        <fieldset
          key={`${item.kind}:${item.key}`}
          className="rounded-3xl border border-sand bg-card p-5"
        >
          <legend className="px-1 font-display text-2xl">{item.label}</legend>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
            {item.kind === "document" ? "Document" : "Section"}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{item.body}</p>
          {item.kind === "document" && item.stored ? (
            <p className="mt-2 text-sm">
              <a
                href={`/api/protocols/${code}/files/${item.key}`}
                className="font-medium text-pine underline-offset-4 hover:underline"
              >
                Download file
              </a>
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${item.kind}-${item.key}`}
                checked={item.decision === "cleared"}
                onChange={() => update(item.key, item.kind, { decision: "cleared" })}
              />
              Approve
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${item.kind}-${item.key}`}
                checked={item.decision === "changes_requested"}
                onChange={() =>
                  update(item.key, item.kind, { decision: "changes_requested" })
                }
              />
              Request correction
            </label>
          </div>
          <label className="mt-3 block text-sm font-medium">
            Comment
            <textarea
              value={item.comment}
              rows={3}
              onChange={(event) =>
                update(item.key, item.kind, { comment: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2"
            />
          </label>
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => send("save")}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Save notes
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => send("request_corrections")}
          className="rounded-full border border-copper px-4 py-2 text-sm font-semibold text-copper"
        >
          Send back for corrections
        </button>
        {nextSectorName ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => send("advance")}
            className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper"
          >
            Send to {nextSectorName}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => send("approve")}
            className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper"
          >
            Issue approval
          </button>
        )}
      </div>

      <fieldset className="rounded-3xl border border-sand p-5">
        <legend className="px-1 text-sm font-semibold">Reject the protocol</legend>
        <label className="mt-2 block text-sm font-medium">
          Note
          <textarea
            value={note}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => send("reject")}
          className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
        >
          Reject
        </button>
      </fieldset>
    </div>
  );
}
