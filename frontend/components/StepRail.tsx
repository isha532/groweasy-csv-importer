const STEPS = [
  { n: "01", label: "Upload CSV" },
  { n: "02", label: "Preview rows" },
  { n: "03", label: "Confirm import" },
  { n: "04", label: "Parsed result" },
] as const;

export function StepRail({ current }: { current: number }) {
  return (
    <ol className="flex flex-col gap-1 sm:flex-row sm:gap-0">
      {STEPS.map((step, i) => {
        const stepNumber = i + 1;
        const state =
          stepNumber === current ? "active" : stepNumber < current ? "done" : "upcoming";

        return (
          <li key={step.n} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <div className="flex w-full items-center gap-3">
              <span
                className={[
                  "font-mono text-xs tracking-tight tabular-nums transition-colors",
                  state === "active"
                    ? "text-accent"
                    : state === "done"
                    ? "text-ink-soft"
                    : "text-ink-soft/50",
                ].join(" ")}
              >
                {step.n}
              </span>
              <span
                className={[
                  "text-sm font-medium transition-colors",
                  state === "active" ? "text-ink" : state === "done" ? "text-ink-soft" : "text-ink-soft/50",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            <div
              className={[
                "hidden h-px flex-1 sm:mt-3 sm:block",
                state === "done" ? "bg-accent" : "bg-line",
              ].join(" ")}
            />
          </li>
        );
      })}
    </ol>
  );
}
