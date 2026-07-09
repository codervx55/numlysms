const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "WAITING", color: "var(--amber)" },
  active: { label: "LIVE", color: "var(--sky)" },
  completed: { label: "ARRIVED", color: "var(--mint)" },
  failed: { label: "FAILED", color: "var(--coral)" },
  cancelled: { label: "CANCELLED", color: "var(--text-muted)" },
  expired: { label: "EXPIRED", color: "var(--text-muted)" },
  refunded: { label: "REFUNDED", color: "var(--sky)" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status.toUpperCase(), color: "var(--text-muted)" };
  return (
    <span
      className="split-flap inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-board"
      style={{ color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}
