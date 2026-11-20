/** Keep post-login redirects on this site. */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (value.startsWith("/sign-in")) {
    return fallback;
  }
  return value;
}
