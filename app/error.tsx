"use client";

export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl">This page could not be loaded</h1>
      <p className="mt-3 text-muted">
        Check that MongoDB is running and that the sample catalog has been seeded.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
      >
        Try again
      </button>
    </div>
  );
}
