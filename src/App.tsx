import { useState } from 'react'
import PomodoroTimer from './components/PomodoroTimer'
import SubjectsPage from './components/SubjectsPage'
import WeeklyStats from './components/WeeklyStats'
import DeadlinesPage from './components/DeadlinesPage'
import { getStreak } from './store'

type Page = 'timer' | 'subjects' | 'deadlines' | 'stats'

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'timer', label: 'Timer', icon: '⏱' },
  { key: 'subjects', label: 'Subjects', icon: '📚' },
  { key: 'deadlines', label: 'Deadlines', icon: '🗓' },
  { key: 'stats', label: 'Statistics', icon: '📊' },
]

export default function App() {
  const [page, setPage] = useState<Page>('timer')
  const streak = getStreak()

  return (
    <div className="min-h-screen bg-[#faf9f6] flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-[#e8e4dc] bg-[#f5f4f0] flex flex-col py-6 px-3">
        <div className="px-3 mb-8">
          <span className="text-[#e07b39] font-bold text-base tracking-tight select-none">
            StudySprint
          </span>
          <p className="text-[10px] text-[#b8b0a8] mt-0.5 font-medium uppercase tracking-widest">
            Study Tracker
          </p>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                page === key
                  ? 'bg-white text-[#37352f] shadow-sm font-medium border border-[#e8e4dc]'
                  : 'text-[#9b8f8a] hover:bg-white/60 hover:text-[#37352f]'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-3 pt-6 border-t border-[#e8e4dc] space-y-3">
          {/* Streak badge */}
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ backgroundColor: streak.studiedToday ? '#fdf0e8' : '#f5f4f0' }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg leading-none">
                {streak.current >= 7 ? '🔥' : streak.current >= 3 ? '⚡' : '📅'}
              </span>
              <span
                className="text-xl font-bold"
                style={{ color: streak.studiedToday ? '#e07b39' : '#b8b0a8' }}
              >
                {streak.current}
              </span>
              <span className="text-xs text-[#9b8f8a] font-medium">
                {streak.current === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="text-[10px] text-[#b8b0a8] leading-snug">
              {streak.studiedToday
                ? 'Studied today — keep it up!'
                : streak.current > 0
                  ? 'Study today to keep your streak!'
                  : 'Start your streak today'}
            </p>
            {streak.longest > 0 && (
              <p className="text-[10px] text-[#c4b9b4] mt-1">
                Best: {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
              </p>
            )}
          </div>

          <p className="text-[10px] text-[#c4b9b4] leading-relaxed">
            Data stored locally in your browser.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          {page === 'timer' && <PomodoroTimer />}
          {page === 'subjects' && <SubjectsPage />}
          {page === 'deadlines' && <DeadlinesPage />}
          {page === 'stats' && <WeeklyStats />}
        </div>
      </main>
    </div>
  )
}
