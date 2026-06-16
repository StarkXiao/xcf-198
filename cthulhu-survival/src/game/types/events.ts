import type { TileType } from './game'
import type { FactionId } from './faction'

export type EventType = 'exploration' | 'encounter' | 'vision' | 'ritual' | 'choice' | 'discovery'

export type EventTriggerType =
  | 'tile_enter'
  | 'phase_change'
  | 'pollution_threshold'
  | 'day_reach'
  | 'item_use'
  | 'random'
  | 'flag_set'

export interface GameEvent {
  id: string
  type: EventType
  title: string
  description: string
  trigger: EventTrigger
  conditions: EventCondition[]
  choices: EventChoice[]
  pollutionGain?: number
  sanityGain?: number
  onceOnly: boolean
  priority: number
}

export interface EventTrigger {
  type: EventTriggerType
  tileType?: TileType
  tileId?: string
  threshold?: number
  day?: number
  itemId?: string
  chance?: number
  flagKey?: string
  flagValue?: boolean | number | string
}

export interface EventCondition {
  type: 'has_item' | 'has_flag' | 'pollution_above' | 'sanity_below' | 'day_above' | 'identity_is' | 'reputation_above' | 'reputation_below'
  itemId?: string
  flagKey?: string
  flagValue?: boolean | number | string
  value?: number
  identityId?: string
  factionId?: FactionId
}

export interface EventChoice {
  id: string
  text: string
  description?: string
  requirements?: EventChoiceRequirement[]
  consequences: EventConsequence[]
  successRate?: number
}

export interface EventChoiceRequirement {
  type: 'has_item' | 'has_flag' | 'min_sanity' | 'min_energy' | 'identity_skill' | 'min_reputation'
  itemId?: string
  flagKey?: string
  value?: number
  skillId?: string
  factionId?: FactionId
}

export type ConsequenceType =
  | 'gain_item'
  | 'lose_item'
  | 'change_hp'
  | 'change_sanity'
  | 'change_pollution'
  | 'change_hunger'
  | 'change_energy'
  | 'set_flag'
  | 'trigger_event'
  | 'unlock_ending'
  | 'gain_action_points'
  | 'reveal_tile'
  | 'text_feedback'
  | 'unlock_recipe'
  | 'change_reputation'

export interface EventConsequence {
  type: ConsequenceType
  itemId?: string
  count?: number
  value?: number
  flagKey?: string
  flagValue?: boolean | number | string
  eventId?: string
  endingId?: string
  recipeId?: string
  tileId?: string
  text?: string
  factionId?: FactionId
}

export interface Ending {
  id: string
  name: string
  type: 'good' | 'neutral' | 'bad' | 'secret'
  description: string
  epilogue: string
  requirements: EndingRequirement[]
  image?: string
}

export interface EndingRequirement {
  type: 'flag_set' | 'pollution_above' | 'pollution_below' | 'sanity_above' | 'sanity_below' | 'day_reach' | 'has_item' | 'hp_above' | 'reputation_above' | 'reputation_below'
  flagKey?: string
  flagValue?: boolean | number | string
  value?: number
  itemId?: string
  factionId?: FactionId
}
