import type { InvestigationEntry, InvestigationLogState, LogCategory, LogSource } from '../types/investigationLog'
import type { GameEvent, EventConsequence } from '../types/events'
import type { GameState } from '../types/game'

let entryCounter = 0

function generateEntryId(): string {
  entryCounter += 1
  return `ilog_${Date.now()}_${entryCounter}`
}

export function createInitialInvestigationLog(): InvestigationLogState {
  return {
    entries: [],
    discoveredTags: [],
    linkedClues: [],
  }
}

interface CategoryRule {
  category: LogCategory
  keywords: string[]
  eventTypes: string[]
  dangerCategories: string[]
  importance: number
  tags: string[]
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'anomaly',
    keywords: ['异变', '诡异', '不可名状', '深渊', '低语', '腐化', '异化', '触手', '旧日', '克苏鲁', '非欧', '维度', '裂隙', '扭曲', '疯狂', '不可视', '暗影'],
    eventTypes: ['vision', 'ritual'],
    dangerCategories: ['deadly'],
    importance: 3,
    tags: ['超自然', '不可解释'],
  },
  {
    category: 'clue',
    keywords: ['发现', '线索', '证据', '痕迹', '记录', '文献', '符文', '密文', '地图碎片', '日记', '残页', '密库', '隐藏', '秘密'],
    eventTypes: ['discovery'],
    dangerCategories: [],
    importance: 2,
    tags: ['可验证', '有指向性'],
  },
  {
    category: 'rumor',
    keywords: ['据说', '传闻', '有人说', '流言', '耳语', '告诫', '警告', '商贩', '旅人', '村民', '僧侣', '守望者'],
    eventTypes: ['encounter'],
    dangerCategories: [],
    importance: 1,
    tags: ['道听途说', '待验证'],
  },
  {
    category: 'observation',
    keywords: ['看到', '注意到', '观察', '环境', '天气', '地形', '植被', '建筑', '废墟', '遗迹', '湖泊', '洞穴'],
    eventTypes: ['exploration'],
    dangerCategories: [],
    importance: 1,
    tags: ['亲历', '环境'],
  },
]

function classifyEvent(event: GameEvent, messages: string[], dangerCategory?: string): { category: LogCategory; importance: number; tags: string[] } {
  let bestCategory: LogCategory = 'observation'
  let bestScore = 0
  let bestImportance = 1
  let bestTags: string[] = ['环境']

  const fullText = `${event.title} ${event.description} ${messages.join(' ')}`.toLowerCase()

  for (const rule of CATEGORY_RULES) {
    let score = 0

    if (rule.eventTypes.includes(event.type)) {
      score += 3
    }

    if (dangerCategory && rule.dangerCategories.includes(dangerCategory)) {
      score += 4
    }

    for (const keyword of rule.keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        score += 2
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestCategory = rule.category
      bestImportance = rule.importance
      bestTags = [...rule.tags]
    }
  }

  return { category: bestCategory, importance: bestImportance, tags: bestTags }
}

function extractTagsFromConsequences(consequences: EventConsequence[]): string[] {
  const tags: string[] = []
  for (const cons of consequences) {
    if (cons.type === 'set_flag' && cons.flagKey) {
      tags.push(cons.flagKey)
    }
    if (cons.type === 'change_reputation' && cons.factionId) {
      tags.push(`势力:${cons.factionId}`)
    }
    if (cons.type === 'unlock_ending' && cons.endingId) {
      tags.push('结局线索')
    }
    if (cons.type === 'trigger_event' && cons.eventId) {
      tags.push('连锁事件')
    }
  }
  return tags
}

function extractLocationTags(state: GameState): { locationName?: string; locationId?: string } {
  const currentTileId = state.discoveredTiles.length > 0
    ? state.discoveredTiles[state.discoveredTiles.length - 1]
    : undefined
  return {
    locationName: undefined,
    locationId: currentTileId,
  }
}

