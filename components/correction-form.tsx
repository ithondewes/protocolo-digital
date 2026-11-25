"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { DocumentRequirement, FormField, FormSection } from "@/lib/domain";
import { UPLOAD_ACCEPT, UPLOAD_HINT } from "@/lib/uploads";

type Issue = { path: string; message: string };
type Values = Record<string, Record<string, string | boolean>>;

export function CorrectionForm({
  code,
  sections,
  documents,
  initial,
  editableSections,
  editableDocuments,
  comments,
}: {
  code: string;
  sections: FormSection[];
  documents: DocumentRequirement[];
  initial: Values;
  editableSections: string[];
  editableDocuments: string[];
  comments: { key: string; label: string; comment: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editable = new Set(editableSections);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    setIssues([]);
    const body = new FormData();
    body.set("answers", JSON.stringify(values));
    for (const document of documents) {
      const file = files[document.key];
      if (file) {
        body.set(`document.${document.key}`, file);
      }
    }
    try {
      const response = await fetch(`/api/protocols/${code}/corrections`, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        issues?: Issue[];
      } | null;
      if (!response.ok) {
        setIssues(payload?.issues ?? []);
        setError(
          payload?.issues?.length
            ? null
            : (payload?.error ?? "Could not send the corrections."),
        );
        setPending(false);
        return;
      }
      router.push(`/file/sent/${code}`);
      router.refresh();
    } catch {
      setError("Could not send the corrections.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error || issues.length > 0 ? (
        <div
          role="alert"
          className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay"
        >
          <p>{issues.length > 0 ? "Check the form." : error}</p>
          {issues.length > 0 ? (
            <ul className="mt-2 list-disc pl-5">
              {issues.map((issue) => (
                <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {comments.length > 0 ? (
        <section className="rounded-3xl border border-copper/40 bg-clay-soft/40 p-5">
          <h2 className="font-display text-2xl">Requested corrections</h2>
          <ul className="mt-3 space-y-3">
            {comments.map((item) => (
              <li key={item.key}>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted">{item.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map((section) => {
        const open = editable.has(section.key);
        return (
          <fieldset
            key={section.key}
            className="rounded-3xl border border-sand bg-card p-5"
          >
            <legend className="px-1 font-display text-2xl">{section.title}</legend>
            {!open ? (
              <p className="mt-2 text-sm text-muted">No change requested.</p>
            ) : null}
            <div className="mt-4 space-y-4">
              {section.fields.map((field) => (
                <CorrectionField
                  key={field.key}
                  field={field}
                  disabled={!open}
                  value={values[section.key]?.[field.key] ?? ""}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      [section.key]: { ...current[section.key], [field.key]: value },
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="rounded-3xl border border-sand bg-card p-5">
        <legend className="px-1 font-display text-2xl">Documents</legend>
        <p className="mt-2 text-sm text-muted">{UPLOAD_HINT}</p>
        <div className="mt-4 space-y-4">
          {documents.map((document) => {
            const open = editableDocuments.includes(document.key);
            return (
              <div key={document.key}>
                <p className="text-sm font-medium">{document.label}</p>
                <p className="text-sm text-muted">
                  {open
                    ? "Replace this file if you have a new copy."
                    : "No change requested."}
                </p>
                {open ? (
                  <input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    className="mt-2 block w-full text-sm"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setFiles((current) => ({ ...current, [document.key]: file }));
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send corrections"}
      </button>
    </form>
  );
}

function CorrectionField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string | boolean;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  const id = `field-${field.key}`;
  if (field.kind === "boolean") {
    const checked = value === true || value === "true";
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.kind === "select") {
    return (
      <label htmlFor={id} className="block text-sm font-medium">
        {field.label}
        <select
          id={id}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2"
        >
          <option value="">Choose</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const text = typeof value === "string" ? value : "";
  const shared = {
    id,
    disabled,
    value: text,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    className: "mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2",
  };
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {field.label}
      {field.kind === "textarea" ? (
        <textarea {...shared} rows={4} />
      ) : (
        <input
          {...shared}
          type={
            field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"
          }
        />
      )}
    </label>
  );
}
