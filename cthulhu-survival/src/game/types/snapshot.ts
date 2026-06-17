import type { GameState } from './game'
import type { Identity } from './identity'
import type { InventoryItem } from './items'
import type { GrowthTreeProgress, GrowthAchievement } from './growthTree'
import type { Relic } from './relic'

export interface ChoiceRecord {
  choiceId: string
  choiceText: string
  success: boolean
}

export interface ChapterSnapshot {
  id: string
  timestamp: number
  day: number
  phase: 'day' | 'night'
  eventId: string
  eventTitle: string
  eventDescription: string
  choiceMade: ChoiceRecord | null
  state: GameState
  identity: Identity
  inventory: InventoryItem[]
  growthProgress: GrowthTreeProgress
  relic: Relic | null
  snapshotType: 'auto' | 'manual'
  isPreEventSnapshot: boolean
  parentSnapshotId: string | null
  description?: string
}

export interface SnapshotTimeline {
  snapshots: ChapterSnapshot[]
  currentSnapshotId: string | null
}

export interface PermanentUnlocks {
  unlockedEndings: string[]
  discoveredTiles: string[]
  triggeredEvents: string[]
  unlockedRecipes: string[]
  completedAchievements: GrowthAchievement[]
}