export function addEntryFromEvent(
  logState: InvestigationLogState,
  event: GameEvent,
  messages: string[],
  state: GameState,
  success: boolean,
  consequences?: EventConsequence[],
): InvestigationLogState {
  const classification = classifyEvent(event, messages, event.dangerCategory)

  const consequenceTags = consequences ? extractTagsFromConsequences(consequences) : []
  const allTags = [...new Set([...classification.tags, ...consequenceTags])]

  if (!success) {
    allTags.push('失败')
  }

  const locationInfo = extractLocationTags(state)

  const entry: InvestigationEntry = {
    id: generateEntryId(),
    category: classification.category,
    title: event.title,
    content: buildEntryContent(event, messages, success),
    source: 'event',
    sourceEventId: event.id,
    day: state.time.day,
    phase: state.time.phase,
    timestamp: Date.now(),
    tags: allTags,
    relatedEntries: [],
    isRead: false,
    importance: classification.importance,
    ...locationInfo,
  }

  const updatedEntries = [...logState.entries, entry]
  const updatedTags = [...new Set([...logState.discoveredTags, ...allTags])]

  return {
    ...logState,
    entries: updatedEntries,
    discoveredTags: updatedTags,
    linkedClues: updateLinkedClues(logState, entry),
  }
}

export function addEntryFromScouting(
  logState: InvestigationLogState,
  title: string,
  content: string,
  state: GameState,
  tileName?: string,
  tileId?: string,
): InvestigationLogState {
  const category: LogCategory = content.includes('陷阱') || content.includes('危险') ? 'anomaly' : 'observation'

  const entry: InvestigationEntry = {
    id: generateEntryId(),
    category,
    title,
    content,
    source: 'scout',
    day: state.time.day,
    phase: state.time.phase,
    timestamp: Date.now(),
    tags: ['侦查', category === 'anomaly' ? '危险' : '发现'],
    relatedEntries: [],
    isRead: false,
    importance: category === 'anomaly' ? 2 : 1,
    locationName: tileName,
    locationId: tileId,
  }

  const updatedEntries = [...logState.entries, entry]
  const updatedTags = [...new Set([...logState.discoveredTags, ...entry.tags])]

  return {
    ...logState,
    entries: updatedEntries,
    discoveredTags: updatedTags,
    linkedClues: updateLinkedClues(logState, entry),
  }
}

export function addEntryFromMerchant(
  logState: InvestigationLogState,
  title: string,
  content: string,
  state: GameState,
  merchantId?: string,
): InvestigationLogState {
  const entry: InvestigationEntry = {
    id: generateEntryId(),
    category: 'rumor',
    title,
    content,
    source: 'merchant',
    day: state.time.day,
    phase: state.time.phase,
    timestamp: Date.now(),
    tags: ['商贩', '交易', merchantId ? `商人:${merchantId}` : ''].filter(Boolean),
    relatedEntries: [],
    isRead: false,
    importance: 1,
  }

  const updatedEntries = [...logState.entries, entry]
  const updatedTags = [...new Set([...logState.discoveredTags, ...entry.tags])]

  return {
    ...logState,
    entries: updatedEntries,
    discoveredTags: updatedTags,
    linkedClues: logState.linkedClues,
  }
}

export function addEntryFromNight(
  logState: InvestigationLogState,
  title: string,
  content: string,
  state: GameState,
): InvestigationLogState {
  const category: LogCategory = content.includes('异变') || content.includes('诡异') || content.includes('腐化') ? 'anomaly' : 'observation'

  const entry: InvestigationEntry = {
    id: generateEntryId(),
    category,
    title,
    content,
    source: 'night',
    day: state.time.day,
    phase: 'night',
    timestamp: Date.now(),
    tags: ['夜间', category === 'anomaly' ? '超自然' : '防御'],
    relatedEntries: [],
    isRead: false,
    importance: category === 'anomaly' ? 3 : 1,
  }

  const updatedEntries = [...logState.entries, entry]
  const updatedTags = [...new Set([...logState.discoveredTags, ...entry.tags])]

  return {
    ...logState,
    entries: updatedEntries,
    discoveredTags: updatedTags,
    linkedClues: updateLinkedClues(logState, entry),
  }
}

