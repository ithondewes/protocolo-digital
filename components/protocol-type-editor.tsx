"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FIELD_KINDS, type FieldKind } from "@/lib/domain";

type Choice = { key: string; name: string };

type FieldDraft = {
  id: string;
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  help: string;
  options: string;
};

type SectionDraft = {
  id: string;
  key: string;
  title: string;
  description: string;
  fields: FieldDraft[];
};

type DocumentDraft = {
  id: string;
  key: string;
  label: string;
  detail: string;
  required: boolean;
};

export type ProtocolTypeDraft = {
  key: string;
  name: string;
  summary: string;
  catalogSectorKey: string;
  workflowKey: string;
  active: boolean;
  sections: {
    key: string;
    title: string;
    description: string;
    fields: {
      key: string;
      label: string;
      kind: FieldKind;
      required: boolean;
      help: string;
      options: string;
    }[];
  }[];
  documents: {
    key: string;
    label: string;
    detail: string;
    required: boolean;
  }[];
};

type Issue = { path: string; message: string };

const fieldClass = "mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2 text-sm";

function blankField(): FieldDraft {
  return {
    id: crypto.randomUUID(),
    key: "",
    label: "",
    kind: "text",
    required: true,
    help: "",
    options: "",
  };
}

function withIds(initial: ProtocolTypeDraft): {
  sections: SectionDraft[];
  documents: DocumentDraft[];
} {
  return {
    sections: initial.sections.map((section) => ({
      id: crypto.randomUUID(),
      key: section.key,
      title: section.title,
      description: section.description,
      fields: section.fields.map((field) => ({ ...field, id: crypto.randomUUID() })),
    })),
    documents: initial.documents.map((document) => ({
      ...document,
      id: crypto.randomUUID(),
    })),
  };
}

