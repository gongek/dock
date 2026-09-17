export function SiteStatusChip({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={`dashboard-status-chip ${published ? "dashboard-status-chip--published" : "dashboard-status-chip--draft"}`}
    >
      {status}
    </span>
  );
}
