export function formatUptimeMs(uptimeMs: number | null | undefined): string {
  if (uptimeMs == null || !Number.isFinite(uptimeMs) || uptimeMs < 0) {
    return "—";
  }

  const totalMinutes = Math.floor(uptimeMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}
