export type AffixRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type AffixType =
  | 'craft_success'
  | 'craft_yield'
  | 'effect_power'
  | 'durability_bonus'
  | 'pollution_reduction'
  | 'sanity_bonus'
  | 'energy_efficiency'
  | 'healing_boost'
  | 'loot_bonus'
  | 'damage_boost'

export interface Affix {
  id: string
  name: string
  type: AffixType
  rarity: AffixRarity
  description: string
  value: number
  icon: string
  allowedItemTypes?: string[]
  allowedItemIds?: string[]
}

export interface ItemAffixInstance {
  affixId: string
  value: number
}

export const AFFIX_RARITY_COLORS: Record<AffixRarity, string> = {
  common: '#9898b0',
  uncommon: '#5ec98a',
  rare: '#5a7abf',
  epic: '#a855bf',
  legendary: '#d9a54c',
}

export const AFFIX_RARITY_WEIGHTS: Record<AffixRarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1,
}
