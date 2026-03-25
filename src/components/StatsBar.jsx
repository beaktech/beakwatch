export default function StatsBar({ todayStats, history }) {
  const speciesCount = new Set(todayStats.map(d => d.commonName)).size

  const stats = [
    { label: 'species today', value: speciesCount > 0 ? speciesCount : '—' },
    { label: 'in last 30 days', value: history?.speciesLast30Days ?? '—' },
    { label: 'ever recorded', value: history?.speciesAllTime ?? '—' },
    { label: 'new this week', value: history?.newThisWeek ?? '—' },
  ]

  return (
    <footer className="bg-white border-t border-slate-200 flex items-center justify-center gap-2 px-8 h-14 flex-shrink-0">
      {stats.map(({ label, value }, i) => (
        <div key={label} className="flex items-baseline gap-1.5 px-4">
          {i > 0 && <span className="text-slate-200 absolute -ml-4 select-none">·</span>}
          <span className="text-xl font-bold text-emerald-600">{value}</span>{' '}
          <span className="text-sm text-slate-500">{label}</span>
        </div>
      ))}
    </footer>
  )
}
