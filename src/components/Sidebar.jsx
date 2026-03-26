import { useMemo } from 'react'
import BirdImage from './BirdImage.jsx'
import { timeAgo } from '../utils/formatters.js'
import { useServer } from '../hooks/useServer.js'

const SERVER_NAMES = {
  'http://10.147.20.4:8080': 'Hay-on-Wye',
  'http://10.147.20.2': 'LDNP Office',
}

export default function Sidebar({ detections, todayStats }) {
  const todayCountBySpecies = useMemo(() => {
    const map = {}
    for (const d of todayStats) map[d.commonName] = (map[d.commonName] ?? 0) + d.count
    return map
  }, [todayStats])
  const { serverInfo, switchServer } = useServer()

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
          </span>
          <span className="text-sm font-bold tracking-widest text-red-500">LIVE</span>
        </div>
        {serverInfo && (
          <button
            onClick={switchServer}
            title={`Switch to ${SERVER_NAMES[serverInfo.servers.find(s => s !== serverInfo.active)]}`}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            {SERVER_NAMES[serverInfo.active] ?? serverInfo.active}
          </button>
        )}
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
