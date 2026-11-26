import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

export const sectorInputSchema = z.object({
  key: slug,
  name: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(400),
  order: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export type SectorInput = z.infer<typeof sectorInputSchema>;

export function sectorIssues(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
