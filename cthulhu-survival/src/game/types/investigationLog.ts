export type LogCategory = 'clue' | 'rumor' | 'observation' | 'anomaly'

export type LogSource = 'event' | 'scout' | 'merchant' | 'night' | 'craft' | 'quest' | 'system'

export interface InvestigationEntry {
  id: string
  category: LogCategory
  title: string
  content: string
  source: LogSource
  sourceEventId?: string
  day: number
  phase: 'day' | 'night'
  timestamp: number
  tags: string[]
  relatedEntries: string[]
  isRead: boolean
  importance: number
  locationName?: string
  locationId?: string
}

export interface InvestigationLogState {
  entries: InvestigationEntry[]
  discoveredTags: string[]
  linkedClues: LinkedClue[]
}

export interface LinkedClue {
  id: string
  entryIds: string[]
  title: string
  description: string
  completed: boolean
}

export const LOG_CATEGORY_META: Record<LogCategory, { label: string; icon: string; color: string; description: string }> = {
  clue: {
    label: '线索',
    icon: '🔍',
    color: '#5ec98a',
    description: '有明确指向性的证据和发现',
  },
  rumor: {
    label: '传闻',
    icon: '💬',
    color: '#d9a54c',
    description: '来自NPC或环境的道听途说',
  },
  observation: {
    label: '见闻',
    icon: '👁️',
    color: '#5a7abf',
    description: '亲眼所见的环境与事物',
  },
  anomaly: {
    label: '异常',
    icon: '⚠️',
    color: '#c44a4a',
    description: '无法用常理解释的诡异现象',
  },
}
