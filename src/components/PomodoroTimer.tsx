import { useState, useEffect, useRef } from 'react'
import type { StudyMode, TimerPhase, Subject } from '../types'
import {
  getSubjects,
  addSession,
  generateId,
  getTodayString,
} from '../store'

// ─── Science-backed study modes ────────────────────────────────────────────
// Sprint 25/5  → Cirillo's Pomodoro + cognitive attention research (~25 min decline)
// Flow  52/17  → DeskTime 2014: top 10% productive workers
// Deep  75/20  → Updated DeskTime + Kleitman's ultradian rhythm (90 min BRAC cycle)

interface ModeConfig {
  id: StudyMode
  label: string
  workMin: number
  breakMin: number
  longBreakMin: number
  sessionsBeforeLong: number
  color: string
  bg: string
  tagline: string
  source: string
  bestFor: string
}

const MODES: ModeConfig[] = [
  {
    id: 'sprint',
    label: 'Sprint',
    workMin: 25,
    breakMin: 5,
    longBreakMin: 20,
    sessionsBeforeLong: 4,
    color: '#e07b39',
    bg: '#fdf0e8',
    tagline: '25 min work · 5 min break',
    source: 'Cirillo (1980s) · cognitive attention research',
    bestFor: 'Procrastination, routine tasks, starting your day',
  },
  {
    id: 'flow',
    label: 'Flow',
    workMin: 52,
    breakMin: 17,
    longBreakMin: 30,
    sessionsBeforeLong: 3,
    color: '#4caf82',
    bg: '#eaf7f0',
    tagline: '52 min work · 17 min break',
    source: 'DeskTime 2014 — top 10% most productive',
    bestFor: 'Regular study, practice problems, consistent work',
  },
  {
    id: 'deep',
    label: 'Deep',
    workMin: 75,
    breakMin: 20,
    longBreakMin: 35,
    sessionsBeforeLong: 2,
    color: '#5b8dee',
    bg: '#eaeffc',
    tagline: '75 min work · 20 min break',
    source: 'DeskTime 2024 + Kleitman ultradian rhythm',
    bestFor: 'Exams, complex topics, projects requiring deep focus',
  },
]

// ─── Break activity suggestions (research-backed) ──────────────────────────
// Stanford: walking boosts creativity 81% · 20-20-20 rule for eye strain
// Dehydration reduces cognitive performance up to 20% · avoid social media (cognitive load)

const BREAK_TIPS: { icon: string; title: string; desc: string }[] = [
  { icon: '🚶', title: 'Take a walk', desc: 'Just 5 minutes of walking boosts creativity by 81% (Stanford)' },
  { icon: '👀', title: '20-20-20 rule', desc: 'Look at something 20 ft away for 20 seconds — rests your eyes' },
  { icon: '💧', title: 'Hydrate', desc: 'Dehydration reduces cognitive performance by up to 20%' },
  { icon: '🧘', title: 'Breathe deeply', desc: '4s inhale, 7s hold, 8s exhale — reduces cortisol levels' },
  { icon: '🙆', title: 'Stretch', desc: 'Roll your shoulders and neck to release muscle tension' },
  { icon: '📵', title: 'No phone', desc: 'Social media does not give your brain a real rest' },
]

const CIRCUMFERENCE = 2 * Math.PI * 90

