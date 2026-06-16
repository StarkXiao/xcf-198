import type { FactionId } from './faction'

export type ItemType = 'material' | 'tool' | 'consumable' | 'artifact' | 'weapon'

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface Item {
  id: string
  name: string
  type: ItemType
  rarity: ItemRarity
  description: string
  icon: string
  stackable: boolean
  maxStack: number
  effects?: ItemEffect[]
  pollutionOnUse?: number
  sanityOnUse?: number
  hpOnUse?: number
  hungerOnUse?: number
  energyOnUse?: number
  discardable: boolean
  minDangerForDrop?: number
  maxDangerForDrop?: number
  maxDurability?: number
  durabilityCostPerUse?: number
  repairMaterials?: { itemId: string; count: number }[]
  repairAmount?: number
}

export interface LootTableEntry {
  itemId: string
  minCount: number
  maxCount: number
  weight: number
  minDanger?: number
  maxDanger?: number
}

export interface LootResult {
  itemId: string
  count: number
  qualityBonus: number
}

export type ItemEffectType = 'heal' | 'restore_sanity' | 'reduce_pollution' | 'restore_hunger' | 'restore_energy' | 'damage' | 'buff'

export interface ItemEffect {
  type: ItemEffectType
  value: number
  duration?: number
}

export interface InventoryItem {
  itemId: string
  count: number
  durability?: number
}

export interface CraftRecipe {
  id: string
  name: string
  description: string
  result: {
    itemId: string
    count: number
  }
  ingredients: {
    itemId: string
    count: number
  }[]
  requiredTool?: string
  pollutionCost: number
  sanityCost: number
  energyCost: number
  difficulty: number
  unlockedByDefault: boolean
  requiredFlag?: string
  requiredReputation?: {
    factionId: FactionId
    minReputation: number
  }
}
