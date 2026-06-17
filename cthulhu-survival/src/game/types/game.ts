import type { InventoryItem } from './items'
import type { ReputationMap } from './faction'
import type { QuestState } from './events'

export type DayPhase = 'day' | 'night'

export type DangerLevel = 'safe' | 'low' | 'medium' | 'high' | 'extreme'

export interface DangerInfo {
  level: DangerLevel
  value: number
  tileDanger: number
  nightModifier: number
  pollutionModifier: number
  description: string
  color: string
  icon: string
}

export interface LootQualityModifier {
  multiplier: number
  rarityBoost: number
  description: string
}

export interface ActionCostModifier {
  movement: number
  exploration: number
  combat: number
  description: string
}

export interface EventWeightModifier {
  weirdEventMultiplier: number
  dangerousEventMultiplier: number
  beneficialEventMultiplier: number
  description: string
}

export interface TimeState {
  day: number
  phase: DayPhase
  actionsLeft: number
  maxActionsPerPhase: number
}

export interface AlienationState {
  active: boolean
  level: number
  duration: number
  maxDuration: number
  permanentCorruption: number
}

export interface AlienationBuffs {
  maxHpBonus: number
  strengthBonus: number
  speedBonus: number
  pollutionResistanceBonus: number
  lootBonus: number
}

export interface AlienationDebuffs {
  sanityDrainPerPhase: number
  maxSanityReduction: number
  hungerIncrease: number
  socialPenalty: number
}

export interface PlayerStats {
  hp: number
  maxHp: number
  sanity: number
  maxSanity: number
  pollution: number
  hunger: number
  energy: number
  alienation: AlienationState
}

export type TileType = 'forest' | 'ruins' | 'lake' | 'cave' | 'village' | 'shrine' | 'camp'

export interface MapTile {
  id: string
  x: number
  y: number
  type: TileType
  name: string
  description: string
  explored: boolean
  danger: number
  resources: string[]
  hasEvent: boolean
  eventId?: string
}

export interface Position {
  x: number
  y: number
}

export interface GameFlag {
  key: string
  value: boolean | number | string
}

export type GameStatus = 'identity_select' | 'playing' | 'paused' | 'event' | 'crafting' | 'ending'

export interface GameState {
  status: GameStatus
  time: TimeState
  stats: PlayerStats
  position: Position
  inventory: InventoryItem[]
  equippedItem: string | null
  flags: Record<string, boolean | number | string>
  discoveredTiles: string[]
  triggeredEvents: string[]
  unlockedEndings: string[]
  currentEndingId: string | null
  currentEventId: string | null
  reputation: ReputationMap
  questState?: QuestState
}
