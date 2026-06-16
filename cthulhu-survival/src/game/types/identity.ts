export interface Identity {
  id: string
  name: string
  title: string
  description: string
  lore: string
  icon: string
  baseStats: {
    maxHp: number
    maxSanity: number
    startPollution: number
    startHunger: number
    startEnergy: number
  }
  startInventory: string[]
  skills: IdentitySkill[]
  startPosition: { x: number; y: number }
}

export interface IdentitySkill {
  id: string
  name: string
  description: string
  type: 'passive' | 'active'
  effect: SkillEffect
}

export type SkillEffectType =
  | 'reduce_pollution_gain'
  | 'reduce_hunger_rate'
  | 'increase_action_points'
  | 'bonus_sanity_recovery'
  | 'bonus_craft_success'
  | 'reduce_damage_taken'
  | 'start_with_item'
  | 'reveal_map_area'

export interface SkillEffect {
  type: SkillEffectType
  value: number
}
