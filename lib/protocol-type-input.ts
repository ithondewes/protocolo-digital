import { z } from "zod";
import { FIELD_KINDS } from "@/lib/domain";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

const fieldInput = z
  .object({
    key: slug,
    label: z.string().trim().min(1).max(120),
    kind: z.enum(FIELD_KINDS),
    required: z.boolean(),
    help: z.string().trim().max(400).optional(),
    options: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .superRefine((field, context) => {
    if (field.kind === "select" && (field.options?.length ?? 0) < 2) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "A select field needs at least two options.",
      });
    }
  });

const sectionInput = z.object({
  key: slug,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  fields: z.array(fieldInput).min(1).max(30),
});

const documentInput = z.object({
  key: slug,
  label: z.string().trim().min(1).max(120),
  detail: z.string().trim().min(1).max(400),
  required: z.boolean(),
});

export const protocolTypeInputSchema = z
  .object({
    key: slug,
    name: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(600),
    catalogSectorKey: slug,
    workflowKey: slug,
    active: z.boolean(),
    formSchema: z.object({
      sections: z.array(sectionInput).min(1).max(20),
    }),
    documents: z.array(documentInput).max(20),
  })
  .superRefine((value, context) => {
    rejectDuplicates(
      value.formSchema.sections.map((section) => section.key),
      ["formSchema", "sections"],
      "Section keys must be unique.",
      context,
    );
    value.formSchema.sections.forEach((section, index) => {
      rejectDuplicates(
        section.fields.map((field) => field.key),
        ["formSchema", "sections", String(index), "fields"],
        "Field keys must be unique inside a section.",
        context,
      );
    });
    rejectDuplicates(
      value.documents.map((document) => document.key),
      ["documents"],
      "Document keys must be unique.",
      context,
    );
  });

export type ProtocolTypeInput = z.infer<typeof protocolTypeInputSchema>;

export type InputIssue = { path: string; message: string };

export function issuesFrom(error: z.ZodError): InputIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function rejectDuplicates(
  keys: string[],
  path: (string | number)[],
  message: string,
  context: z.RefinementCtx,
) {
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: "custom", path, message });
  }
}
