import { z } from "zod";
import type { FormField, FormSchema } from "./domain";

/** Build a Zod schema from a protocol type's catalog form. */
export function answersSchema(form: FormSchema) {
  const sections: Record<string, z.ZodType> = {};
  for (const section of form.sections) {
    const fields: Record<string, z.ZodType> = {};
    for (const field of section.fields) {
      fields[field.key] = fieldSchema(section.key, field);
    }
    sections[section.key] = z.object(fields).strict();
  }
  return z.object(sections).strict();
}

export type AnswerMap = Record<string, Record<string, string | number | boolean>>;

export type AnswerIssue = { path: string; message: string };

/** Turn form controls into the values the catalog schema expects. */
export function parseAnswers(
  form: FormSchema,
  raw: unknown,
): { ok: true; answers: AnswerMap } | { ok: false; issues: AnswerIssue[] } {
  let schema: z.ZodType;
  try {
    schema = answersSchema(form);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "form",
          message:
            error instanceof Error ? error.message : "This form cannot be checked.",
        },
      ],
    };
  }

  const parsed = schema.safeParse(coerceAnswers(form, raw));
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    };
  }
  return { ok: true, answers: parsed.data as AnswerMap };
}

export function coerceAnswers(form: FormSchema, raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }
  const source = raw as Record<string, unknown>;
  const sections: Record<string, Record<string, unknown>> = {};
  for (const section of form.sections) {
    const sectionRaw = source[section.key];
    const fieldsRaw =
      sectionRaw && typeof sectionRaw === "object" && !Array.isArray(sectionRaw)
        ? (sectionRaw as Record<string, unknown>)
        : {};
    const fields: Record<string, unknown> = {};
    for (const field of section.fields) {
      const value = coerceField(field, fieldsRaw[field.key]);
      if (value !== undefined) {
        fields[field.key] = value;
      }
    }
    sections[section.key] = fields;
  }
  return sections;
}

function coerceField(field: FormField, raw: unknown): unknown {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  switch (field.kind) {
    case "text":
    case "textarea":
    case "date":
    case "select": {
      if (typeof raw !== "string") {
        return raw;
      }
      const trimmed = raw.trim();
      if (trimmed === "" && !field.required) {
        return undefined;
      }
      return trimmed;
    }
    case "number": {
      if (typeof raw === "number") {
        return raw;
      }
      if (typeof raw !== "string") {
        return raw;
      }
      const trimmed = raw.trim();
      if (trimmed === "") {
        return field.required ? trimmed : undefined;
      }
      const value = Number(trimmed);
      return Number.isFinite(value) ? value : trimmed;
    }
    case "boolean": {
      if (typeof raw === "boolean") {
        return raw;
      }
      if (raw === "true") {
        return true;
      }
      if (raw === "false") {
        return false;
      }
      if (raw === "" && !field.required) {
        return undefined;
      }
      return raw;
    }
    default: {
      const unknown: never = field.kind;
      return unknown;
    }
  }
}

function fieldSchema(sectionKey: string, field: FormField) {
  switch (field.kind) {
    case "text":
    case "textarea": {
      const text = z.string().trim();
      return field.required ? text.min(1, "Enter a value.") : text.optional();
    }
    case "date": {
      const date = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD.");
      return field.required ? date : date.optional();
    }
    case "number": {
      const number = z.number("Enter a number.").finite("Enter a number.");
      return field.required ? number : number.optional();
    }
    case "boolean": {
      const flag = z.boolean("Choose yes or no.");
      return field.required ? flag : flag.optional();
    }
    case "select": {
      const options = field.options ?? [];
      const first = options[0];
      if (!first) {
        throw new Error(`Select field ${sectionKey}.${field.key} needs options.`);
      }
      const choice = z.enum(
        [first, ...options.slice(1)],
        "Choose one of the listed options.",
      );
      return field.required ? choice : choice.optional();
    }
    default: {
      const unknown: never = field.kind;
      throw new Error(`Unknown field kind ${String(unknown)}.`);
    }
  }
}
