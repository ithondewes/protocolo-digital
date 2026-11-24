import { z } from "zod";
import { PROTOCOL_STATUSES } from "./domain";

const reviewItemSchema = z.object({
  kind: z.enum(["section", "document"]),
  key: z.string().trim().min(1).max(64),
  decision: z.enum(["pending", "cleared", "changes_requested"]),
  comment: z.string().trim().max(2000).optional().default(""),
});

export const reviewActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    items: z.array(reviewItemSchema).min(1).max(80),
  }),
  z.object({
    action: z.literal("request_corrections"),
    items: z.array(reviewItemSchema).min(1).max(80),
  }),
  z.object({
    action: z.literal("advance"),
    items: z.array(reviewItemSchema).min(1).max(80),
  }),
  z.object({
    action: z.literal("approve"),
    items: z.array(reviewItemSchema).min(1).max(80),
  }),
  z.object({
    action: z.literal("reject"),
    note: z.string().trim().min(1).max(2000),
  }),
]);

export type ReviewActionInput = z.infer<typeof reviewActionSchema>;

export const inboxQuerySchema = z.object({
  status: z.enum(PROTOCOL_STATUSES).optional(),
  sector: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => (value ? value : undefined)),
  type: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export function issuesFrom(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
