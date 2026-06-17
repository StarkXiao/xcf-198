import { describe, it, expect, beforeEach } from 'vitest'
import type { GameState } from '../types/game'
import type { Identity } from '../types/identity'
import type { GrowthTreeProgress } from '../types/growthTree'
import {
  createInitialGrowthProgress,
  checkNodeUnlockCondition,
  checkNodeCanUnlock,
  unlockNode,
  canUseActiveNode,
  decrementCooldowns,
  useActiveNode,
  getAvailableUnlockableNodes,
  getUnlockedPassiveEffects,
} from '../systems/growthTreeSystem'
import { getGrowthTreeByIdentityId } from '../data/growthTrees'
import { createDefaultReputation } from '../systems/reputationSystem'
import { createInitialTime } from '../systems/timeSystem'

const mockIdentity: Identity = {
  id: 'scholar',
  name: '大学教授',
  title: '米斯卡塔尼克的遗民',
  description: '测试身份',
  lore: '测试传说',
  icon: '📚',
  baseStats: {
    maxHp: 80,
    maxSanity: 120,
    startPollution: 10,
    startHunger: 60,
    startEnergy: 100,
  },
  startInventory: [],
  skills: [],
  startPosition: { x: 4, y: 3 },
}

function createMockState(): GameState {
  return {
    status: 'playing',
    time: createInitialTime(mockIdentity),
    stats: {
      hp: 80,
      maxHp: 80,
      sanity: 120,
      maxSanity: 120,
      pollution: 10,
      hunger: 60,
      energy: 100,
    },
    position: { x: 4, y: 3 },
    inventory: [],
    equippedItem: null,
    flags: {},
    discoveredTiles: ['camp_0', 'forest_1', 'forest_4'],
    triggeredEvents: [],
    unlockedEndings: [],
    currentEndingId: null,
    currentEventId: null,
    reputation: createDefaultReputation(),
  }
}

