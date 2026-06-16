export type FactionId = 'monastery' | 'deep_ones' | 'watchers'

export interface Faction {
  id: FactionId
  name: string
  icon: string
  description: string
  lore: string
  opposedFaction: FactionId
  reputationLevels: ReputationLevel[]
}

export interface ReputationLevel {
  minReputation: number
  name: string
  title: string
  color: string
}

export interface FactionReputation {
  factionId: FactionId
  value: number
}

export type ReputationMap = Record<FactionId, number>

export function createDefaultReputation(): ReputationMap {
  return {
    monastery: 0,
    deep_ones: 0,
    watchers: 0,
  }
}