export function addCustomEntry(
  logState: InvestigationLogState,
  category: LogCategory,
  title: string,
  content: string,
  source: LogSource,
  state: GameState,
  tags: string[] = [],
  importance: number = 1,
): InvestigationLogState {
  const entry: InvestigationEntry = {
    id: generateEntryId(),
    category,
    title,
    content,
    source,
    day: state.time.day,
    phase: state.time.phase,
    timestamp: Date.now(),
    tags,
    relatedEntries: [],
    isRead: false,
    importance,
  }

  const updatedEntries = [...logState.entries, entry]
  const updatedTags = [...new Set([...logState.discoveredTags, ...tags])]

  return {
    ...logState,
    entries: updatedEntries,
    discoveredTags: updatedTags,
    linkedClues: updateLinkedClues(logState, entry),
  }
}

function buildEntryContent(event: GameEvent, messages: string[], success: boolean): string {
  const parts: string[] = []

  if (event.description) {
    parts.push(event.description)
  }

  if (!success) {
    parts.push('【行动失败】')
  }

  const meaningfulMessages = messages.filter(m =>
    !m.startsWith('获得') &&
    !m.startsWith('失去') &&
    m.length > 5
  )

  if (meaningfulMessages.length > 0) {
    parts.push(...meaningfulMessages.slice(0, 3))
  }

  return parts.join('\n')
}

function updateLinkedClues(logState: InvestigationLogState, newEntry: InvestigationEntry): InvestigationLogState['linkedClues'] {
  const linkedClues = [...logState.linkedClues]

  const sameCategoryEntries = logState.entries.filter(
    e => e.category === newEntry.category && e.id !== newEntry.id
  )

  for (const existing of sameCategoryEntries) {
    const sharedTags = existing.tags.filter(t => newEntry.tags.includes(t))
    if (sharedTags.length >= 2) {
      const existingLink = linkedClues.find(lc =>
        lc.entryIds.includes(existing.id) && !lc.entryIds.includes(newEntry.id)
      )
      if (existingLink) {
        existingLink.entryIds.push(newEntry.id)
        if (existingLink.entryIds.length >= 3) {
          existingLink.completed = true
        }
      } else {
        linkedClues.push({
          id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          entryIds: [existing.id, newEntry.id],
          title: `关联: ${sharedTags.join(' & ')}`,
          description: `发现与「${sharedTags.join('、')}」相关的多条记录`,
          completed: false,
        })
      }
    }
  }

  return linkedClues
}

export function markEntryAsRead(logState: InvestigationLogState, entryId: string): InvestigationLogState {
  return {
    ...logState,
    entries: logState.entries.map(e =>
      e.id === entryId ? { ...e, isRead: true } : e
    ),
  }
}

export function markAllAsRead(logState: InvestigationLogState): InvestigationLogState {
  return {
    ...logState,
    entries: logState.entries.map(e => ({ ...e, isRead: true })),
  }
}

export function getUnreadCount(logState: InvestigationLogState): number {
  return logState.entries.filter(e => !e.isRead).length
}

export function getEntriesByCategory(logState: InvestigationLogState, category: LogCategory): InvestigationEntry[] {
  return logState.entries.filter(e => e.category === category)
}

export function searchEntries(logState: InvestigationLogState, query: string): InvestigationEntry[] {
  const q = query.toLowerCase()
  return logState.entries.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.content.toLowerCase().includes(q) ||
    e.tags.some(t => t.toLowerCase().includes(q))
  )
}

export function getRelatedEntries(logState: InvestigationLogState, entryId: string): InvestigationEntry[] {
  const linkedClue = logState.linkedClues.find(lc => lc.entryIds.includes(entryId))
  if (!linkedClue) return []
  return logState.entries.filter(e => linkedClue.entryIds.includes(e.id) && e.id !== entryId)
}
