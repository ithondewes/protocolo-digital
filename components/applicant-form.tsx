"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { FormField } from "@/lib/domain";
import type { FilingFormView } from "@/lib/filing";
import { parseAnswers } from "@/lib/form-schema";
import { UPLOAD_ACCEPT, UPLOAD_HINT, documentIssues, inspectUpload } from "@/lib/uploads";

type Issue = { path: string; message: string };
type Values = Record<string, Record<string, string | boolean>>;

const fieldClass = "mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2";

function blankValues(form: FilingFormView): Values {
  const values: Values = {};
  for (const section of form.sections) {
    values[section.key] = {};
    for (const field of section.fields) {
      values[section.key][field.key] = "";
    }
  }
  return values;
}

function messageFor(issues: Issue[], path: string): string | undefined {
  return issues.find((issue) => issue.path === path)?.message;
}

function labelFor(form: FilingFormView, path: string): string {
  const [sectionKey, fieldKey] = path.split(".");
  if (sectionKey === "documents") {
    return form.documents.find((document) => document.key === fieldKey)?.label ?? path;
  }
  const section = form.sections.find((item) => item.key === sectionKey);
  return section?.fields.find((field) => field.key === fieldKey)?.label ?? path;
}

export function ApplicantForm({ form }: { form: FilingFormView }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => blankValues(form));
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function clearIssue(path: string) {
    setIssues((current) => current.filter((issue) => issue.path !== path));
  }

  function setValue(sectionKey: string, fieldKey: string, value: string | boolean) {
    setValues((current) => ({
      ...current,
      [sectionKey]: { ...current[sectionKey], [fieldKey]: value },
    }));
    clearIssue(`${sectionKey}.${fieldKey}`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);

    const nextIssues: Issue[] = [];
    const parsed = parseAnswers({ sections: form.sections }, values);
    if (!parsed.ok) {
      nextIssues.push(...parsed.issues);
    }

    const uploadedKeys = form.documents.flatMap((document) =>
      files[document.key] ? [document.key] : [],
    );
    nextIssues.push(...documentIssues(form.documents, uploadedKeys));

    for (const document of form.documents) {
      const file = files[document.key];
      if (!file) {
        continue;
      }
      const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const inspected = inspectUpload({
        fileName: file.name,
        byteLength: file.size,
        header,
      });
      if (!inspected.ok) {
        nextIssues.push({
          path: `documents.${document.key}`,
          message: inspected.message,
        });
      }
    }

    if (nextIssues.length > 0) {
      setIssues(nextIssues);
      setError(null);
      setPending(false);
      return;
    }
    setIssues([]);

    const body = new FormData();
    body.set("typeKey", form.key);
    body.set("answers", JSON.stringify(values));
    for (const document of form.documents) {
      const file = files[document.key];
      if (file) {
        body.set(`document.${document.key}`, file);
      }
    }

    try {
      const response = await fetch("/api/protocols", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        error?: string;
        issues?: Issue[];
      } | null;
      if (!response.ok || !payload?.code) {
        const serverIssues = payload?.issues ?? [];
        setIssues(serverIssues);
        setError(
          serverIssues.length > 0
            ? null
            : (payload?.error ?? "The protocol could not be filed."),
        );
        setPending(false);
        return;
      }
      router.push(`/file/sent/${payload.code}`);
      router.refresh();
    } catch {
      setError("The protocol could not be filed. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <nav aria-label="Form sections">
        <ol className="flex flex-wrap gap-2">
          {form.sections.map((section, index) => (
            <li key={section.key}>
              <a
                href={`#${section.key}`}
                className="inline-flex rounded-full bg-sand px-3 py-1 text-sm text-ink"
              >
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#documents"
              className="inline-flex rounded-full bg-sand px-3 py-1 text-sm text-ink"
            >
              {form.sections.length + 1}. Documents
            </a>
          </li>
        </ol>
      </nav>

      {issues.length > 0 || error ? (
        <div
          role="alert"
          className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay"
        >
          <p>{issues.length > 0 ? "Check the form." : error}</p>
          {issues.length > 0 ? (
            <ul className="mt-2 list-disc pl-5">
              {issues.map((issue) => (
                <li key={`${issue.path}:${issue.message}`}>
                  {labelFor(form, issue.path)}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {form.sections.map((section) => (
        <fieldset
          key={section.key}
          id={section.key}
          className="rounded-3xl border border-sand bg-card p-5"
        >
          <legend className="px-1 font-display text-3xl">{section.title}</legend>
          {section.description ? (
            <p className="mt-2 text-sm text-muted">{section.description}</p>
          ) : null}
          <div className="mt-4 space-y-4">
            {section.fields.map((field) => (
              <FieldControl
                key={field.key}
                sectionKey={section.key}
                field={field}
                value={values[section.key]?.[field.key] ?? ""}
                message={messageFor(issues, `${section.key}.${field.key}`)}
                onChange={(value) => setValue(section.key, field.key, value)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset id="documents" className="rounded-3xl border border-sand bg-card p-5">
        <legend className="px-1 font-display text-3xl">Documents</legend>
        <p className="mt-2 text-sm text-muted">{UPLOAD_HINT}</p>
        <div className="mt-4 space-y-4">
          {form.documents.map((document) => {
            const message = messageFor(issues, `documents.${document.key}`);
            const inputId = `document-${document.key}`;
            return (
              <div key={document.key}>
                <label htmlFor={inputId} className="text-sm font-medium">
                  {document.label}
                  {document.required ? (
                    <span className="text-copper"> · required</span>
                  ) : null}
                </label>
                <p className="mt-1 text-sm text-muted">{document.detail}</p>
                <input
                  id={inputId}
                  name={`document.${document.key}`}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  aria-invalid={message ? true : undefined}
                  aria-describedby={message ? `${inputId}-error` : undefined}
                  className="mt-2 block w-full text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setFiles((current) => ({ ...current, [document.key]: file }));
                    clearIssue(`documents.${document.key}`);
                  }}
                />
                {files[document.key] ? (
                  <p className="mt-1 text-sm text-muted">{files[document.key]?.name}</p>
                ) : null}
                {message ? (
                  <p id={`${inputId}-error`} className="mt-1 text-sm text-clay">
                    {message}
                  </p>
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
        {pending ? "Filing…" : "File protocol"}
      </button>
    </form>
  );
}

function FieldControl({
  sectionKey,
  field,
  value,
  message,
  onChange,
}: {
  sectionKey: string;
  field: FormField;
  value: string | boolean;
  message: string | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const id = `${sectionKey}-${field.key}`;
  const helpId = field.help ? `${id}-help` : undefined;
  const errorId = message ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const text = typeof value === "string" ? value : "";

  return (
    <div>
      {field.kind === "boolean" ? (
        <div
          role="radiogroup"
          aria-labelledby={`${id}-label`}
          aria-describedby={describedBy}
          aria-invalid={message ? true : undefined}
          aria-required={field.required || undefined}
          className="space-y-2"
        >
          <p id={`${id}-label`} className="text-sm font-medium">
            {field.label}
            {field.required ? <span className="text-copper"> · required</span> : null}
          </p>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2" htmlFor={`${id}-yes`}>
              <input
                id={`${id}-yes`}
                type="radio"
                name={`${sectionKey}.${field.key}`}
                checked={value === true}
                onChange={() => onChange(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2" htmlFor={`${id}-no`}>
              <input
                id={`${id}-no`}
                type="radio"
                name={`${sectionKey}.${field.key}`}
                checked={value === false}
                onChange={() => onChange(false)}
              />
              No
            </label>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required ? <span className="text-copper"> · required</span> : null}
        </label>
      )}
      {field.help ? (
        <p id={helpId} className="mt-1 text-sm text-muted">
          {field.help}
        </p>
      ) : null}
      {field.kind === "textarea" ? (
        <textarea
          id={id}
          name={`${sectionKey}.${field.key}`}
          value={text}
          rows={4}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          className={fieldClass}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
      {field.kind === "text" || field.kind === "number" || field.kind === "date" ? (
        <input
          id={id}
          name={`${sectionKey}.${field.key}`}
          type={field.kind === "text" ? "text" : field.kind}
          value={text}
          inputMode={field.kind === "number" ? "decimal" : undefined}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          className={fieldClass}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
      {field.kind === "select" ? (
        <select
          id={id}
          name={`${sectionKey}.${field.key}`}
          value={text}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          className={fieldClass}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
      {message ? (
        <p id={errorId} className="mt-1 text-sm text-clay">
          {message}
        </p>
      ) : null}
    </div>
  );
}
