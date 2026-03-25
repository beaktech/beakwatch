import { useMemo } from 'react'
import BirdImage from './BirdImage.jsx'
import { timeAgo } from '../utils/formatters.js'

export default function Sidebar({ detections, todayStats }) {
  const todayCountBySpecies = useMemo(() => {
    const map = {}
    for (const d of todayStats) map[d.commonName] = (map[d.commonName] ?? 0) + d.count
    return map
  }, [todayStats])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-xs font-bold tracking-widest text-red-500">LIVE</span>
        <span className="text-sm font-semibold text-slate-600 ml-1">Live from the Canopy</span>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {detections.map((d, i) => {
          const todayCount = todayCountBySpecies[d.commonName]
          return (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
              <BirdImage
                commonName={d.commonName}
                alt={d.commonName}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-800 leading-snug">{d.commonName}</p>
                <p className="text-sm text-slate-400 mt-0.5">{timeAgo(d.timestamp)}</p>
                {todayCount != null && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">{todayCount} today</p>
                )}
              </div>
            </div>
          )
        })}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>
    </div>
  )
}
