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

export type EventDangerCategory = 'beneficial' | 'neutral' | 'weird' | 'dangerous' | 'deadly'

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
  weight?: number
  dangerCategory?: EventDangerCategory
  minDangerLevel?: number
  maxDangerLevel?: number
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
  type: 'has_item' | 'has_flag' | 'pollution_above' | 'sanity_below' | 'day_above' | 'identity_is' | 'reputation_above' | 'reputation_below' | 'quest_completed' | 'quest_not_completed' | 'quest_step_reached' | 'quest_step_not_reached' | 'quest_active' | 'quest_not_active'
  itemId?: string
  flagKey?: string
  flagValue?: boolean | number | string
  value?: number
  identityId?: string
  factionId?: FactionId
  questId?: string
  stepId?: string
}

export interface AlienationChoiceVariant {
  minLevel?: number
  text?: string
  description?: string
  consequences?: EventConsequence[]
  successRate?: number
}

export interface EventChoice {
  id: string
  text: string
  description?: string
  requirements?: EventChoiceRequirement[]
  consequences: EventConsequence[]
  successRate?: number
  alienationVariant?: AlienationChoiceVariant
}

export interface EventChoiceRequirement {
  type: 'has_item' | 'has_flag' | 'min_sanity' | 'min_energy' | 'identity_skill' | 'min_reputation' | 'quest_completed' | 'quest_step_reached' | 'quest_active'
  itemId?: string
  flagKey?: string
  value?: number
  skillId?: string
  factionId?: FactionId
  questId?: string
  stepId?: string
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
  | 'change_alienation_level'
  | 'change_permanent_corruption'
  | 'trigger_alienation'

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
  type: 'flag_set' | 'pollution_above' | 'pollution_below' | 'sanity_above' | 'sanity_below' | 'day_reach' | 'has_item' | 'hp_above' | 'reputation_above' | 'reputation_below' | 'quest_completed' | 'quest_step_reached'
  flagKey?: string
  flagValue?: boolean | number | string
  value?: number
  itemId?: string
  factionId?: FactionId
  questId?: string
  stepId?: string
}

export type QuestChainStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'failed'

export type QuestStepStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'failed'

export interface QuestChain {
  id: string
  name: string
  description: string
  faction?: FactionId
  priority: number
  steps: QuestStep[]
  startConditions: QuestCondition[]
  completionConditions: QuestCondition[]
  rewards: QuestReward[]
  failureConditions?: QuestCondition[]
  isRepeatable?: boolean
  unlocks?: QuestUnlock[]
}

export interface QuestStep {
  id: string
  title: string
  description: string
  stepIndex: number
  conditions: QuestCondition[]
  eventTriggers?: string[]
  choices?: QuestStepChoice[]
  rewards?: QuestReward[]
  failureConditions?: QuestCondition[]
  failureRewards?: QuestReward[]
  nextStepOnSuccess?: string
  nextStepOnFailure?: string
  isKeyDecision?: boolean
}

export interface QuestStepChoice {
  id: string
  text: string
  description?: string
  consequences: QuestConsequence[]
  nextStepId?: string
  isFailurePath?: boolean
}

export interface QuestCondition {
  type: 'flag_set' | 'has_flag' | 'flag_not_set' | 'day_above' | 'day_below' | 'pollution_above' | 'pollution_below' | 'sanity_above' | 'sanity_below' | 'has_item' | 'reputation_above' | 'reputation_below' | 'quest_completed' | 'quest_not_completed' | 'quest_step_reached' | 'quest_step_not_reached' | 'event_triggered' | 'event_not_triggered'
  flagKey?: string
  flagValue?: boolean | number | string
  value?: number
  itemId?: string
  factionId?: FactionId
  questId?: string
  stepId?: string
  eventId?: string
}

export interface QuestConsequence {
  type: 'set_flag' | 'unset_flag' | 'change_reputation' | 'gain_item' | 'lose_item' | 'change_hp' | 'change_sanity' | 'change_pollution' | 'change_hunger' | 'change_energy' | 'unlock_ending' | 'reveal_tile' | 'unlock_recipe' | 'advance_quest' | 'fail_quest' | 'complete_quest' | 'text_feedback'
  flagKey?: string
  flagValue?: boolean | number | string
  factionId?: FactionId
  value?: number
  itemId?: string
  count?: number
  endingId?: string
  tileId?: string
  recipeId?: string
  questId?: string
  stepId?: string
  text?: string
}

export interface QuestReward {
  type: 'item' | 'reputation' | 'sanity' | 'pollution' | 'hp' | 'energy' | 'hunger' | 'recipe' | 'tile' | 'ending' | 'flag'
  itemId?: string
  count?: number
  factionId?: FactionId
  value?: number
  recipeId?: string
  tileId?: string
  endingId?: string
  flagKey?: string
  flagValue?: boolean | number | string
}

export interface QuestUnlock {
  type: 'tile' | 'recipe' | 'event_pool' | 'ending'
  tileId?: string
  recipeId?: string
  eventPoolId?: string
  endingId?: string
}

export interface QuestState {
  [questId: string]: QuestProgressState
}

export interface QuestProgressState {
  status: QuestChainStatus
  currentStepId: string | null
  completedSteps: string[]
  failedSteps: string[]
  startedAtDay: number
  completedAtDay?: number
  choiceHistory: QuestChoiceRecord[]
}

export interface QuestChoiceRecord {
  stepId: string
  choiceId: string
  day: number
  success: boolean
}

export type EventPoolModifierType = 'add' | 'remove' | 'weight_boost' | 'weight_reduce'

export interface QuestEventPoolEffect {
  eventId: string
  effectType: EventPoolModifierType
  weightMultiplier?: number
  priorityBoost?: number
}

export interface EventConditionExtension {
  quest_completed?: string
  quest_not_completed?: string
  quest_step_reached?: { questId: string; stepId: string }
  quest_active?: string
}

export type EventChoiceRequirementType = EventChoiceRequirement['type'] | 'quest_completed' | 'quest_step_reached' | 'quest_active'
