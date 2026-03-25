import { useDetections } from './hooks/useDetections.js'
import { useTodayStats } from './hooks/useTodayStats.js'
import { useWeeklyActivity } from './hooks/useWeeklyActivity.js'
import { useHistory } from './hooks/useHistory.js'
import Sidebar from './components/Sidebar.jsx'
import StatsBar from './components/StatsBar.jsx'
import HeroRotator from './components/hero/HeroRotator.jsx'

export default function App() {
  const { detections, lastSuccessAt } = useDetections()
  const { todayStats } = useTodayStats()
  const { weeklyActivity } = useWeeklyActivity()
  const { history } = useHistory()

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex flex-1 overflow-hidden">
        <main className="w-[68%] h-full overflow-hidden">
          <HeroRotator
            detections={detections}
            todayStats={todayStats}
            weeklyActivity={weeklyActivity}
            history={history}
            lastSuccessAt={lastSuccessAt}
          />
        </main>
        <aside className="w-[32%] h-full border-l border-slate-200 overflow-hidden bg-white">
          <Sidebar detections={detections} todayStats={todayStats} />
        </aside>
      </div>
      <StatsBar todayStats={todayStats} history={history} />
    </div>
  )
}