export default function PomodoroTimer() {
  const [subjects, setSubjects] = useState<Subject[]>(getSubjects)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [studyMode, setStudyMode] = useState<StudyMode>('sprint')
  const [phase, setPhase] = useState<TimerPhase>('work')
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].workMin * 60)
  const [running, setRunning] = useState(false)
  const [sessionsDone, setSessionsDone] = useState(0)
  const [pendingScore, setPendingScore] = useState<number | null>(null) // waiting for focus rating
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedWorkMinRef = useRef(0)

  const cfg = MODES.find(m => m.id === studyMode)!

  const totalSeconds = (() => {
    if (phase === 'work') return cfg.workMin * 60
    if (phase === 'break') return cfg.breakMin * 60
    return cfg.longBreakMin * 60
  })()

  const progress = secondsLeft / totalSeconds
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  function switchStudyMode(mode: StudyMode) {
    const c = MODES.find(m => m.id === mode)!
    setStudyMode(mode)
    setPhase('work')
    setRunning(false)
    setSessionsDone(0)
    setPendingScore(null)
    setSecondsLeft(c.workMin * 60)
  }

  function switchPhase(newPhase: TimerPhase, cfg: ModeConfig) {
    setPhase(newPhase)
    setRunning(false)
    if (newPhase === 'work') setSecondsLeft(cfg.workMin * 60)
    else if (newPhase === 'break') setSecondsLeft(cfg.breakMin * 60)
    else setSecondsLeft(cfg.longBreakMin * 60)
  }

  function handleWorkComplete() {
    completedWorkMinRef.current = cfg.workMin
    setRunning(false)
    setPendingScore(null) // open rating panel
  }

  function submitScore(score: number) {
    const elapsed = completedWorkMinRef.current
    if (selectedSubjectId && elapsed > 0) {
      addSession({
        id: generateId(),
        subjectId: selectedSubjectId,
        date: getTodayString(),
        durationMinutes: elapsed,
        pomodoroCount: 1,
        completedAt: new Date().toISOString(),
        focusScore: score,
        studyMode,
      })
    }
    completedWorkMinRef.current = 0
    const newCount = sessionsDone + 1
    setSessionsDone(newCount)
    setPendingScore(score)
    // transition to break
    if (newCount % cfg.sessionsBeforeLong === 0) {
      switchPhase('longBreak', cfg)
    } else {
      switchPhase('break', cfg)
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            if (phase === 'work') {
              handleWorkComplete()
            } else {
              switchPhase('work', cfg)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase, cfg]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSubjects(getSubjects()) }, [])

  function reset() {
    setRunning(false)
    setPendingScore(null)
    completedWorkMinRef.current = 0
    setPhase('work')
    setSecondsLeft(cfg.workMin * 60)
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)

  // pick 2 random break tips (stable per session)
  const breakTips = BREAK_TIPS.slice(0, 3)

  const isOnBreak = phase === 'break' || phase === 'longBreak'
  const showRating = phase === 'work' && secondsLeft === 0 && pendingScore === null && completedWorkMinRef.current > 0

  // dots: filled = done this cycle
  const dotsTotal = cfg.sessionsBeforeLong
  const dotsFilled = sessionsDone % cfg.sessionsBeforeLong

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#37352f]">Timer</h1>
        <p className="text-sm text-[#9b8f8a] mt-0.5">Science-backed modes — pick the one that fits your task.</p>
      </div>

      {/* Study mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => switchStudyMode(m.id)}
            className="rounded-xl p-3 text-left border-2 transition-all"
            style={
              studyMode === m.id
                ? { borderColor: m.color, backgroundColor: m.bg }
                : { borderColor: '#e8e4dc', backgroundColor: '#fff' }
            }
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-sm font-semibold"
                style={{ color: studyMode === m.id ? m.color : '#37352f' }}
              >
                {m.label}
              </span>
              {studyMode === m.id && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              )}
            </div>
            <p className="text-[11px] text-[#9b8f8a] leading-snug">{m.tagline}</p>
          </button>
        ))}
      </div>

      {/* Mode info card */}
      <div
        className="rounded-xl px-4 py-3 border text-sm"
        style={{ backgroundColor: cfg.bg, borderColor: cfg.color + '40' }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: cfg.color }}>
              Best for
            </p>
            <p className="text-[#37352f] text-xs">{cfg.bestFor}</p>
          </div>
        </div>
      </div>

      {/* Subject picker */}
      <div>
        <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">
          Studying now
        </label>
        <select
          value={selectedSubjectId}
          onChange={e => setSelectedSubjectId(e.target.value)}
          className="w-full bg-white border border-[#e8e4dc] rounded-xl px-4 py-2.5 text-sm text-[#37352f] focus:outline-none appearance-none shadow-sm"
          style={{ borderColor: selectedSubject ? selectedSubject.color + '70' : '#e8e4dc' }}
        >
          <option value="">-- Select a subject --</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {selectedSubject && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedSubject.color }} />
            <span className="text-xs text-[#9b8f8a]">{selectedSubject.name}</span>
          </div>
        )}
      </div>

      {/* Ring timer */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r="90" fill="none" stroke="#ede9e3" strokeWidth="8" />
            <circle
              cx="110" cy="110" r="90"
              fill="none"
              stroke={isOnBreak ? cfg.color + '80' : cfg.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              className="timer-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-[#37352f]">
              {minutes}:{seconds}
            </span>
            <span className="text-xs mt-1.5 font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
              {phase === 'work' ? 'Focus' : phase === 'longBreak' ? 'Long break' : 'Break'}
            </span>
            {isOnBreak && (
              <span className="text-[10px] text-[#b8b0a8] mt-0.5">you'll be back soon!</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
          <button
            onClick={reset}
            className="p-3 rounded-full text-[#b8b0a8] hover:text-[#37352f] hover:bg-[#ede9e3] transition-colors"
            title="Reset"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={() => setRunning(r => !r)}
            disabled={showRating}
            className="w-20 h-20 rounded-full text-white text-sm font-bold shadow-md transition-all active:scale-95 hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: cfg.color }}
          >
            {running ? 'STOP' : 'START'}
          </button>

          <div className="w-11 h-11" /> {/* spacer to balance reset button */}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 items-center">
          {Array.from({ length: dotsTotal }, (_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < dotsFilled ? cfg.color : '#e0dbd3',
                transform: i < dotsFilled ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
          <span className="text-xs text-[#b8b0a8] ml-1.5">
            {sessionsDone} {sessionsDone === 1 ? 'session' : 'sessions'} done
          </span>
        </div>
      </div>

      {/* ── Focus rating panel (shown after work session completes) ── */}
      {showRating && (
        <div
          className="rounded-2xl border-2 p-5 text-center"
          style={{ borderColor: cfg.color + '60', backgroundColor: cfg.bg }}
        >
          <p className="font-semibold text-[#37352f] mb-1">Session complete!</p>
          <p className="text-sm text-[#9b8f8a] mb-4">How focused were you?</p>
          <div className="flex justify-center gap-2">
            {[
              { score: 1, label: 'Terrible', emoji: '😞' },
              { score: 2, label: 'Meh', emoji: '😐' },
              { score: 3, label: 'Okay', emoji: '🙂' },
              { score: 4, label: 'Good', emoji: '😊' },
              { score: 5, label: 'Perfect', emoji: '🔥' },
            ].map(({ score, label, emoji }) => (
              <button
                key={score}
                onClick={() => submitScore(score)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/70 transition-colors"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] text-[#9b8f8a]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Break activity suggestions (shown during breaks) ── */}
      {isOnBreak && (
        <div className="rounded-2xl border border-[#e8e4dc] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9b8f8a] mb-3">
            What to do during your break?
          </p>
          <div className="grid gap-2">
            {breakTips.map(tip => (
              <div key={tip.title} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{tip.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#37352f]">{tip.title}</p>
                  <p className="text-xs text-[#9b8f8a]">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
