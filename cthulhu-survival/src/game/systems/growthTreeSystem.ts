import type {
  GrowthTree,
  GrowthNode,
  GrowthNodeUnlockCondition,
  GrowthTreeProgress,
  GrowthAchievement,
} from '../types/growthTree'
import type { GameState } from '../types/game'
import type { Identity, SkillEffect } from '../types/identity'
import { getGrowthTreeByIdentityId } from '../data/growthTrees'

export interface UnlockCheckResult {
  canUnlock: boolean
  satisfiedConditions: number
  totalConditions: number
  missingConditions: string[]
}

export function createInitialGrowthProgress(): GrowthTreeProgress {
  return {
    unlockedNodes: [],
    activeNodeCooldowns: {},
    completedAchievements: [],
  }
}

export function getGrowthTreeForIdentity(identity: Identity): GrowthTree | undefined {
  return getGrowthTreeByIdentityId(identity.id)
}

export function checkNodeUnlockCondition(
  condition: GrowthNodeUnlockCondition,
  state: GameState,
  progress: GrowthTreeProgress,
): { satisfied: boolean; description: string } {
  switch (condition.type) {
    case 'event_triggered': {
      const satisfied = condition.eventId
        ? state.triggeredEvents.includes(condition.eventId)
        : false
      return {
        satisfied,
        description: condition.eventId
          ? `触发事件: ${condition.eventId}`
          : '无效条件',
      }
    }
    case 'flag_set': {
      if (!condition.flagKey) return { satisfied: false, description: '无效条件' }
      const flagValue = state.flags[condition.flagKey]
      const satisfied =
        condition.flagValue !== undefined
          ? flagValue === condition.flagValue
          : flagValue !== undefined
      return {
        satisfied,
        description: `设置标记: ${condition.flagKey}${
          condition.flagValue !== undefined ? ` = ${String(condition.flagValue)}` : ''
        }`,
      }
    }
    case 'ending_unlocked': {
      const satisfied = condition.endingId
        ? state.unlockedEndings.includes(condition.endingId)
        : false
      return {
        satisfied,
        description: condition.endingId
          ? `解锁结局: ${condition.endingId}`
          : '无效条件',
      }
    }
    case 'explore_count': {
      const count = state.discoveredTiles.length
      const required = condition.exploreCount ?? 0
      return {
        satisfied: count >= required,
        description: `探索区域数量: ${count}/${required}`,
      }
    }
    case 'day_reach': {
      const required = condition.day ?? 0
      return {
        satisfied: state.time.day >= required,
        description: `存活天数: ${state.time.day}/${required}`,
      }
    }
    case 'reputation_threshold': {
      if (!condition.factionId) return { satisfied: false, description: '无效条件' }
      const current = state.reputation[condition.factionId as keyof typeof state.reputation] ?? 0
      const required = condition.value ?? 0
      return {
        satisfied: current >= required,
        description: `${condition.factionId}声望: ${current}/${required}`,
      }
    }
    case 'node_unlocked': {
      const satisfied = condition.nodeId
        ? progress.unlockedNodes.includes(condition.nodeId)
        : false
      return {
        satisfied,
        description: condition.nodeId
          ? `解锁前置能力: ${condition.nodeId}`
          : '无效条件',
      }
    }
    default:
      return { satisfied: false, description: '未知条件类型' }
  }
}

export function checkNodeCanUnlock(
  node: GrowthNode,
  state: GameState,
  progress: GrowthTreeProgress,
): UnlockCheckResult {
  if (progress.unlockedNodes.includes(node.id)) {
    return {
      canUnlock: false,
      satisfiedConditions: node.unlockConditions.length,
      totalConditions: node.unlockConditions.length,
      missingConditions: ['该能力已解锁'],
    }
  }

  const results = node.unlockConditions.map(c =>
    checkNodeUnlockCondition(c, state, progress),
  )

  const satisfiedCount = results.filter(r => r.satisfied).length
  const missing = results.filter(r => !r.satisfied).map(r => r.description)

  const canUnlock = node.requiresAllConditions
    ? satisfiedCount === node.unlockConditions.length
    : satisfiedCount > 0 && node.unlockConditions.length > 0

  return {
    canUnlock,
    satisfiedConditions: satisfiedCount,
    totalConditions: node.unlockConditions.length,
    missingConditions: missing,
  }
}

