export function DashboardBotStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="dashboard-bot-stat">
      <p className="dashboard-bot-stat-label">{label}</p>
      <p className="dashboard-bot-stat-value">{value}</p>
    </div>
  );
}
