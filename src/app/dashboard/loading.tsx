// Shown inside the dashboard shell while a page's server queries run, so navigation feels instant.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-5 h-8 w-48 rounded bg-white/10" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass h-24" />
        ))}
      </div>
      <div className="glass h-80" />
    </div>
  );
}
