import type {
  QuestChain,
  QuestStep,
  QuestState,
  QuestProgressState,
  QuestCondition,
  QuestReward,
  QuestConsequence,
  QuestChainStatus,
  QuestStepStatus,
  QuestChoiceRecord,
} from '../types/events'
import type { GameState, PlayerStats } from '../types/game'
import type { InventoryItem } from '../types/items'
import type { ReputationMap } from '../types/faction'
import { QUEST_CHAINS, getQuestChainById, getQuestStepById } from '../data/questChains'
import { hasItem } from './craftSystem'
import { modifyReputation, checkReputationRequirement, checkReputationBelow } from './reputationSystem'
import { addToInventory, removeFromInventory } from './craftSystem'
import { clamp } from '../utils/random'

export function createInitialQuestState(): QuestState {
  return {}
}

export function getQuestStatus(questState: QuestState, questId: string): QuestChainStatus {
  const progress = questState[questId]
  return progress ? progress.status : 'locked'
}

export function getQuestStepStatus(questState: QuestState, questId: string, stepId: string): QuestStepStatus {
  const progress = questState[questId]
  if (!progress) return 'locked'

  if (progress.completedSteps.includes(stepId)) return 'completed'
  if (progress.failedSteps.includes(stepId)) return 'failed'
  if (progress.currentStepId === stepId) return 'in_progress'
  return 'locked'
}

export function checkQuestCondition(
  condition: QuestCondition,
  state: GameState,
  questState: QuestState,
): boolean {
  switch (condition.type) {
    case 'flag_set':
    case 'has_flag':
      return state.flags[condition.flagKey || ''] === condition.flagValue
    case 'flag_not_set':
      return state.flags[condition.flagKey || ''] !== condition.flagValue
    case 'day_above':
      return state.time.day >= (condition.value || 0)
    case 'day_below':
      return state.time.day <= (condition.value || 999)
    case 'pollution_above':
      return state.stats.pollution >= (condition.value || 0)
    case 'pollution_below':
      return state.stats.pollution <= (condition.value || 100)
    case 'sanity_above':
      return state.stats.sanity >= (condition.value || 0)
    case 'sanity_below':
      return state.stats.sanity <= (condition.value || 100)
    case 'has_item':
      return condition.itemId ? hasItem(state.inventory, condition.itemId, 1) : false
    case 'reputation_above':
      return condition.factionId ? checkReputationRequirement(state.reputation, condition.factionId, condition.value || 0) : false
    case 'reputation_below':
      return condition.factionId ? checkReputationBelow(state.reputation, condition.factionId, condition.value || 0) : false
    case 'quest_completed':
      return condition.questId ? getQuestStatus(questState, condition.questId) === 'completed' : false
    case 'quest_not_completed':
      return condition.questId ? getQuestStatus(questState, condition.questId) !== 'completed' : true
    case 'quest_step_reached':
      if (!condition.questId || !condition.stepId) return false
      return isStepReached(questState, condition.questId, condition.stepId)
    case 'quest_step_not_reached':
      if (!condition.questId || !condition.stepId) return true
      return !isStepReached(questState, condition.questId, condition.stepId)
    case 'event_triggered':
      return condition.eventId ? state.triggeredEvents.includes(condition.eventId) : false
    case 'event_not_triggered':
      return condition.eventId ? !state.triggeredEvents.includes(condition.eventId) : true
    default:
      return false
  }
}

export function checkAllConditions(
  conditions: QuestCondition[],
  state: GameState,
  questState: QuestState,
): boolean {
  return conditions.every(cond => checkQuestCondition(cond, state, questState))
}

export function isStepReached(questState: QuestState, questId: string, stepId: string): boolean {
  const progress = questState[questId]
  if (!progress) return false
  if (progress.completedSteps.includes(stepId)) return true
  if (progress.currentStepId === stepId) return true
  return false
}

export function getAvailableQuests(state: GameState, questState: QuestState): QuestChain[] {
  return QUEST_CHAINS.filter(quest => {
    const status = getQuestStatus(questState, quest.id)
    if (status === 'completed' && !quest.isRepeatable) return false
    if (status === 'in_progress') return true
    if (status === 'failed') return false
    return checkAllConditions(quest.startConditions, state, questState)
  })
}

export function getActiveQuests(questState: QuestState): QuestChain[] {
  return QUEST_CHAINS.filter(quest => {
    const status = getQuestStatus(questState, quest.id)
    return status === 'in_progress'
  })
}

export function getCompletedQuests(questState: QuestState): QuestChain[] {
  return QUEST_CHAINS.filter(quest => {
    const status = getQuestStatus(questState, quest.id)
    return status === 'completed'
  })
}

