import type { FactionId } from './faction'

export type MerchantId = string

export type MerchantFactionPreference = 'neutral' | FactionId

export type MerchantCategory = 'wanderer' | 'abyssal' | 'monastery' | 'watcher' | 'legendary'

export type ForbiddenItemCategory = 'contraband' | 'intel' | 'rare_material'

export interface MerchantPrice {
  goldCoin?: number
  strangeStone?: number
  ancientRune?: number
  abyssPearl?: number
  monasterySeal?: number
  observerCrystal?: number
  barterItems?: { itemId: string; count: number }[]
}

export interface MerchantInventoryItem {
  itemId: string
  basePrice: MerchantPrice
  category: ForbiddenItemCategory
  stock: number
  maxStock: number
  minReputation?: { factionId: FactionId; value: number }
  requiredFlag?: string
  triggersEventOnBuy?: string
  description?: string
}

export interface Merchant {
  id: MerchantId
  name: string
  title: string
  icon: string
  description: string
  category: MerchantCategory
  factionPreference: MerchantFactionPreference
  preferredTiles: string[]
  encounterChance: number
  nightBonusChance: number
  minDayAppear: number
  minDangerLevel: number
  inventory: MerchantInventoryItem[]
  welcomeText: string
  departureText: string
  refuseDealText: string
  specialDialogue?: {
    flagKey: string
    text: string
  }[]
}

export interface MerchantTransactionResult {
  success: boolean
  boughtItemId?: string
  count: number
  messages: string[]
  triggeredEvent?: string
  reputationChanges?: { factionId: FactionId; value: number }[]
  statsChanges?: {
    sanity?: number
    pollution?: number
    hp?: number
  }
}

export interface MerchantEncounterInfo {
  merchantId: MerchantId
  tileId: string
  day: number
  phase: 'day' | 'night'
}

export interface MerchantState {
  currentMerchant: MerchantId | null
  encounterInfo: MerchantEncounterInfo | null
  merchantStockOverrides: Record<string, Record<string, number>>
  encounteredMerchants: Record<string, number>
  successfulDeals: Record<string, number>
}
