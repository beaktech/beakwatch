import BirdImage from '../BirdImage.jsx'

export default function Top30Days({ species }) {
  const max = species[0]?.count || 1

  return (
    <div className="h-full flex flex-col p-8 bg-white overflow-hidden">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Most Popular Species</h2>
      <p className="text-sm text-slate-400 mb-4">Last 30 days</p>
      <div className="flex flex-col flex-1 min-h-0 justify-between">
        {species.slice(0, 10).map((s, i) => (
          <div key={s.commonName} className="flex items-center gap-4 min-h-0">
            <span className="text-sm font-bold text-brand-green w-5 text-right flex-shrink-0">
              {i + 1}
            </span>
            <BirdImage
              commonName={s.commonName}
              alt={s.commonName}
              width={40}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 truncate">{s.commonName}</span>
                <span className="text-sm text-slate-400 ml-3 flex-shrink-0 tabular-nums">{s.count}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full"
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