export function unlockNode(
  nodeId: string,
  state: GameState,
  progress: GrowthTreeProgress,
  tree: GrowthTree,
): {
  success: boolean
  progress: GrowthTreeProgress
  achievement?: GrowthAchievement
  message: string
} {
  const node = tree.nodes.find(n => n.id === nodeId)
  if (!node) {
    return { success: false, progress, message: '未找到该成长节点' }
  }

  const check = checkNodeCanUnlock(node, state, progress)
  if (!check.canUnlock) {
    return {
      success: false,
      progress,
      message: `解锁条件未满足: ${check.missingConditions.join(', ')}`,
    }
  }

  const newUnlocked = [...progress.unlockedNodes, nodeId]
  const achievement: GrowthAchievement = {
    id: `unlock_${nodeId}`,
    name: `解锁: ${node.name}`,
    description: node.description,
    icon: node.icon,
    unlockedAt: Date.now(),
    category: node.category === 'ritual'
      ? 'ritual'
      : node.category === 'combat'
      ? 'combat'
      : node.category === 'exploration' || node.category === 'knowledge'
      ? 'exploration'
      : 'event',
  }

  return {
    success: true,
    progress: {
      ...progress,
      unlockedNodes: newUnlocked,
      completedAchievements: [...progress.completedAchievements, achievement],
    },
    achievement,
    message: `🎉 解锁能力: ${node.name}! ${node.description}`,
  }
}

export function getUnlockedPassiveEffects(
  progress: GrowthTreeProgress,
  tree: GrowthTree,
): SkillEffect[] {
  const effects: SkillEffect[] = []
  for (const nodeId of progress.unlockedNodes) {
    const node = tree.nodes.find(n => n.id === nodeId)
    if (node && node.type === 'passive') {
      if (node.effect) {
        effects.push(node.effect)
      }
      if (node.effects) {
        effects.push(...node.effects)
      }
    }
  }
  return effects
}

export function getActiveNodes(
  progress: GrowthTreeProgress,
  tree: GrowthTree,
): GrowthNode[] {
  return progress.unlockedNodes
    .map(id => tree.nodes.find(n => n.id === id))
    .filter((n): n is GrowthNode => n !== undefined && n.type === 'active')
}

export function canUseActiveNode(
  nodeId: string,
  progress: GrowthTreeProgress,
): boolean {
  const cooldown = progress.activeNodeCooldowns[nodeId] ?? 0
  return cooldown <= 0
}

export function decrementCooldowns(progress: GrowthTreeProgress): GrowthTreeProgress {
  const newCooldowns: Record<string, number> = {}
  for (const [key, value] of Object.entries(progress.activeNodeCooldowns)) {
    newCooldowns[key] = Math.max(0, value - 1)
  }
  return {
    ...progress,
    activeNodeCooldowns: newCooldowns,
  }
}

export function useActiveNode(
  nodeId: string,
  progress: GrowthTreeProgress,
  tree: GrowthTree,
): {
  success: boolean
  progress: GrowthTreeProgress
  node?: GrowthNode
  message: string
} {
  const node = tree.nodes.find(n => n.id === nodeId)
  if (!node) {
    return { success: false, progress, message: '未找到该能力' }
  }
  if (node.type !== 'active') {
    return { success: false, progress, message: '该能力不是主动技能' }
  }
  if (!progress.unlockedNodes.includes(nodeId)) {
    return { success: false, progress, message: '尚未解锁该能力' }
  }
  if (!canUseActiveNode(nodeId, progress)) {
    return {
      success: false,
      progress,
      message: `能力冷却中，剩余 ${progress.activeNodeCooldowns[nodeId]} 阶段`,
    }
  }

  const newCooldowns = {
    ...progress.activeNodeCooldowns,
    [nodeId]: node.activeCooldown ?? 1,
  }

  return {
    success: true,
    progress: {
      ...progress,
      activeNodeCooldowns: newCooldowns,
    },
    node,
    message: `使用了 ${node.name}!`,
  }
}

export function getAvailableUnlockableNodes(
  state: GameState,
  progress: GrowthTreeProgress,
  tree: GrowthTree,
): GrowthNode[] {
  return tree.nodes.filter(node => {
    if (progress.unlockedNodes.includes(node.id)) return false
    const check = checkNodeCanUnlock(node, state, progress)
    return check.canUnlock
  })
}

export function getNodeBranchInfo(
  node: GrowthNode,
  tree: GrowthTree,
) {
  return tree.branches.find(b => b.id === node.branch)
}

export function mergePassiveEffectsWithIdentity(
  identityEffects: SkillEffect[],
  growthEffects: SkillEffect[],
): SkillEffect[] {
  const merged = [...identityEffects]
  for (const ge of growthEffects) {
    const existing = merged.findIndex(e => e.type === ge.type)
    if (existing >= 0) {
      merged[existing] = {
        type: ge.type,
        value: merged[existing].value + ge.value,
      }
    } else {
      merged.push({ ...ge })
    }
  }
  return merged
}
