export function RouteStrip({
  stages,
  currentKey,
  tone = "default",
}: {
  stages: { key: string; sectorName: string }[];
  currentKey?: string;
  tone?: "default" | "inverse";
}) {
  const idle = tone === "inverse" ? "bg-white/10 text-paper" : "bg-sand text-ink";
  const currentTone = tone === "inverse" ? "bg-copper text-paper" : "bg-pine text-paper";
  const arrow = tone === "inverse" ? "text-sand" : "text-muted";

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {stages.map((stage, index) => {
        const current = stage.key === currentKey;
        return (
          <li key={stage.key} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden="true" className={arrow}>
                →
              </span>
            ) : null}
            <span
              aria-current={current ? "step" : undefined}
              className={`rounded-full px-3 py-1 text-sm ${current ? `font-medium ${currentTone}` : idle}`}
            >
              {stage.sectorName}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
