import type { LearningState } from '../types'

export function exportBackup(state: LearningState) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `emel-backup-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text())
}
