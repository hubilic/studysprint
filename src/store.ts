import type { Subject, StudySession, TimerSettings, Deadline } from './types'

const SUBJECTS_KEY = 'pomodoro_subjects'
const SESSIONS_KEY = 'pomodoro_sessions'
const SETTINGS_KEY = 'pomodoro_settings'
const DEADLINES_KEY = 'pomodoro_deadlines'

export const defaultSettings: TimerSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosBeforeLongBreak: 4,
}

export function getSubjects(): Subject[] {
  const raw = localStorage.getItem(SUBJECTS_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveSubjects(subjects: Subject[]): void {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects))
}

export function getSessions(): StudySession[] {
  const raw = localStorage.getItem(SESSIONS_KEY)
  return raw ? JSON.parse(raw) : []
}

export function addSession(session: StudySession): void {
  const sessions = getSessions()
  sessions.push(session)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function getSettings(): TimerSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
}

export function saveSettings(settings: TimerSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function getWeekDates(): string[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export function getDeadlines(): Deadline[] {
  const raw = localStorage.getItem(DEADLINES_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveDeadlines(deadlines: Deadline[]): void {
  localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines))
}

export function daysUntil(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}


export interface StreakInfo {
  current: number   // consecutive days ending today or yesterday
  longest: number   // all-time best streak
  studiedToday: boolean
}

export function getStreak(): StreakInfo {
  const sessions = getSessions()
  const dates = new Set(sessions.map(s => s.date))

  function dateStr(d: Date) {
    return d.toISOString().split('T')[0]
  }

  function prevDay(dateS: string) {
    const d = new Date(dateS)
    d.setDate(d.getDate() - 1)
    return dateStr(d)
  }

  const today = dateStr(new Date())
  const studiedToday = dates.has(today)

  // current streak: walk backwards from today
  let current = 0
  let cursor = today
  while (dates.has(cursor)) {
    current++
    cursor = prevDay(cursor)
  }
  // if didn't study today, check if streak is alive from yesterday
  if (!studiedToday) {
    cursor = prevDay(today)
    while (dates.has(cursor)) {
      current++
      cursor = prevDay(cursor)
    }
  }

  // longest streak: sort all dates and find max run
  const sorted = [...dates].sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = new Date(sorted[i - 1])
      prev.setDate(prev.getDate() + 1)
      if (dateStr(prev) === sorted[i]) {
        run++
      } else {
        run = 1
      }
    }
    if (run > longest) longest = run
  }

  return { current, longest, studiedToday }
}