export function getCurrentStep(questState: QuestState, questId: string): QuestStep | null {
  const progress = questState[questId]
  if (!progress || !progress.currentStepId) return null
  return getQuestStepById(questId, progress.currentStepId) || null
}

export function startQuest(
  state: GameState,
  questState: QuestState,
  questId: string,
): {
  questState: QuestState
  success: boolean
  message?: string
} {
  const quest = getQuestChainById(questId)
  if (!quest) {
    return { questState, success: false, message: '任务不存在' }
  }

  const status = getQuestStatus(questState, questId)
  if (status === 'in_progress') {
    return { questState, success: false, message: '任务已在进行中' }
  }
  if (status === 'completed' && !quest.isRepeatable) {
    return { questState, success: false, message: '任务已完成，不可重复' }
  }

  if (!checkAllConditions(quest.startConditions, state, questState)) {
    return { questState, success: false, message: '不满足任务开始条件' }
  }

  const firstStep = quest.steps.find(s => s.stepIndex === 0)
  if (!firstStep) {
    return { questState, success: false, message: '任务没有起始步骤' }
  }

  const newProgress: QuestProgressState = {
    status: 'in_progress',
    currentStepId: firstStep.id,
    completedSteps: [],
    failedSteps: [],
    startedAtDay: state.time.day,
    choiceHistory: [],
  }

  return {
    questState: { ...questState, [questId]: newProgress },
    success: true,
    message: `任务开始：${quest.name}`,
  }
}

export function advanceQuestStep(
  state: GameState,
  questState: QuestState,
  questId: string,
  stepId: string,
  success: boolean = true,
): {
  questState: QuestState
  stats: PlayerStats
  inventory: InventoryItem[]
  reputation: ReputationMap
  flags: Record<string, boolean | number | string>
  unlockedEndings: string[]
  revealedTiles: string[]
  unlockedRecipes: string[]
  messages: string[]
} {
  let newQuestState = { ...questState }
  let stats = { ...state.stats }
  let inventory = [...state.inventory]
  let reputation = { ...state.reputation }
  let flags = { ...state.flags }
  const unlockedEndings: string[] = []
  const revealedTiles: string[] = []
  const unlockedRecipes: string[] = []
  const messages: string[] = []

  const quest = getQuestChainById(questId)
  const step = getQuestStepById(questId, stepId)
  const progress = questState[questId]

  if (!quest || !step || !progress) {
    return {
      questState: newQuestState,
      stats,
      inventory,
      reputation,
      flags,
      unlockedEndings,
      revealedTiles,
      unlockedRecipes,
      messages: ['任务或步骤不存在'],
    }
  }

  const newProgress = { ...progress }

  if (success) {
    newProgress.completedSteps = [...newProgress.completedSteps, stepId]
    messages.push(`步骤完成：${step.title}`)

    if (step.rewards) {
      const rewardResult = applyRewards(step.rewards, stats, inventory, reputation, flags, state)
      stats = rewardResult.stats
      inventory = rewardResult.inventory
      reputation = rewardResult.reputation
      flags = rewardResult.flags
      messages.push(...rewardResult.messages)
      if (rewardResult.unlockedEnding) unlockedEndings.push(rewardResult.unlockedEnding)
      if (rewardResult.revealedTile) revealedTiles.push(rewardResult.revealedTile)
      if (rewardResult.unlockedRecipe) unlockedRecipes.push(rewardResult.unlockedRecipe)
    }

    const nextStepId = step.nextStepOnSuccess
    if (nextStepId) {
      newProgress.currentStepId = nextStepId
    } else {
      const nextStep = quest.steps.find(s => s.stepIndex === step.stepIndex + 1)
      if (nextStep) {
        newProgress.currentStepId = nextStep.id
      } else {
        if (checkAllConditions(quest.completionConditions, state, newQuestState)) {
          newProgress.status = 'completed'
          newProgress.currentStepId = null
          newProgress.completedAtDay = state.time.day
          messages.push(`任务完成：${quest.name}`)

          const finalRewardResult = applyRewards(quest.rewards, stats, inventory, reputation, flags, state)
          stats = finalRewardResult.stats
          inventory = finalRewardResult.inventory
          reputation = finalRewardResult.reputation
          flags = finalRewardResult.flags
          messages.push(...finalRewardResult.messages)
          if (finalRewardResult.unlockedEnding) unlockedEndings.push(finalRewardResult.unlockedEnding)
          if (finalRewardResult.revealedTile) revealedTiles.push(finalRewardResult.revealedTile)
          if (finalRewardResult.unlockedRecipe) unlockedRecipes.push(finalRewardResult.unlockedRecipe)
        }
      }
    }
  } else {
    newProgress.failedSteps = [...newProgress.failedSteps, stepId]
    messages.push(`步骤失败：${step.title}`)

    if (step.failureRewards) {
      const failureResult = applyRewards(step.failureRewards, stats, inventory, reputation, flags, state)
      stats = failureResult.stats
      inventory = failureResult.inventory
      reputation = failureResult.reputation
      flags = failureResult.flags
      messages.push(...failureResult.messages)
    }

    const nextStepId = step.nextStepOnFailure
    if (nextStepId) {
      newProgress.currentStepId = nextStepId
    } else if (quest.failureConditions && checkAllConditions(quest.failureConditions, state, newQuestState)) {
      newProgress.status = 'failed'
      newProgress.currentStepId = null
      messages.push(`任务失败：${quest.name}`)
    }
  }

  newQuestState[questId] = newProgress

  return {
    questState: newQuestState,
    stats,
    inventory,
    reputation,
    flags,
    unlockedEndings,
    revealedTiles,
    unlockedRecipes,
    messages,
  }
}

