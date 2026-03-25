import BirdImage from '../BirdImage.jsx'

export default function RareVisitors({ species }) {
  return (
    <div className="h-full flex flex-col p-8 bg-white">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Rare Visitors</h2>
      <p className="text-sm text-slate-400 mb-5">Least frequently seen at this sanctuary</p>
      <div className="grid grid-cols-3 grid-rows-2 gap-3 flex-1 min-h-0">
        {species.slice(0, 6).map((s, i) => (
          <div key={s.commonName} className="relative rounded-2xl overflow-hidden bg-slate-900">
            <BirdImage
              commonName={s.commonName}
              alt={s.commonName}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-3 right-3">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full border border-white/30">
                #{i + 1} rarest
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-bold text-sm leading-tight">{s.commonName}</p>
              <p className="text-white/60 text-xs mt-0.5">
                {s.allTimeCount} {s.allTimeCount === 1 ? 'detection' : 'detections'} ever
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
