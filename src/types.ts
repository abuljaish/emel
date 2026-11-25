
export type SheetTopic = { id: string; number?: number; title: string }
export type CustomSheet = { id: string; name: string; description: string; topics: SheetTopic[] }
export type SheetOverride = { name: string; description?: string; topics: SheetTopic[]; deleted?: boolean }

export type NoteBlock =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'code'; text: string }

export type LearningState = {
  version: 3
  completed: Record<string, boolean>
  notes: Record<string, NoteBlock[]>
  theme: 'light' | 'dark'
  customSheets: CustomSheet[]
  sheetOverrides: Record<string, SheetOverride>
  lastBackup?: string
}

export type ActiveView = 'dashboard' | 'settings' | string
