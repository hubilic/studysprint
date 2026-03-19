import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { getSubjects, getSessions, getWeekDates, getStreak, addSession, generateId } from '../store'
import type { Subject, StudySession } from '../types'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface DayData {
  name: string
  date: string
  [subjectId: string]: number | string
}

export default function WeeklyStats() {
  const [allSessions, setAllSessions] = useState<StudySession[]>(getSessions)
  const subjects = useMemo(() => getSubjects(), [])
  const sessions = allSessions
  const weekDates = useMemo(() => getWeekDates(), [])
  const streak = useMemo(() => getStreak(), [allSessions])

  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({
    subjectId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    minutes: 30,
  })

  function submitLog() {
    if (!logForm.subjectId) return
    const duration = logForm.hours * 60 + logForm.minutes
    if (duration <= 0) return
    const session: StudySession = {
      id: generateId(),
      subjectId: logForm.subjectId,
      date: logForm.date,
      durationMinutes: duration,
      pomodoroCount: 0,
      completedAt: new Date().toISOString(),
      studyMode: undefined,
    }
    addSession(session)
    setAllSessions(getSessions())
    setShowLogForm(false)
    setLogForm({ subjectId: '', date: new Date().toISOString().split('T')[0], hours: 0, minutes: 30 })
  }

  const subjectMap = useMemo(() => {
    const m: Record<string, Subject> = {}
    subjects.forEach(s => { m[s.id] = s })
    return m
  }, [subjects])

  // Minutes per subject per day this week
  const weekData = useMemo<DayData[]>(() => {
    return weekDates.map((date, i) => {
      const day: DayData = { name: DAY_NAMES[i], date }
      const daySessions = sessions.filter(s => s.date === date)
      for (const session of daySessions) {
        day[session.subjectId] = ((day[session.subjectId] as number) || 0) + session.durationMinutes
      }
      return day
    })
  }, [sessions, weekDates])

  // Total minutes per subject this week
  const subjectTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const day of weekData) {
      for (const subjectId of subjects.map(s => s.id)) {
        if (typeof day[subjectId] === 'number') {
          totals[subjectId] = (totals[subjectId] || 0) + (day[subjectId] as number)
        }
      }
    }
    return totals
  }, [weekData, subjects])

  // Sort subjects by time studied desc
  const subjectsSorted = [...subjects].sort(
    (a, b) => (subjectTotals[b.id] || 0) - (subjectTotals[a.id] || 0)
  )

  // Subjects behind on goal
  const behindSubjects = subjects.filter(s => {
    const done = subjectTotals[s.id] || 0
    return done < s.weeklyGoalMinutes * 0.5 // less than 50% of goal midweek
  })

  const today = new Date().toISOString().split('T')[0]
  const todayTotal = sessions
    .filter(s => s.date === today)
    .reduce((acc, s) => acc + s.durationMinutes, 0)

  const weekTotal = Object.values(subjectTotals).reduce((a, b) => a + b, 0)

  function fmt(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-[#e8e4dc] rounded-xl p-3 text-xs shadow-xl">
        <p className="font-semibold text-[#37352f] mb-2">{label}</p>
        {payload.map(p => {
          const subj = subjectMap[p.dataKey]
          if (!subj || !p.value) return null
          return (
            <p key={p.dataKey} style={{ color: subj.color }}>
              {subj.name}: {fmt(p.value)}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352f]">Statistics</h1>
          <p className="text-sm text-[#9b8f8a] mt-0.5">An overview of your study sessions this week.</p>
        </div>
        <button
          onClick={() => setShowLogForm(true)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-[#9b8f8a] border border-[#e8e4dc] bg-white hover:border-[#e07b39] hover:text-[#e07b39] transition-colors shadow-sm flex-shrink-0"
        >
          + Log session
        </button>
      </div>

      {/* Manual log modal */}
      {showLogForm && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-[#e8e4dc] shadow-2xl">
            <h2 className="text-base font-semibold text-[#37352f] mb-1">Log a study session</h2>
            <p className="text-xs text-[#9b8f8a] mb-5">Forgot to use the timer? Add it manually.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Subject</label>
                <select
                  value={logForm.subjectId}
                  onChange={e => setLogForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39]"
                >
                  <option value="">-- Select a subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={logForm.date}
                  onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Duration</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={logForm.hours}
                      onChange={e => setLogForm(f => ({ ...f, hours: Math.max(0, Number(e.target.value)) }))}
                      className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39] text-center"
                    />
                    <p className="text-center text-[10px] text-[#b8b0a8] mt-1">hours</p>
                  </div>
                  <div className="flex items-start pt-2.5 text-[#b8b0a8] font-bold">:</div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={logForm.minutes}
                      onChange={e => setLogForm(f => ({ ...f, minutes: Math.min(59, Math.max(0, Number(e.target.value))) }))}
                      className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39] text-center"
                    />
                    <p className="text-center text-[10px] text-[#b8b0a8] mt-1">minutes</p>
                  </div>
                </div>
                <p className="text-xs text-[#b8b0a8] mt-1.5 text-center">
                  Total: {logForm.hours > 0 ? `${logForm.hours}h ` : ''}{logForm.minutes > 0 ? `${logForm.minutes}min` : ''}
                  {logForm.hours === 0 && logForm.minutes === 0 ? '—' : ''}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={submitLog}
                disabled={!logForm.subjectId || (logForm.hours === 0 && logForm.minutes === 0)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#e07b39' }}
              >
                Save
              </button>
              <button
                onClick={() => setShowLogForm(false)}
                className="flex-1 py-2.5 bg-[#f5f4f0] hover:bg-[#ede9e3] rounded-lg text-sm font-medium text-[#9b8f8a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl px-5 py-4 border border-[#e8e4dc] shadow-sm">
          <p className="text-xs font-medium text-[#9b8f8a] uppercase tracking-wider">Today</p>
          <p className="text-2xl font-bold text-[#37352f] mt-1.5">{fmt(todayTotal)}</p>
        </div>
        <div className="bg-white rounded-xl px-5 py-4 border border-[#e8e4dc] shadow-sm">
          <p className="text-xs font-medium text-[#9b8f8a] uppercase tracking-wider">This week</p>
          <p className="text-2xl font-bold text-[#37352f] mt-1.5">{fmt(weekTotal)}</p>
        </div>
        <div
          className="rounded-xl px-5 py-4 border shadow-sm"
          style={{
            backgroundColor: streak.studiedToday ? '#fdf0e8' : '#fff',
            borderColor: streak.studiedToday ? '#f5cba7' : '#e8e4dc',
          }}
        >
          <p className="text-xs font-medium text-[#9b8f8a] uppercase tracking-wider">Streak</p>
          <div className="flex items-end gap-1.5 mt-1.5">
            <p
              className="text-2xl font-bold"
              style={{ color: streak.studiedToday ? '#e07b39' : '#37352f' }}
            >
              {streak.current}
            </p>
            <span className="text-sm text-[#9b8f8a] mb-0.5">
              {streak.current === 1 ? 'day' : 'days'}
            </span>
          </div>
          {streak.longest > streak.current && (
            <p className="text-[10px] text-[#c4b9b4] mt-0.5">best: {streak.longest}d</p>
          )}
        </div>
      </div>

      {/* Streak reminder banner */}
      {!streak.studiedToday && streak.current > 0 && (
        <div className="rounded-xl px-4 py-3 border border-[#f5cba7] bg-[#fffbf5] flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm font-medium text-[#c4873a]">
              Don't break your {streak.current}-day streak!
            </p>
            <p className="text-xs text-[#b8b0a8]">Complete at least one session today to keep it going.</p>
          </div>
        </div>
      )}

      {/* Milestone celebration */}
      {streak.studiedToday && streak.current > 0 && streak.current % 7 === 0 && (
        <div className="rounded-xl px-4 py-3 border border-[#e07b39] bg-[#fdf0e8] flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-medium text-[#e07b39]">
              {streak.current}-day streak — incredible!
            </p>
            <p className="text-xs text-[#b8b0a8]">You've been consistent for {streak.current / 7} {streak.current / 7 === 1 ? 'week' : 'weeks'}.</p>
          </div>
        </div>
      )}

      {/* Weekly chart */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-xl px-5 py-4 border border-[#e8e4dc] shadow-sm">
          <h2 className="text-xs font-medium text-[#9b8f8a] uppercase tracking-wider mb-4">Study time this week</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#b8b0a8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#b8b0a8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              {subjects.map(s => (
                <Bar key={s.id} dataKey={s.id} stackId="a" fill={s.color} radius={subjects.indexOf(s) === subjects.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                  {weekData.map((_, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Subject progress */}
      {subjectsSorted.length > 0 && (
        <div className="bg-white rounded-xl px-5 py-4 border border-[#e8e4dc] shadow-sm">
          <h2 className="text-xs font-medium text-[#9b8f8a] uppercase tracking-wider mb-4">Progress towards goal</h2>
          <div className="space-y-4">
            {subjectsSorted.map(s => {
              const done = subjectTotals[s.id] || 0
              const pct = Math.min(100, Math.round((done / s.weeklyGoalMinutes) * 100))
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-[#37352f]">{s.name}</span>
                    <span className="text-[#b8b0a8] text-xs">{fmt(done)} / {fmt(s.weeklyGoalMinutes)} goal</span>
                  </div>
                  <div className="h-1.5 bg-[#f0ede8] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <p className="text-xs text-[#c4b9b4] mt-1">{pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Behind subjects */}
      {behindSubjects.length > 0 && (
        <div className="bg-[#fffbf5] rounded-xl px-5 py-4 border border-[#f5dfc0]">
          <h2 className="text-xs font-medium text-[#c4873a] uppercase tracking-wider mb-3">Needs catch-up</h2>
          <div className="space-y-2">
            {behindSubjects.map(s => {
              const done = subjectTotals[s.id] || 0
              const missing = s.weeklyGoalMinutes - done
              return (
                <div key={s.id} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[#37352f]">{s.name}</span>
                  </div>
                  <span className="text-[#c4873a] text-xs font-medium">{fmt(missing)} behind</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Session history */}
      <div className="bg-white rounded-xl px-5 py-4 border border-[#e8e4dc] shadow-sm">
        <h2 className="text-xs font-medium text-[#9b8f8a] uppercase tracking-wider mb-4">Session history</h2>
        {weekDates.filter(d => sessions.some(s => s.date === d)).length === 0 ? (
          <p className="text-[#c4b9b4] text-sm">No sessions this week yet</p>
        ) : (
          <div className="space-y-4">
            {weekDates.slice().reverse().map(date => {
              const daySessions = sessions.filter((s: StudySession) => s.date === date)
              if (!daySessions.length) return null
              const dayIdx = weekDates.indexOf(date)
              return (
                <div key={date}>
                  <p className="text-[10px] font-semibold text-[#b8b0a8] uppercase tracking-wider mb-1.5">
                    {DAY_NAMES[dayIdx]}, {date}
                  </p>
                  <div className="space-y-0.5">
                    {daySessions.map((session: StudySession) => {
                      const subj = subjectMap[session.subjectId]
                      return (
                        <div key={session.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-[#faf9f6] transition-colors">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subj?.color ?? '#c4b9b4' }} />
                          <span className="text-sm text-[#37352f]">{subj?.name ?? 'Unknown'}</span>
                          <span className="text-xs text-[#b8b0a8] ml-auto">{fmt(session.durationMinutes)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
