import { useState } from 'react'
import type { Subject } from '../types'
import { getSubjects, saveSubjects, generateId } from '../store'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
]

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(getSubjects)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', color: COLORS[0], weeklyGoalMinutes: 120, semester: '' })
  const [showForm, setShowForm] = useState(false)

  function openNew() {
    setEditingId(null)
    setForm({ name: '', color: COLORS[0], weeklyGoalMinutes: 120, semester: '' })
    setShowForm(true)
  }

  function openEdit(s: Subject) {
    setEditingId(s.id)
    setForm({ name: s.name, color: s.color, weeklyGoalMinutes: s.weeklyGoalMinutes, semester: s.semester })
    setShowForm(true)
  }

  function save() {
    if (!form.name.trim()) return
    let updated: Subject[]
    if (editingId) {
      updated = subjects.map(s =>
        s.id === editingId ? { ...s, ...form } : s
      )
    } else {
      const newSubject: Subject = { id: generateId(), ...form }
      updated = [...subjects, newSubject]
    }
    saveSubjects(updated)
    setSubjects(updated)
    setShowForm(false)
  }

  function remove(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    const updated = subjects.filter(s => s.id !== id)
    saveSubjects(updated)
    setSubjects(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352f]">Subjects</h1>
          <p className="text-sm text-[#9b8f8a] mt-0.5">Manage your subjects for the current semester.</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#e07b39' }}
        >
          + Add
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#e8e4dc] shadow-2xl">
            <h2 className="text-base font-semibold text-[#37352f] mb-5">
              {editingId ? 'Edit subject' : 'New subject'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Name</label>
                <input
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39] placeholder-[#c4b9b4]"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Discrete Mathematics"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">Semester</label>
                <input
                  className="w-full bg-[#faf9f6] border border-[#e8e4dc] rounded-lg px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#e07b39] placeholder-[#c4b9b4]"
                  value={form.semester}
                  onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  placeholder="e.g. Semester 4"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-1.5 uppercase tracking-wider">
                  Weekly goal — {Math.round(form.weeklyGoalMinutes / 60 * 10) / 10}h / week
                </label>
                <input
                  type="range"
                  min={30}
                  max={600}
                  step={30}
                  value={form.weeklyGoalMinutes}
                  onChange={e => setForm(f => ({ ...f, weeklyGoalMinutes: Number(e.target.value) }))}
                  className="w-full"
                  style={{ accentColor: form.color }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9b8f8a] mb-2 uppercase tracking-wider">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        backgroundColor: c,
                        outline: form.color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={save}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
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

      {subjects.length === 0 ? (
        <div className="text-center py-20 text-[#c4b9b4]">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-base font-medium text-[#9b8f8a]">No subjects yet</p>
          <p className="text-sm mt-1">Add your subjects for this semester</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {subjects.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-4 bg-white rounded-xl px-4 py-3.5 border border-[#e8e4dc] hover:border-[#d4cfc7] transition-colors shadow-sm group"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#37352f] text-sm truncate">{s.name}</p>
                <p className="text-xs text-[#b8b0a8] mt-0.5">
                  {s.semester && <span>{s.semester} · </span>}
                  Goal: {Math.round(s.weeklyGoalMinutes / 60 * 10) / 10}h / week
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(s)}
                  className="text-[#9b8f8a] hover:text-[#37352f] text-xs px-2.5 py-1.5 rounded-md hover:bg-[#f5f4f0] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(s.id, s.name)}
                  className="text-[#c4b9b4] hover:text-red-400 text-xs px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
