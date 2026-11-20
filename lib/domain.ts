export const PROTOCOL_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "corrections_requested",
  "approved",
  "rejected",
] as const;

export type ProtocolStatus = (typeof PROTOCOL_STATUSES)[number];

export const USER_ROLES = ["applicant", "analyst", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const FIELD_KINDS = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "boolean",
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];

export type FormField = {
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  help?: string;
  options?: string[];
};

export type FormSection = {
  key: string;
  title: string;
  description?: string;
  fields: FormField[];
};

/** Catalog data for one service. The filing UI reads this instead of a fixed wizard. */
export type FormSchema = {
  sections: FormSection[];
};

export type DocumentRequirement = {
  key: string;
  label: string;
  detail: string;
  required: boolean;
};

export const REVIEW_DECISIONS = ["pending", "cleared", "changes_requested"] as const;

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const TIMELINE_KINDS = [
  "filed",
  "claimed",
  "correction_requested",
  "resubmitted",
  "advanced",
  "approved",
  "rejected",
] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_VISIBILITY = ["public", "internal"] as const;

export type TimelineVisibility = (typeof TIMELINE_VISIBILITY)[number];
