interface ImportProgressProps {
  batchesDone: number;
  totalBatches: number;
  rowCount: number;
}

export function ImportProgress({ batchesDone, totalBatches, rowCount }: ImportProgressProps) {
  const pct = totalBatches > 0 ? Math.round((batchesDone / totalBatches) * 100) : 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span className="font-mono tabular-nums">
          batch {batchesDone.toString().padStart(2, "0")} / {(totalBatches || 1).toString().padStart(2, "0")}
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>

      <div className="mt-4 space-y-1 font-mono text-xs text-ink-soft">
        <p>
          <span className="text-accent">→</span> scanning {rowCount} row{rowCount === 1 ? "" : "s"} across{" "}
          {totalBatches || "…"} batch{totalBatches === 1 ? "" : "es"}
        </p>
        <p className="animate-pulse">
          <span className="text-accent">→</span> mapping fields into GrowEasy CRM format…
        </p>
      </div>
    </div>
  );
}
