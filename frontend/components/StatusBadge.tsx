const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-accent-soft text-accent-strong",
  SALE_DONE: "bg-accent-soft text-accent-strong",
  DID_NOT_CONNECT: "bg-warn-soft text-warn",
  BAD_LEAD: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-ink-soft">—</span>;
  const style = STATUS_STYLES[status] || "bg-paper text-ink-soft";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${style}`}>
      {status}
    </span>
  );
}
