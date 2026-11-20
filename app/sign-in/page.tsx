import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { demoPassword } from "@/lib/demo";
import { safeNextPath } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  invalid: "Email or password is not recognized.",
  config: "Sign-in is not configured. Set SESSION_SECRET in .env.",
};

type SignInProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInProps) {
  const query = await searchParams;
  const nextPath = safeNextPath(query.next);
  const user = await getCurrentUser();
  if (user) {
    redirect(nextPath);
  }
  const error = query.error ? errors[query.error] : undefined;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Sign in</h1>
      <p className="mt-3 text-muted">
        Applicants file protocols, analysts review the sectors they cover, and admins edit
        the service catalog.
      </p>
      <form
        action="/api/auth/login"
        method="post"
        className="mt-8 space-y-4 rounded-3xl border border-sand bg-card p-6"
      >
        <input type="hidden" name="next" value={nextPath} />
        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-clay-soft px-3 py-2 text-sm text-clay"
          >
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
        >
          Sign in
        </button>
      </form>
      <aside className="mt-6 rounded-3xl border border-dashed border-sand px-5 py-4 text-sm text-muted">
        <p className="font-medium text-ink">Fictitious sample accounts</p>
        <p className="mt-1">
          Every seeded user uses the password{" "}
          <code className="font-mono">{demoPassword}</code>.
        </p>
        <ul className="mt-3 space-y-1">
          <li>Applicant: marina.costa@valeclaro.test</li>
          <li>Analyst (Environment): helena.duarte@valeclaro.test</li>
          <li>Admin: nara.quinteiro@valeclaro.test</li>
        </ul>
      </aside>
    </div>
  );
}
