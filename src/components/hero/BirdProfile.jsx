import { useState, useEffect, useMemo } from 'react'
import BirdImage from '../BirdImage.jsx'
import Attribution from '../Attribution.jsx'
import { fetchWikipedia } from '../../utils/wikipedia.js'
import { timeAgo } from '../../utils/formatters.js'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function BirdProfile({ detection, todayStats }) {
  const [extract, setExtract] = useState(null)

  useEffect(() => {
    setExtract(null)
    fetchWikipedia(detection.commonName).then(d => setExtract(d.extract))
  }, [detection.commonName])

  const { hourly, todayTotal, maxCount, peakHour } = useMemo(() => {
    const hourly = Array(24).fill(0)
    for (const d of todayStats) {
      if (d.commonName === detection.commonName) hourly[d.hour] += d.count
    }
    const todayTotal = hourly.reduce((a, b) => a + b, 0)
    const maxCount = Math.max(1, ...hourly)
    const peakHour = todayTotal > 0 ? hourly.indexOf(maxCount) : null
    return { hourly, todayTotal, maxCount, peakHour }
  }, [todayStats, detection.commonName])

  const currentHour = new Date().getHours()

  return (
    <div className="h-full flex bg-white">

      {/* Left: photo, contained so it never upscales */}
      <div className="relative w-[45%] flex-shrink-0 overflow-hidden bg-slate-900">
        <BirdImage
          commonName={detection.commonName}
          alt={detection.commonName}
          width={800}
          className="absolute inset-0 w-full h-full object-contain"
        />
        <Attribution commonName={detection.commonName} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute top-6 left-6">
          <span className="bg-black/30 backdrop-blur-sm text-white/90 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full border border-white/20">
            Species Profile
          </span>
        </div>
        <div className="absolute top-6 right-6">
          <span className="bg-black/30 backdrop-blur-sm text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/20">
            Detected {timeAgo(detection.timestamp)}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-7 pb-7">
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            {detection.commonName}
          </h2>
          {detection.scientificName && (
            <p className="text-base text-white/50 italic mt-1">{detection.scientificName}</p>
          )}
        </div>
      </div>

      {/* Right: info panel */}
      <div className="flex-1 flex flex-col px-8 py-8 overflow-hidden gap-6">

        {/* Wikipedia extract */}
        <div className="flex-1 min-h-0 overflow-hidden flex items-center">
          {extract ? (
            <div className="space-y-3">
              {extract.match(/[^.!?]+[.!?]+/g)?.map((sentence, i) => (
                <p key={i} className="text-lg leading-relaxed font-bold text-black">{sentence.trim()}</p>
              )) ?? <p className="text-lg leading-relaxed font-bold text-black">{extract}</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {[100, 90, 95, 80].map(w => (
                <div key={w} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        {todayTotal > 0 && (
          <div className="flex gap-6 flex-shrink-0">
            <div className="bg-emerald-50 rounded-xl px-5 py-3 text-center">
              <p className="text-3xl font-bold text-emerald-600">{todayTotal}</p>
              <p className="text-xs text-slate-400 mt-0.5">detections today</p>
            </div>
            {peakHour !== null && (
              <div className="bg-slate-50 rounded-xl px-5 py-3 text-center">
                <p className="text-3xl font-bold text-slate-700">{peakHour}:00</p>
                <p className="text-xs text-slate-400 mt-0.5">peak hour</p>
              </div>
            )}
          </div>
        )}

        {/* Hourly bar chart */}
        {todayTotal > 0 && (
          <div className="flex-shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Activity today by hour
            </p>
            <div className="flex items-end gap-px h-14">
              {HOURS.map(h => {
                const isCurrent = h === currentHour
                const isPeak = h === peakHour
                const barColor = hourly[h] === 0
                  ? null
                  : isPeak ? '#5c9430' : isCurrent ? '#f59e0b' : '#90c45f'
                return (
                  <div key={h} className="flex-1 h-full relative">
                    <div className="absolute inset-0 rounded-sm bg-slate-100" />
                    {barColor && (
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-sm transition-all"
                        style={{ height: `${Math.max(4, (hourly[h] / maxCount) * 100)}%`, backgroundColor: barColor }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-slate-300 mt-1.5 px-px">
              {['0h', '6h', '12h', '18h', '23h'].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
