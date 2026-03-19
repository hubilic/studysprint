import { useState } from 'react'
import type { Deadline, DeadlineType } from '../types'
import { getDeadlines, saveDeadlines, getSubjects, generateId, daysUntil } from '../store'

const TYPE_CONFIG: Record<DeadlineType, { label: string; icon: string; color: string }> = {
  exam:       { label: 'Exam',       icon: '📝', color: '#e05b5b' },
  assignment: { label: 'Assignment', icon: '📄', color: '#5b8dee' },
  project:    { label: 'Project',    icon: '🗂',  color: '#8b5cf6' },
  other:      { label: 'Other',      icon: '📌',  color: '#9b8f8a' },
}

function urgencyStyle(days: number, done: boolean): { bg: string; text: string; badge: string } {
  if (done) return { bg: '#f5f4f0', text: '#b8b0a8', badge: '#d4cfc7' }
  if (days < 0)  return { bg: '#fff0f0', text: '#c0392b', badge: '#e05b5b' }
  if (days === 0) return { bg: '#fff0f0', text: '#c0392b', badge: '#e05b5b' }
  if (days <= 2)  return { bg: '#fff5f0', text: '#e07b39', badge: '#e07b39' }
  if (days <= 7)  return { bg: '#fffbf0', text: '#c4873a', badge: '#f0b429' }
  return { bg: '#fff', text: '#37352f', badge: '#9b8f8a' }
}

function daysLabel(days: number, done: boolean): string {
  if (done) return 'Done'
  if (days < 0)  return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today!'
  if (days === 1) return 'Tomorrow'
  return `${days} days left`
}

