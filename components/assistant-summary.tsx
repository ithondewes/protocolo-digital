"use client";

import { useState } from "react";

export function AssistantSummary({ code, enabled }: { code: string; enabled: boolean }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function summarize() {
    if (!enabled || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/desk/${code}/summary`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        summary?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.summary) {
        setError(body?.error ?? "The assistant could not summarize this protocol.");
        setPending(false);
        return;
      }
      setSummary(body.summary);
      setPending(false);
    } catch {
      setError("The assistant could not summarize this protocol.");
      setPending(false);
    }
  }

  return (
    <section
      className="rounded-3xl border border-sand bg-card p-5"
      aria-labelledby="assistant-heading"
    >
      <h2 id="assistant-heading" className="font-display text-3xl">
        Analyst assistant
      </h2>
      <p className="mt-2 text-sm text-muted">
        A summary for the reviewer. It does not approve, reject, or request corrections.
      </p>
      {enabled ? (
        <button
          type="button"
          onClick={summarize}
          disabled={pending}
          className="mt-4 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Summarizing…" : "Summarize this protocol"}
        </button>
      ) : (
        <p className="mt-4 text-sm text-muted">
          The assistant is off. Set ANALYST_ASSISTANT_URL and ANALYST_ASSISTANT_API_KEY to
          turn it on.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay">
          {error}
        </p>
      ) : null}
      {summary ? (
        <p className="mt-4 whitespace-pre-wrap text-sm" aria-live="polite">
          {summary}
        </p>
      ) : null}
    </section>
  );
}
