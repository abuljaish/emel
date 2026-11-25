import { useEffect, useState } from 'react'
import type { LearningState, NoteBlock } from '../types'

const KEY = 'emel-learning-state-v3'

const defaultState = (): LearningState => ({
  version: 3,
  completed: {},
  notes: {},
  theme: 'light',
  customSheets: [],
  sheetOverrides: {},
})

export function useLearningData() {
  const [state, setState] = useState<LearningState>(() => {
    try {
      const saved = localStorage.getItem(KEY) ?? localStorage.getItem('em-al-learning-state-v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.version === 3 && parsed.completed && parsed.notes) {
          return { customSheets: [], sheetOverrides: {}, ...parsed }
        }
        if (parsed.version === 2 && parsed.completed && parsed.notes) {
          return { version: 3, completed: parsed.completed, notes: parsed.notes, theme: parsed.theme === 'dark' ? 'dark' : 'light', customSheets: [], sheetOverrides: {} }
        }
      }
    } catch {}
    return defaultState()
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  const setTheme = (theme: LearningState['theme']) => setState(s => ({ ...s, theme }))
  const toggleTopic = (topicId: string) => setState(s => ({
    ...s,
    completed: { ...s.completed, [topicId]: !s.completed[topicId] },
  }))
  const setNotes = (topicId: string, notes: NoteBlock[]) => setState(s => ({
    ...s,
    notes: { ...s.notes, [topicId]: notes },
  }))
  const reset = () => setState(s => ({ ...s, completed: {}, notes: {} }))
  const replace = (next: LearningState) => setState(next)
  const update = (updater: (s: LearningState) => LearningState) => setState(updater)

  return { state, setTheme, toggleTopic, setNotes, reset, replace, update }
}

export function validateBackup(value: unknown): value is LearningState {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<LearningState>
  if (v.version !== 3 || !v.completed || typeof v.completed !== 'object' || Array.isArray(v.completed)) return false
  if (!Array.isArray(v.customSheets) || typeof v.sheetOverrides !== 'object' || v.sheetOverrides === null) return false
  const validTopic = (topic: any) => topic && typeof topic.id === 'string' && typeof topic.title === 'string'
  if (!v.customSheets.every(sheet => sheet && typeof sheet.id === 'string' && typeof sheet.name === 'string' && typeof sheet.description === 'string' && Array.isArray(sheet.topics) && sheet.topics.every(validTopic))) return false
  if (!Object.values(v.sheetOverrides).every(override => override && typeof override.name === 'string' && (!override.description || typeof override.description === 'string') && Array.isArray(override.topics) && override.topics.every(validTopic))) return false
  if (!v.notes || typeof v.notes !== 'object' || Array.isArray(v.notes)) return false
  if (v.theme !== 'light' && v.theme !== 'dark') return false

  if (!Object.values(v.completed).every(item => typeof item === 'boolean')) return false
  return Object.values(v.notes).every(blocks =>
    Array.isArray(blocks) && blocks.every(block =>
      !!block && typeof block === 'object' &&
      typeof block.id === 'string' && typeof block.text === 'string' &&
      (block.type === 'heading' || block.type === 'text' || block.type === 'code')
    )
  )
}
