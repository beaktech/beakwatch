import BirdImage from '../BirdImage.jsx'

export default function Top30Days({ species }) {
  const max = species[0]?.count || 1

  return (
    <div className="h-full flex flex-col p-8 bg-white overflow-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Top Species</h2>
      <p className="text-sm text-slate-400 mb-6">Last 30 days</p>
      <div className="space-y-3">
        {species.slice(0, 10).map((s, i) => (
          <div key={s.commonName} className="flex items-center gap-4">
            <span className="text-sm font-bold text-emerald-600 w-5 text-right flex-shrink-0">
              {i + 1}
            </span>
            <BirdImage
              commonName={s.commonName}
              alt={s.commonName}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 truncate">{s.commonName}</span>
                <span className="text-sm text-slate-400 ml-3 flex-shrink-0 tabular-nums">{s.count}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(s.count / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
