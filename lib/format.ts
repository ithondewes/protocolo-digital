const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dayTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDay(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return dayFormat.format(date);
}

export function formatWhen(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return dayTimeFormat.format(date);
}
