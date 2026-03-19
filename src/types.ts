export interface Subject {
  id: string
  name: string
  color: string
  weeklyGoalMinutes: number
  semester: string
}

export type StudyMode = 'sprint' | 'flow' | 'deep'

export interface StudySession {
  id: string
  subjectId: string
  date: string         // ISO date string: YYYY-MM-DD
  durationMinutes: number
  pomodoroCount: number
  completedAt: string  // ISO datetime
  focusScore?: number  // 1-5
  studyMode?: StudyMode
}

export type TimerPhase = 'work' | 'break' | 'longBreak'

export type DeadlineType = 'exam' | 'assignment' | 'project' | 'other'

export interface Deadline {
  id: string
  title: string
  type: DeadlineType
  subjectId: string
  dueDate: string   // YYYY-MM-DD
  done: boolean
  notes: string
}

export interface TimerSettings {
  pomodoroDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  pomodorosBeforeLongBreak: number
}
