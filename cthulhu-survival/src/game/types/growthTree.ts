import type { SkillEffect, SkillEffectType } from './identity'

export type GrowthNodeCategory = 'core' | 'exploration' | 'combat' | 'ritual' | 'knowledge' | 'survival'

export type GrowthNodeUnlockSource =
  | 'event_triggered'
  | 'flag_set'
  | 'ending_unlocked'
  | 'explore_count'
  | 'day_reach'
  | 'reputation_threshold'
  | 'node_unlocked'

export interface GrowthNodeUnlockCondition {
  type: GrowthNodeUnlockSource
  eventId?: string
  flagKey?: string
  flagValue?: boolean | number | string
  endingId?: string
  exploreCount?: number
  day?: number
  factionId?: string
  value?: number
  nodeId?: string
}

export interface GrowthNode {
  id: string
  name: string
  description: string
  icon: string
  category: GrowthNodeCategory
  tier: number
  branch: string
  position: { x: number; y: number }
  type: 'active' | 'passive'
  effect?: SkillEffect
  effects?: SkillEffect[]
  activeCooldown?: number
  unlockConditions: GrowthNodeUnlockCondition[]
  requiresAllConditions?: boolean
  children: string[]
  parents: string[]
  lore?: string
}

export interface GrowthTree {
  identityId: string
  name: string
  description: string
  branches: GrowthBranch[]
  nodes: GrowthNode[]
}

export interface GrowthBranch {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

export interface GrowthTreeProgress {
  unlockedNodes: string[]
  activeNodeCooldowns: Record<string, number>
  completedAchievements: GrowthAchievement[]
}

export interface GrowthAchievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: number
  category: 'exploration' | 'event' | 'ending' | 'combat' | 'ritual'
}

export interface UnlockableSkillEffect {
  type: SkillEffectType
  value: number
}
