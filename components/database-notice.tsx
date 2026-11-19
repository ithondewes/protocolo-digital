export function DatabaseNotice({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "The catalog could not be loaded.";
  const safe =
    message.includes("Mongo") ||
    message.includes("MONGODB_URI") ||
    message.includes("seed")
      ? message
      : "The catalog could not be loaded.";

  return (
    <div className="rounded-3xl border border-sand bg-card px-5 py-6" role="status">
      <h2 className="font-display text-2xl">The catalog is offline</h2>
      <p className="mt-2 max-w-2xl text-muted">{safe}</p>
      <p className="mt-3 text-sm text-muted">
        Copy <code className="font-mono">.env.example</code> to{" "}
        <code className="font-mono">.env</code>, start MongoDB, then run{" "}
        <code className="font-mono">npm run seed</code>.
      </p>
    </div>
  );
}
