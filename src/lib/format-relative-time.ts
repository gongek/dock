export function formatRelativeTime(timestampMs: number, prefix = "Updated"): string {
  const diffMs = Date.now() - timestampMs;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return `${prefix} just now`;
  if (minutes < 60) return `${prefix} ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${prefix} ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${prefix} ${days}d ago`;
  return `${prefix} ${new Date(timestampMs).toLocaleDateString()}`;
}
