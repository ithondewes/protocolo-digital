import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/session";

export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requireAdmin(nextPath: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "admin") {
    redirect("/account?notice=admin");
  }
  return user;
}

export async function requireApplicant(nextPath: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "applicant") {
    redirect("/account?notice=applicant");
  }
  return user;
}
