import Link from "next/link";
import { municipality } from "@/lib/demo";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-pine bg-pine-deep text-paper">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="block">
          <span className="block font-display text-2xl leading-none">
            {municipality.product}
          </span>
          <span className="mt-1 block text-sm text-sand">
            {municipality.name} protocol hub
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        >
          <Link href="/sectors" className="underline-offset-4 hover:underline">
            Sectors
          </Link>
          <Link href="/track" className="underline-offset-4 hover:underline">
            Track
          </Link>
          {user?.role === "analyst" || user?.role === "admin" ? (
            <Link href="/desk" className="underline-offset-4 hover:underline">
              Inbox
            </Link>
          ) : null}
          {!user || user.role === "applicant" ? (
            <Link href="/file" className="underline-offset-4 hover:underline">
              File
            </Link>
          ) : null}
          {user?.role === "admin" ? (
            <Link
              href="/admin/protocol-types"
              className="underline-offset-4 hover:underline"
            >
              Catalog
            </Link>
          ) : null}
          {user ? (
            <>
              <Link href="/account" className="underline-offset-4 hover:underline">
                {user.name}
                <span className="text-sand"> · {user.role}</span>
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="underline-offset-4 hover:underline">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className="underline-offset-4 hover:underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
