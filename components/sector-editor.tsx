"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Issue = { path: string; message: string };

export function SectorEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: {
    key: string;
    name: string;
    summary: string;
    order: number;
    active: boolean;
  };
}) {
  const router = useRouter();
  const [key, setKey] = useState(initial.key);
  const [name, setName] = useState(initial.name);
  const [summary, setSummary] = useState(initial.summary);
  const [order, setOrder] = useState(String(initial.order));
  const [active, setActive] = useState(initial.active);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [saving, setSaving] = useState(false);
  const fieldClass =
    "mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2 text-sm";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setIssues([]);
    const payload = {
      key: key.trim(),
      name: name.trim(),
      summary: summary.trim(),
      order: Number(order),
      active,
    };
    const response = await fetch(
      mode === "create" ? "/api/admin/sectors" : `/api/admin/sectors/${initial.key}`,
      {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: Issue[];
      key?: string;
    } | null;
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "The sector could not be saved.");
      setIssues(body?.issues ?? []);
      return;
    }
    router.push("/admin/sectors");
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm("Remove this sector from the catalog?")) {
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/admin/sectors/${initial.key}`, {
      method: "DELETE",
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "The sector could not be removed.");
      return;
    }
    router.push("/admin/sectors");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4 rounded-3xl border border-sand bg-card p-5"
    >
      {error ? (
        <div
          role="alert"
          className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay"
        >
          <p>{error}</p>
          {issues.length > 0 ? (
            <ul className="mt-2 list-disc pl-5">
              {issues.map((issue) => (
                <li key={`${issue.path}:${issue.message}`}>
                  {issue.path ? `${issue.path}: ` : null}
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <label className="block text-sm font-medium">
        Key
        <input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          readOnly={mode === "edit"}
          required
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Summary
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
          rows={3}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Display order
        <input
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          inputMode="numeric"
          required
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Active
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save sector"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="rounded-full border border-copper px-5 py-3 text-sm font-semibold text-copper"
          >
            Remove sector
          </button>
        ) : null}
      </div>
    </form>
  );
}
