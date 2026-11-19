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

function fieldSchema(sectionKey: string, field: FormField) {
  switch (field.kind) {
    case "text":
    case "textarea": {
      const text = z.string().trim();
      return field.required ? text.min(1) : text.optional();
    }
    case "date": {
      const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      return field.required ? date : date.optional();
    }
    case "number": {
      const number = z.number().finite();
      return field.required ? number : number.optional();
    }
    case "boolean": {
      const flag = z.boolean();
      return field.required ? flag : flag.optional();
    }
    case "select": {
      const options = field.options ?? [];
      const first = options[0];
      if (!first) {
        throw new Error(`Select field ${sectionKey}.${field.key} needs options.`);
      }
      const choice = z.enum([first, ...options.slice(1)]);
      return field.required ? choice : choice.optional();
    }
    default: {
      const unknown: never = field.kind;
      throw new Error(`Unknown field kind ${String(unknown)}.`);
    }
  }
}
