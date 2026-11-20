export function TrackForm({ initialCode = "" }: { initialCode?: string }) {
  return (
    <form
      action="/track"
      method="get"
      className="rounded-3xl border border-sand bg-card p-6 shadow-[0_16px_40px_-28px_rgba(28,36,48,0.7)]"
    >
      <label htmlFor="protocol-code" className="block font-display text-3xl">
        Track a protocol
      </label>
      <p className="mt-2 text-sm text-muted">
        The public page shows the route and the timeline. Form answers and files stay with
        the sectors.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          id="protocol-code"
          name="code"
          defaultValue={initialCode}
          placeholder="VC-2026-1077"
          autoComplete="off"
          required
          className="w-full rounded-full border border-sand bg-paper px-4 py-3 font-mono text-sm uppercase outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper"
        >
          Show timeline
        </button>
      </div>
    </form>
  );
}