const EMPTY_FORM = {
  title: '',
  type: 'exam' as DeadlineType,
  subjectId: '',
  dueDate: '',
  notes: '',
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>(getDeadlines)
  const subjects = getSubjects()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showDone, setShowDone] = useState(false)

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(d: Deadline) {
    setEditingId(d.id)
    setForm({ title: d.title, type: d.type, subjectId: d.subjectId, dueDate: d.dueDate, notes: d.notes })
    setShowForm(true)
  }

  function save() {
    if (!form.title.trim() || !form.dueDate) return
    let updated: Deadline[]
    if (editingId) {
      updated = deadlines.map(d => d.id === editingId ? { ...d, ...form } : d)
    } else {
      updated = [...deadlines, { id: generateId(), ...form, done: false }]
    }
    saveDeadlines(updated)
    setDeadlines(updated)
    setShowForm(false)
  }

  function toggleDone(id: string) {
    const updated = deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d)
    saveDeadlines(updated)
    setDeadlines(updated)
  }

  function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) return
    const updated = deadlines.filter(d => d.id !== id)
    saveDeadlines(updated)
    setDeadlines(updated)
  }

  const active = deadlines
    .filter(d => !d.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const done = deadlines
    .filter(d => d.done)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))

  // upcoming within 7 days (for the urgent banner)
  const urgent = active.filter(d => daysUntil(d.dueDate) <= 3)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352f]">Deadlines</h1>
          <p className="text-sm text-[#9b8f8a] mt-0.5">Track exams, assignments and projects.</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#e07b39' }}
        >
          + Add
        </button>
      </div>

      {/* Urgent strip */}
      {urgent.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#f5cba7] bg-[#fffbf5] px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c4873a]">Coming up soon</p>
          {urgent.map(d => {
            const days = daysUntil(d.dueDate)
            const subj = subjects.find(s => s.id === d.subjectId)
            const tc = TYPE_CONFIG[d.type]
            return (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <span>{tc.icon}</span>
                <span className="font-medium text-[#37352f]">{d.title}</span>
                {subj && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: subj.color + '25', color: subj.color }}>{subj.name}</span>}
                <span className="ml-auto text-xs font-semibold" style={{ color: days <= 0 ? '#e05b5b' : '#e07b39' }}>
                  {daysLabel(days, false)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Active deadlines */}
      {active.length === 0 && done.length === 0 ? (
        <div className="text-center py-20 text-[#c4b9b4]">
          <p className="text-4xl mb-3">🗓</p>
          <p className="text-base font-medium text-[#9b8f8a]">No deadlines yet</p>
          <p className="text-sm mt-1">Add your upcoming exams and assignments</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(d => {
            const days = daysUntil(d.dueDate)
            const style = urgencyStyle(days, false)
            const tc = TYPE_CONFIG[d.type]
            const subj = subjects.find(s => s.id === d.subjectId)
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 border transition-colors group"
                style={{ backgroundColor: style.bg, borderColor: style.bg === '#fff' ? '#e8e4dc' : style.badge + '50' }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleDone(d.id)}
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ borderColor: style.badge }}
                  title="Mark as done"
                />

                {/* Icon + info */}
                <span className="text-base leading-none flex-shrink-0">{tc.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: style.text }}>{d.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: tc.color + '20', color: tc.color }}
                    >
                      {tc.label}
                    </span>
                    {subj && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: subj.color + '20', color: subj.color }}
                      >
                        {subj.name}
                      </span>
                    )}
                    {d.notes && <span className="text-[10px] text-[#b8b0a8] truncate">{d.notes}</span>}
                  </div>
                </div>

                {/* Days badge */}
                <div className="text-right flex-shrink-0">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: style.badge + '20', color: style.badge }}
                  >
                    {daysLabel(days, false)}
                  </span>
                  <p className="text-[10px] text-[#c4b9b4] mt-0.5 text-right">{d.dueDate}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => openEdit(d)}
                    className="text-[#9b8f8a] hover:text-[#37352f] text-xs px-2 py-1.5 rounded hover:bg-white/60 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(d.id, d.title)}
                    className="text-[#c4b9b4] hover:text-red-400 text-xs px-2 py-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Done section */}
      {done.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDone(v => !v)}
            className="text-xs font-medium text-[#b8b0a8] hover:text-[#9b8f8a] transition-colors flex items-center gap-1.5 mb-2"
          >
            <span>{showDone ? '▾' : '▸'}</span>
            Completed ({done.length})
          </button>
          {showDone && (
            <div className="space-y-1.5">
              {done.map(d => {
                const tc = TYPE_CONFIG[d.type]
                const subj = subjects.find(s => s.id === d.subjectId)
                return (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl px-4 py-3 border border-[#e8e4dc] bg-[#f5f4f0] group">
                    <button
                      onClick={() => toggleDone(d.id)}
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-[#d4cfc7] hover:opacity-70 transition-opacity"
                      title="Mark as undone"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span className="text-base leading-none flex-shrink-0 opacity-50">{tc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#b8b0a8] line-through">{d.title}</p>
                      {subj && <span className="text-[10px] text-[#c4b9b4]">{subj.name}</span>}
                    </div>
                    <p className="text-[10px] text-[#c4b9b4]">{d.dueDate}</p>
                    <button
                      onClick={() => remove(d.id, d.title)}
                      className="text-[#d4cfc7] hover:text-red-400 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#e8e4dc] shadow-2xl">
            <h2 className="text-base font-semibold text-[#37352f] mb-5">
              {editingId ? 'Edit deadline' : 'New deadline'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Title</label>
                <input
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39] placeholder-[#c4b9b4]"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Linear Algebra Exam"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as DeadlineType }))}
                    className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39]"
                  >
                    {(Object.keys(TYPE_CONFIG) as DeadlineType[]).map(t => (
                      <option key={t} value={t}>{TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Subject (optional)</label>
                <select
                  value={form.subjectId}
                  onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39]"
                >
                  <option value="">— No subject —</option>
                  {getSubjects().map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Notes (optional)</label>
                <input
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39] placeholder-[#c4b9b4]"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. chapters 1-5, room 204..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={save}
                disabled={!form.title.trim() || !form.dueDate}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#e07b39' }}
              >
                Save
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-[#f5f4f0] hover:bg-[#ede9e3] rounded-lg text-sm font-medium text-[#9b8f8a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