export function ProtocolTypeEditor({
  mode,
  initial,
  sectors,
  workflows,
}: {
  mode: "create" | "edit";
  initial: ProtocolTypeDraft;
  sectors: Choice[];
  workflows: Choice[];
}) {
  const router = useRouter();
  const seeded = withIds(initial);
  const [key, setKey] = useState(initial.key);
  const [name, setName] = useState(initial.name);
  const [summary, setSummary] = useState(initial.summary);
  const [catalogSectorKey, setCatalogSectorKey] = useState(initial.catalogSectorKey);
  const [workflowKey, setWorkflowKey] = useState(initial.workflowKey);
  const [active, setActive] = useState(initial.active);
  const [sections, setSections] = useState(seeded.sections);
  const [documents, setDocuments] = useState(seeded.documents);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [saving, setSaving] = useState(false);

  function updateSection(id: string, patch: Partial<SectionDraft>) {
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    );
  }

  function updateField(sectionId: string, fieldId: string, patch: Partial<FieldDraft>) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, ...patch } : field,
              ),
            }
          : section,
      ),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setIssues([]);
    const payload = {
      key: key.trim(),
      name: name.trim(),
      summary: summary.trim(),
      catalogSectorKey,
      workflowKey,
      active,
      formSchema: {
        sections: sections.map((section) => ({
          key: section.key.trim(),
          title: section.title.trim(),
          description: section.description.trim() || undefined,
          fields: section.fields.map((field) => ({
            key: field.key.trim(),
            label: field.label.trim(),
            kind: field.kind,
            required: field.required,
            help: field.help.trim() || undefined,
            options:
              field.kind === "select"
                ? field.options
                    .split(",")
                    .map((option) => option.trim())
                    .filter((option) => option.length > 0)
                : undefined,
          })),
        })),
      },
      documents: documents.map((document) => ({
        key: document.key.trim(),
        label: document.label.trim(),
        detail: document.detail.trim(),
        required: document.required,
      })),
    };

    const response = await fetch(
      mode === "create"
        ? "/api/admin/protocol-types"
        : `/api/admin/protocol-types/${initial.key}`,
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
      setError(body?.error ?? "The catalog could not be saved.");
      setIssues(body?.issues ?? []);
      return;
    }
    router.push(`/admin/protocol-types/${body?.key ?? payload.key}`);
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm("Remove this service from the catalog?")) {
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/admin/protocol-types/${initial.key}`, {
      method: "DELETE",
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "The service could not be removed.");
      return;
    }
    router.push("/admin/protocol-types");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8">
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

      <section className="grid gap-4 rounded-3xl border border-sand bg-card p-5 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Key
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            readOnly={mode === "edit"}
            required
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Summary
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
            rows={3}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Published by
          <select
            value={catalogSectorKey}
            onChange={(event) => setCatalogSectorKey(event.target.value)}
            className={fieldClass}
          >
            {sectors.map((sector) => (
              <option key={sector.key} value={sector.key}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Workflow
          <select
            value={workflowKey}
            onChange={(event) => setWorkflowKey(event.target.value)}
            className={fieldClass}
          >
            {workflows.map((workflow) => (
              <option key={workflow.key} value={workflow.key}>
                {workflow.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active in the catalog
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl">Form</h2>
          <button
            type="button"
            className="rounded-full border border-sand px-4 py-2 text-sm"
            onClick={() =>
              setSections((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  key: "",
                  title: "",
                  description: "",
                  fields: [blankField()],
                },
              ])
            }
          >
            Add section
          </button>
        </div>
        {sections.map((section, sectionIndex) => (
          <fieldset
            key={section.id}
            className="space-y-4 rounded-3xl border border-sand bg-card p-5"
          >
            <legend className="px-1 text-sm font-semibold">
              Section {sectionIndex + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Section key
                <input
                  value={section.key}
                  onChange={(event) =>
                    updateSection(section.id, { key: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-sm font-medium">
                Title
                <input
                  value={section.title}
                  onChange={(event) =>
                    updateSection(section.id, { title: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Description
                <input
                  value={section.description}
                  onChange={(event) =>
                    updateSection(section.id, { description: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            {section.fields.map((field) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-2xl bg-paper p-3 sm:grid-cols-2"
              >
                <label className="text-sm font-medium">
                  Field key
                  <input
                    value={field.key}
                    onChange={(event) =>
                      updateField(section.id, field.id, { key: event.target.value })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm font-medium">
                  Label
                  <input
                    value={field.label}
                    onChange={(event) =>
                      updateField(section.id, field.id, { label: event.target.value })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm font-medium">
                  Kind
                  <select
                    value={field.kind}
                    onChange={(event) =>
                      updateField(section.id, field.id, {
                        kind: event.target.value as FieldKind,
                      })
                    }
                    className={fieldClass}
                  >
                    {FIELD_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(section.id, field.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  Required
                </label>
                {field.kind === "select" ? (
                  <label className="text-sm font-medium sm:col-span-2">
                    Options, separated by commas
                    <input
                      value={field.options}
                      onChange={(event) =>
                        updateField(section.id, field.id, { options: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                ) : null}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="text-sm text-copper underline-offset-4 hover:underline"
                    onClick={() =>
                      updateSection(section.id, {
                        fields: section.fields.filter((item) => item.id !== field.id),
                      })
                    }
                  >
                    Remove field
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="text-sm font-medium text-pine underline-offset-4 hover:underline"
                onClick={() =>
                  updateSection(section.id, { fields: [...section.fields, blankField()] })
                }
              >
                Add field
              </button>
              <button
                type="button"
                className="text-sm text-copper underline-offset-4 hover:underline"
                onClick={() =>
                  setSections((current) =>
                    current.filter((item) => item.id !== section.id),
                  )
                }
              >
                Remove section
              </button>
            </div>
          </fieldset>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl">Required documents</h2>
          <button
            type="button"
            className="rounded-full border border-sand px-4 py-2 text-sm"
            onClick={() =>
              setDocuments((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  key: "",
                  label: "",
                  detail: "",
                  required: true,
                },
              ])
            }
          >
            Add document
          </button>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-muted">
            No documents yet. Add one if the service needs a file.
          </p>
        ) : null}
        {documents.map((document) => (
          <div
            key={document.id}
            className="grid gap-3 rounded-3xl border border-sand bg-card p-5"
          >
            <label className="text-sm font-medium">
              Document key
              <input
                value={document.key}
                onChange={(event) =>
                  setDocuments((current) =>
                    current.map((item) =>
                      item.id === document.id
                        ? { ...item, key: event.target.value }
                        : item,
                    ),
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Label
              <input
                value={document.label}
                onChange={(event) =>
                  setDocuments((current) =>
                    current.map((item) =>
                      item.id === document.id
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Detail
              <input
                value={document.detail}
                onChange={(event) =>
                  setDocuments((current) =>
                    current.map((item) =>
                      item.id === document.id
                        ? { ...item, detail: event.target.value }
                        : item,
                    ),
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={document.required}
                onChange={(event) =>
                  setDocuments((current) =>
                    current.map((item) =>
                      item.id === document.id
                        ? { ...item, required: event.target.checked }
                        : item,
                    ),
                  )
                }
              />
              Required before filing
            </label>
            <button
              type="button"
              className="w-fit text-sm text-copper underline-offset-4 hover:underline"
              onClick={() =>
                setDocuments((current) =>
                  current.filter((item) => item.id !== document.id),
                )
              }
            >
              Remove document
            </button>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save service"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="rounded-full border border-copper px-5 py-3 text-sm font-semibold text-copper disabled:opacity-60"
          >
            Remove service
          </button>
        ) : null}
      </div>
    </form>
  );
}
