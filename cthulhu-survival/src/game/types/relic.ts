import type { SkillEffect } from './identity'
import type { FactionId } from './faction'

export interface Relic {
  id: string
  name: string
  icon: string
  rarity: RelicRarity
  category: RelicCategory
  description: string
  lore: string
  effects: RelicEffect[]
  availableFor: string[]
}

export type RelicRarity = 'common' | 'rare' | 'legendary'

export type RelicCategory = 'resource' | 'ability' | 'story'

export interface RelicEffect {
  type: RelicEffectType
  value?: number
  itemId?: string
  itemCount?: number
  items?: { itemId: string; count: number }[]
  factionId?: FactionId
  reputation?: number
  flag?: string
  flagValue?: boolean | number | string
  stats?: Partial<{
    maxHp: number
    maxSanity: number
    startPollution: number
    startHunger: number
    startEnergy: number
  }>
  tileIds?: string[]
  position?: { x: number; y: number }
  skill?: SkillEffect
  eventId?: string
}

export type RelicEffectType =
  | 'bonus_start_items'
  | 'modify_base_stats'
  | 'reveal_tiles'
  | 'set_start_flag'
  | 'bonus_start_reputation'
  | 'add_passive_effect'
  | 'modify_start_position'
  | 'trigger_start_event'
  | 'bonus_start_actions'
  | 'merchant_discount'
  | 'unlock_recipe'
  | 'reduce_hunger_rate'
  | 'reduce_pollution_gain'
  | 'bonus_sanity_recovery'
  | 'increase_action_points'
  | 'reduce_damage_taken'
  | 'bonus_craft_success'
  | 'increase_max_inventory'
  | 'scouting_range_bonus'
  | 'faction_reputation_bonus_multiplier'

export interface RelicSelectionResult {
  relic: Relic | null
}
