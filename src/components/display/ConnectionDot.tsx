type ConnectionStatus = "live" | "reconnecting" | "offline";

type ConnectionDotProps = {
  status: ConnectionStatus;
  className?: string;
};

const statusStyles: Record<ConnectionStatus, string> = {
  live: "bg-emerald-300 shadow-[0_0_2rem_rgba(110,231,183,0.65)]",
  reconnecting: "bg-amber-300 shadow-[0_0_2rem_rgba(252,211,77,0.65)]",
  offline: "bg-red-400 shadow-[0_0_2rem_rgba(248,113,113,0.55)]",
};

const statusLabels: Record<ConnectionStatus, string> = {
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

export function ConnectionDot({ status, className }: ConnectionDotProps) {
  return (
    <div
      className={[
        "flex items-center gap-[0.7vmin] text-[clamp(0.8rem,1.1vw,1.4rem)] font-semibold uppercase text-zinc-300",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Connection status: ${statusLabels[status]}`}
    >
      <span
        className={[
          "block size-[clamp(0.7rem,1vw,1.2rem)] rounded-full",
          statusStyles[status],
        ].join(" ")}
      />
      <span>{statusLabels[status]}</span>
    </div>
  );
}
