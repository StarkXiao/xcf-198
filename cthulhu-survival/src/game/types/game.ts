import type { InventoryItem } from './items'

export type DayPhase = 'day' | 'night'

export interface TimeState {
  day: number
  phase: DayPhase
  actionsLeft: number
  maxActionsPerPhase: number
}

export interface PlayerStats {
  hp: number
  maxHp: number
  sanity: number
  maxSanity: number
  pollution: number
  hunger: number
  energy: number
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
}