export function failQuest(
  questState: QuestState,
  questId: string,
  day: number,
): QuestState {
  const progress = questState[questId]
  if (!progress) return questState

  return {
    ...questState,
    [questId]: {
      ...progress,
      status: 'failed' as const,
      currentStepId: null,
      completedAtDay: day,
    },
  }
}

export function completeQuest(
  state: GameState,
  questState: QuestState,
  questId: string,
): {
  questState: QuestState
  stats: PlayerStats
  inventory: InventoryItem[]
  reputation: ReputationMap
  flags: Record<string, boolean | number | string>
  unlockedEndings: string[]
  revealedTiles: string[]
  unlockedRecipes: string[]
  messages: string[]
} {
  const quest = getQuestChainById(questId)
  const progress = questState[questId]

  if (!quest || !progress) {
    return {
      questState,
      stats: { ...state.stats },
      inventory: [...state.inventory],
      reputation: { ...state.reputation },
      flags: { ...state.flags },
      unlockedEndings: [],
      revealedTiles: [],
      unlockedRecipes: [],
      messages: ['任务不存在'],
    }
  }

  let stats = { ...state.stats }
  let inventory = [...state.inventory]
  let reputation = { ...state.reputation }
  let flags = { ...state.flags }
  const unlockedEndings: string[] = []
  const revealedTiles: string[] = []
  const unlockedRecipes: string[] = []
  const messages: string[] = []

  const rewardResult = applyRewards(quest.rewards, stats, inventory, reputation, flags, state)
  stats = rewardResult.stats
  inventory = rewardResult.inventory
  reputation = rewardResult.reputation
  flags = rewardResult.flags
  messages.push(...rewardResult.messages)
  if (rewardResult.unlockedEnding) unlockedEndings.push(rewardResult.unlockedEnding)
  if (rewardResult.revealedTile) revealedTiles.push(rewardResult.revealedTile)
  if (rewardResult.unlockedRecipe) unlockedRecipes.push(rewardResult.unlockedRecipe)

  messages.push(`任务完成：${quest.name}`)

  const newQuestState = {
    ...questState,
    [questId]: {
      ...progress,
      status: 'completed' as const,
      currentStepId: null,
      completedAtDay: state.time.day,
    },
  }

  return {
    questState: newQuestState,
    stats,
    inventory,
    reputation,
    flags,
    unlockedEndings,
    revealedTiles,
    unlockedRecipes,
    messages,
  }
}

