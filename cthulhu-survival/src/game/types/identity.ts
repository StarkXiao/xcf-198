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
  scoutingSpecialty: IdentityScoutingSpecialty
}

export interface ScoutingBonuses {
  hiddenChanceBonus: number
  trapChanceBonus: number
  resourceChanceBonus: number
  disarmChanceBonus: number
  revealRadiusBonus: number
  energyCostReduction: number
  hiddenLootMultiplier: number
  specialResourceBonus: number
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
  | 'scouting_hidden_bonus'
  | 'scouting_trap_bonus'
  | 'scouting_resource_bonus'
  | 'trap_disarm_bonus'
  | 'reveal_radius_increase'
  | 'scouting_energy_cost_reduction'
  | 'identity_specific_scouting'

export type IdentityScoutingSpecialty = 'scholar' | 'detective' | 'priest' | 'hunter' | null

export interface SkillEffect {
  type: SkillEffectType
  value: number
}
