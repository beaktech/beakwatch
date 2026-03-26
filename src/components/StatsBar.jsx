export default function StatsBar({ todayStats, history, weather }) {
  const speciesCount = new Set(todayStats.map(d => d.commonName)).size

  const stats = [
    { label: 'species today', value: speciesCount > 0 ? speciesCount : '—' },
    { label: 'in last 30 days', value: history?.speciesLast30Days ?? '—' },
    { label: 'ever recorded', value: history?.speciesAllTime ?? '—' },
    { label: 'new this week', value: history?.newThisWeek ?? '—' },
  ]

  return (
    <footer className="bg-white border-t border-slate-200 flex items-center px-8 h-[84px] flex-shrink-0">
      <img src="/ldnp.png" alt="Lake District National Park" className="w-[65px] h-auto mr-6" />
      <div className="flex items-center justify-center gap-2 flex-1">
        {stats.map(({ label, value }, i) => (
          <div key={label} className="flex items-baseline gap-1.5 px-4">
            {i > 0 && <span className="text-slate-200 absolute -ml-4 select-none">·</span>}
            <span className="text-xl font-bold text-[#754580]">{value}</span>{' '}
            <span className="text-sm text-slate-500">{label}</span>
          </div>
        ))}
      </div>
      {weather && (
        <div className="flex items-center gap-3 text-right">
          <span className="text-3xl leading-none">{weather.emoji}</span>
          <div>
            <p className="text-lg font-bold text-slate-700 leading-none">{weather.temp}°C</p>
            <p className="text-xs text-slate-400 mt-0.5">{weather.label} · {weather.wind} mph</p>
          </div>
        </div>
      )}
    </footer>
  )
}