function applyRewards(
  rewards: QuestReward[],
  stats: PlayerStats,
  inventory: InventoryItem[],
  reputation: ReputationMap,
  flags: Record<string, boolean | number | string>,
  _state: GameState,
): {
  stats: PlayerStats
  inventory: InventoryItem[]
  reputation: ReputationMap
  flags: Record<string, boolean | number | string>
  messages: string[]
  unlockedEnding?: string
  revealedTile?: string
  unlockedRecipe?: string
} {
  let newStats = { ...stats }
  let newInventory = [...inventory]
  let newReputation = { ...reputation }
  let newFlags = { ...flags }
  const messages: string[] = []
  let unlockedEnding: string | undefined
  let revealedTile: string | undefined
  let unlockedRecipe: string | undefined

  for (const reward of rewards) {
    switch (reward.type) {
      case 'item':
        if (reward.itemId && reward.count) {
          newInventory = addToInventory(newInventory, reward.itemId, reward.count)
          messages.push(`获得物品：${reward.itemId} x${reward.count}`)
        }
        break
      case 'reputation':
        if (reward.factionId && reward.value) {
          newReputation = modifyReputation(newReputation, reward.factionId, reward.value)
          messages.push(`${reward.factionId} 声望 ${reward.value > 0 ? '+' : ''}${reward.value}`)
        }
        break
      case 'sanity':
        if (reward.value) {
          newStats.sanity = clamp(newStats.sanity + reward.value, 0, newStats.maxSanity)
          messages.push(`理智 ${reward.value > 0 ? '+' : ''}${reward.value}`)
        }
        break
      case 'pollution':
        if (reward.value) {
          newStats.pollution = clamp(newStats.pollution + reward.value, 0, 100)
          messages.push(`污染 ${reward.value > 0 ? '+' : ''}${reward.value}`)
        }
        break
      case 'hp':
        if (reward.value) {
          newStats.hp = clamp(newStats.hp + reward.value, 0, newStats.maxHp)
          messages.push(`生命 ${reward.value > 0 ? '+' : ''}${reward.value}`)
        }
        break
      case 'energy':
        if (reward.value) {
          newStats.energy = clamp(newStats.energy + reward.value, 0, 100)
          messages.push(`精力 ${reward.value > 0 ? '+' : ''}${reward.value}`)
        }
        break
      case 'hunger':
        if (reward.value) {
          newStats.hunger = clamp(newStats.hunger + reward.value, 0, 100)
          messages.push(`饥饿 ${reward.value > 0 ? '+' : ''}${reward.value}`)
        }
        break
      case 'recipe':
        if (reward.recipeId) {
          unlockedRecipe = reward.recipeId
          newFlags = { ...newFlags, [`unlock_${reward.recipeId}`]: true }
          messages.push(`解锁配方：${reward.recipeId}`)
        }
        break
      case 'tile':
        if (reward.tileId) {
          revealedTile = reward.tileId
          messages.push(`发现新区域`)
        }
        break
      case 'ending':
        if (reward.endingId) {
          unlockedEnding = reward.endingId
          messages.push(`解锁结局：${reward.endingId}`)
        }
        break
      case 'flag':
        if (reward.flagKey !== undefined) {
          newFlags = { ...newFlags, [reward.flagKey]: reward.flagValue ?? true }
        }
        break
    }
  }

  return {
    stats: newStats,
    inventory: newInventory,
    reputation: newReputation,
    flags: newFlags,
    messages,
    unlockedEnding,
    revealedTile,
    unlockedRecipe,
  }
}