describe('GrowthTreeSystem', () => {
  let state: GameState
  let progress: GrowthTreeProgress
  const tree = getGrowthTreeByIdentityId('scholar')!

  beforeEach(() => {
    state = createMockState()
    progress = createInitialGrowthProgress()
  })

  describe('createInitialGrowthProgress', () => {
    it('应该创建初始进度对象', () => {
      const result = createInitialGrowthProgress()
      expect(result.unlockedNodes).toEqual([])
      expect(result.activeNodeCooldowns).toEqual({})
      expect(result.completedAchievements).toEqual([])
    })
  })

  describe('checkNodeUnlockCondition - event_triggered', () => {
    it('未触发事件时应返回未满足', () => {
      const result = checkNodeUnlockCondition(
        { type: 'event_triggered', eventId: 'event_ancient_ruins' },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })

    it('已触发事件时应返回满足', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      const result = checkNodeUnlockCondition(
        { type: 'event_triggered', eventId: 'event_ancient_ruins' },
        state,
        progress,
      )
      expect(result.satisfied).toBe(true)
    })
  })

  describe('checkNodeUnlockCondition - flag_set', () => {
    it('未设置标记时应返回未满足', () => {
      const result = checkNodeUnlockCondition(
        { type: 'flag_set', flagKey: 'deciphered_runes', flagValue: true },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })

    it('设置正确标记时应返回满足', () => {
      state.flags['deciphered_runes'] = true
      const result = checkNodeUnlockCondition(
        { type: 'flag_set', flagKey: 'deciphered_runes', flagValue: true },
        state,
        progress,
      )
      expect(result.satisfied).toBe(true)
    })

    it('设置错误值标记时应返回未满足', () => {
      state.flags['deciphered_runes'] = false
      const result = checkNodeUnlockCondition(
        { type: 'flag_set', flagKey: 'deciphered_runes', flagValue: true },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkNodeUnlockCondition - explore_count', () => {
    it('探索区域不足时应返回未满足', () => {
      const result = checkNodeUnlockCondition(
        { type: 'explore_count', exploreCount: 10 },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })

    it('探索区域足够时应返回满足', () => {
      const result = checkNodeUnlockCondition(
        { type: 'explore_count', exploreCount: 2 },
        state,
        progress,
      )
      expect(result.satisfied).toBe(true)
    })
  })

  describe('checkNodeUnlockCondition - day_reach', () => {
    it('天数不足时应返回未满足', () => {
      state.time.day = 2
      const result = checkNodeUnlockCondition(
        { type: 'day_reach', day: 5 },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })

    it('天数足够时应返回满足', () => {
      state.time.day = 5
      const result = checkNodeUnlockCondition(
        { type: 'day_reach', day: 3 },
        state,
        progress,
      )
      expect(result.satisfied).toBe(true)
    })
  })

  describe('checkNodeUnlockCondition - reputation_threshold', () => {
    it('声望不足时应返回未满足', () => {
      state.reputation.monastery = 10
      const result = checkNodeUnlockCondition(
        { type: 'reputation_threshold', factionId: 'monastery', value: 25 },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })

    it('声望足够时应返回满足', () => {
      state.reputation.monastery = 30
      const result = checkNodeUnlockCondition(
        { type: 'reputation_threshold', factionId: 'monastery', value: 25 },
        state,
        progress,
      )
      expect(result.satisfied).toBe(true)
    })
  })

  describe('checkNodeUnlockCondition - node_unlocked', () => {
    it('前置节点未解锁时应返回未满足', () => {
      const result = checkNodeUnlockCondition(
        { type: 'node_unlocked', nodeId: 'scholar_core_1' },
        state,
        progress,
      )
      expect(result.satisfied).toBe(false)
    })

    it('前置节点已解锁时应返回满足', () => {
      progress.unlockedNodes.push('scholar_core_1')
      const result = checkNodeUnlockCondition(
        { type: 'node_unlocked', nodeId: 'scholar_core_1' },
        state,
        progress,
      )
      expect(result.satisfied).toBe(true)
    })
  })

  describe('checkNodeCanUnlock', () => {
    it('已解锁的节点应返回无法解锁', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      progress.unlockedNodes.push('scholar_core_1')
      const node = tree.nodes.find(n => n.id === 'scholar_core_1')!
      const result = checkNodeCanUnlock(node, state, progress)
      expect(result.canUnlock).toBe(false)
    })

    it('条件全部满足时应返回可解锁', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      const node = tree.nodes.find(n => n.id === 'scholar_core_1')!
      const result = checkNodeCanUnlock(node, state, progress)
      expect(result.canUnlock).toBe(true)
      expect(result.satisfiedConditions).toBe(result.totalConditions)
    })

    it('条件部分满足且需要全部时应返回不可解锁', () => {
      const node = tree.nodes.find(n => n.id === 'scholar_know_2')!
      const result = checkNodeCanUnlock(node, state, progress)
      expect(result.canUnlock).toBe(false)
      expect(result.missingConditions.length).toBeGreaterThan(0)
    })
  })

  describe('unlockNode', () => {
    it('条件不满足时应解锁失败', () => {
      const result = unlockNode('scholar_core_1', state, progress, tree)
      expect(result.success).toBe(false)
      expect(result.progress.unlockedNodes.length).toBe(0)
    })

    it('条件满足时应解锁成功并添加成就', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      const result = unlockNode('scholar_core_1', state, progress, tree)
      expect(result.success).toBe(true)
      expect(result.progress.unlockedNodes).toContain('scholar_core_1')
      expect(result.achievement).toBeDefined()
      expect(result.achievement?.id).toBe('unlock_scholar_core_1')
      expect(result.progress.completedAchievements.length).toBe(1)
    })

    it('不存在的节点应解锁失败', () => {
      const result = unlockNode('nonexistent_node', state, progress, tree)
      expect(result.success).toBe(false)
    })
  })

  describe('canUseActiveNode', () => {
    it('无冷却时可使用', () => {
      expect(canUseActiveNode('scholar_ritual_3', progress)).toBe(true)
    })

    it('有冷却时不可使用', () => {
      progress.activeNodeCooldowns['scholar_ritual_3'] = 2
      expect(canUseActiveNode('scholar_ritual_3', progress)).toBe(false)
    })
  })

  describe('decrementCooldowns', () => {
    it('应该减少所有冷却值', () => {
      progress.activeNodeCooldowns = {
        'skill_1': 3,
        'skill_2': 1,
        'skill_3': 0,
      }
      const result = decrementCooldowns(progress)
      expect(result.activeNodeCooldowns['skill_1']).toBe(2)
      expect(result.activeNodeCooldowns['skill_2']).toBe(0)
      expect(result.activeNodeCooldowns['skill_3']).toBe(0)
    })

    it('冷却值不应低于0', () => {
      progress.activeNodeCooldowns = { 'skill_1': 0 }
      const result = decrementCooldowns(progress)
      expect(result.activeNodeCooldowns['skill_1']).toBe(0)
    })
  })

  describe('useActiveNode', () => {
    it('未解锁的主动技能应使用失败', () => {
      const result = useActiveNode('scholar_ritual_3', progress, tree)
      expect(result.success).toBe(false)
    })

    it('被动技能不能使用', () => {
      progress.unlockedNodes.push('scholar_core_1')
      const result = useActiveNode('scholar_core_1', progress, tree)
      expect(result.success).toBe(false)
    })

    it('冷却中不能使用', () => {
      progress.unlockedNodes.push('scholar_ritual_3')
      progress.activeNodeCooldowns['scholar_ritual_3'] = 2
      const result = useActiveNode('scholar_ritual_3', progress, tree)
      expect(result.success).toBe(false)
    })

    it('未冷却的已解锁主动技能应使用成功并设置冷却', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      state.flags['heard_whispers'] = true
      progress.unlockedNodes.push('scholar_core_1')
      progress.unlockedNodes.push('scholar_ritual_2')
      state.triggeredEvents.push('event_whisper_woods')
      progress.unlockedNodes.push('scholar_ritual_3')

      const result = useActiveNode('scholar_ritual_3', progress, tree)
      expect(result.success).toBe(true)
      const node = tree.nodes.find(n => n.id === 'scholar_ritual_3')!
      expect(result.progress.activeNodeCooldowns['scholar_ritual_3']).toBe(node.activeCooldown)
    })

    it('不存在的节点应使用失败', () => {
      const result = useActiveNode('nonexistent', progress, tree)
      expect(result.success).toBe(false)
    })
  })

  describe('getAvailableUnlockableNodes', () => {
    it('没有满足条件的节点时应返回空数组', () => {
      const result = getAvailableUnlockableNodes(state, progress, tree)
      expect(result.length).toBe(0)
    })

    it('有满足条件的节点时应返回这些节点', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      const result = getAvailableUnlockableNodes(state, progress, tree)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('scholar_core_1')
    })

    it('已解锁的节点不应出现在结果中', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      progress.unlockedNodes.push('scholar_core_1')
      const result = getAvailableUnlockableNodes(state, progress, tree)
      expect(result.find(n => n.id === 'scholar_core_1')).toBeUndefined()
    })
  })

  describe('getUnlockedPassiveEffects', () => {
    it('没有解锁节点时应返回空数组', () => {
      const result = getUnlockedPassiveEffects(progress, tree)
      expect(result.length).toBe(0)
    })

    it('应正确返回已解锁被动节点的效果', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      progress.unlockedNodes.push('scholar_core_1')
      const result = getUnlockedPassiveEffects(progress, tree)
      expect(result.length).toBe(1)
      expect(result[0].type).toBe('reduce_pollution_gain')
      expect(result[0].value).toBe(0.1)
    })

    it('主动节点不应返回效果', () => {
      state.triggeredEvents.push('event_ancient_ruins')
      progress.unlockedNodes.push('scholar_core_1')
      state.flags['heard_whispers'] = true
      progress.unlockedNodes.push('scholar_ritual_2')
      state.triggeredEvents.push('event_whisper_woods')
      progress.unlockedNodes.push('scholar_ritual_3')
      const passiveCount = progress.unlockedNodes
        .map(id => tree.nodes.find(n => n.id === id))
        .filter(n => n?.type === 'passive').length
      const result = getUnlockedPassiveEffects(progress, tree)
      expect(result.length).toBe(passiveCount)
    })
  })
})
