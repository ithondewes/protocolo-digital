import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth-input";
import { connectDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { safeNextPath } from "@/lib/safe-next";
import {
  SESSION_COOKIE,
  createSession,
  sessionConfigured,
  sessionCookieOptions,
} from "@/lib/session";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    next: form.get("next") ?? undefined,
  });
  const nextPath = safeNextPath(parsed.success ? parsed.data.next : form.get("next"));
  const fail = (code: string) =>
    NextResponse.redirect(
      new URL(`/sign-in?error=${code}&next=${encodeURIComponent(nextPath)}`, request.url),
      303,
    );

  if (!parsed.success) {
    return fail("invalid");
  }
  if (!sessionConfigured()) {
    return fail("config");
  }

  await connectDb();
  const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash");
  const passwordHash = user?.passwordHash;
  const matches =
    typeof passwordHash === "string" &&
    (await verifyPassword(parsed.data.password, passwordHash));
  if (!user || !matches) {
    return fail("invalid");
  }

  const token = await createSession(user._id.toString());
  if (!token) {
    return fail("config");
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