export function applyQuestConsequences(
  consequences: QuestConsequence[],
  state: GameState,
  questState: QuestState,
): {
  questState: QuestState
  stats: PlayerStats
  inventory: InventoryItem[]
  reputation: ReputationMap
  flags: Record<string, boolean | number | string>
  unlockedEndings: string[]
  revealedTiles: string[]
  unlockedRecipes: string[]
  messages: string[]
} {
  let newQuestState = { ...questState }
  let stats = { ...state.stats }
  let inventory = [...state.inventory]
  let reputation = { ...state.reputation }
  let flags = { ...state.flags }
  const unlockedEndings: string[] = []
  const revealedTiles: string[] = []
  const unlockedRecipes: string[] = []
  const messages: string[] = []

  for (const cons of consequences) {
    switch (cons.type) {
      case 'set_flag':
        if (cons.flagKey !== undefined) {
          flags = { ...flags, [cons.flagKey]: cons.flagValue ?? true }
        }
        break
      case 'unset_flag':
        if (cons.flagKey) {
          const newFlags = { ...flags }
          delete newFlags[cons.flagKey]
          flags = newFlags
        }
        break
      case 'change_reputation':
        if (cons.factionId && cons.value) {
          reputation = modifyReputation(reputation, cons.factionId, cons.value)
          messages.push(`${cons.factionId} 声望 ${cons.value > 0 ? '+' : ''}${cons.value}`)
        }
        break
      case 'gain_item':
        if (cons.itemId && cons.count) {
          inventory = addToInventory(inventory, cons.itemId, cons.count)
          messages.push(`获得物品：${cons.itemId} x${cons.count}`)
        }
        break
      case 'lose_item':
        if (cons.itemId && cons.count) {
          inventory = removeFromInventory(inventory, cons.itemId, cons.count)
        }
        break
      case 'change_hp':
        if (cons.value) {
          stats.hp = clamp(stats.hp + cons.value, 0, stats.maxHp)
        }
        break
      case 'change_sanity':
        if (cons.value) {
          stats.sanity = clamp(stats.sanity + cons.value, 0, stats.maxSanity)
        }
        break
      case 'change_pollution':
        if (cons.value) {
          stats.pollution = clamp(stats.pollution + cons.value, 0, 100)
        }
        break
      case 'change_hunger':
        if (cons.value) {
          stats.hunger = clamp(stats.hunger + cons.value, 0, 100)
        }
        break
      case 'change_energy':
        if (cons.value) {
          stats.energy = clamp(stats.energy + cons.value, 0, 100)
        }
        break
      case 'unlock_ending':
        if (cons.endingId) {
          unlockedEndings.push(cons.endingId)
        }
        break
      case 'reveal_tile':
        if (cons.tileId) {
          revealedTiles.push(cons.tileId)
        }
        break
      case 'unlock_recipe':
        if (cons.recipeId) {
          unlockedRecipes.push(cons.recipeId)
          flags = { ...flags, [`unlock_${cons.recipeId}`]: true }
        }
        break
      case 'advance_quest':
        if (cons.questId && cons.stepId) {
          const result = advanceQuestStep(
            { ...state, stats, inventory, reputation, flags },
            newQuestState,
            cons.questId,
            cons.stepId,
            true,
          )
          newQuestState = result.questState
          stats = result.stats
          inventory = result.inventory
          reputation = result.reputation
          flags = result.flags
          unlockedEndings.push(...result.unlockedEndings)
          revealedTiles.push(...result.revealedTiles)
          unlockedRecipes.push(...result.unlockedRecipes)
          messages.push(...result.messages)
        }
        break
      case 'fail_quest':
        if (cons.questId) {
          newQuestState = failQuest(newQuestState, cons.questId, state.time.day)
          messages.push(`任务失败`)
        }
        break
      case 'complete_quest':
        if (cons.questId) {
          const result = completeQuest(
            { ...state, stats, inventory, reputation, flags },
            newQuestState,
            cons.questId,
          )
          newQuestState = result.questState
          stats = result.stats
          inventory = result.inventory
          reputation = result.reputation
          flags = result.flags
          unlockedEndings.push(...result.unlockedEndings)
          revealedTiles.push(...result.revealedTiles)
          unlockedRecipes.push(...result.unlockedRecipes)
          messages.push(...result.messages)
        }
        break
      case 'text_feedback':
        if (cons.text) {
          messages.push(cons.text)
        }
        break
    }
  }

  return {
    questState: newQuestState,
    stats,
    inventory,
    reputation,
    flags,
    unlockedEndings,
    revealedTiles,
    unlockedRecipes,
    messages,
  }
}

export function recordQuestChoice(
  questState: QuestState,
  questId: string,
  stepId: string,
  choiceId: string,
  day: number,
  success: boolean,
): QuestState {
  const progress = questState[questId]
  if (!progress) return questState

  const record: QuestChoiceRecord = {
    stepId,
    choiceId,
    day,
    success,
  }

  return {
    ...questState,
    [questId]: {
      ...progress,
      choiceHistory: [...progress.choiceHistory, record],
    },
  }
}

export function getQuestEventPoolEffects(
  questState: QuestState,
): { eventId: string; weightMultiplier: number; priorityBoost: number }[] {
  const effects: { eventId: string; weightMultiplier: number; priorityBoost: number }[] = []

  for (const quest of QUEST_CHAINS) {
    const progress = questState[quest.id]
    if (!progress || progress.status !== 'in_progress') continue

    const currentStep = getCurrentStep(questState, quest.id)
    if (currentStep?.eventTriggers) {
      for (const eventId of currentStep.eventTriggers) {
        effects.push({
          eventId,
          weightMultiplier: 3.0,
          priorityBoost: 10,
        })
      }
    }
  }

  return effects
}

export function updateQuestProgressOnDayChange(
  state: GameState,
  questState: QuestState,
): {
  questState: QuestState
  triggeredQuests: string[]
  messages: string[]
} {
  let newQuestState = { ...questState }
  const triggeredQuests: string[] = []
  const messages: string[] = []

  for (const quest of QUEST_CHAINS) {
    const status = getQuestStatus(newQuestState, quest.id)

    if (status === 'locked') {
      if (checkAllConditions(quest.startConditions, state, newQuestState)) {
        const startResult = startQuest(state, newQuestState, quest.id)
        if (startResult.success) {
          newQuestState = startResult.questState
          triggeredQuests.push(quest.id)
          if (startResult.message) messages.push(startResult.message)
        }
      }
    }
  }

  return { questState: newQuestState, triggeredQuests, messages }
}

export { getQuestChainById, getQuestStepById, QUEST_CHAINS }
