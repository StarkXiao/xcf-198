import type { Ending, EndingRequirement, QuestState } from '../types/events'
import type { GameState, PlayerStats } from '../types/game'
import type { InventoryItem } from '../types/items'
import type { ReputationMap } from '../types/faction'
import { ENDINGS, getEndingById } from '../data/endings'
import { hasItem } from './craftSystem'
import { checkReputationRequirement, checkReputationBelow } from './reputationSystem'
import { getQuestStatus, isStepReached } from './questChainSystem'

export function checkAvailableEndings(
  state: GameState,
  inventory: InventoryItem[],
  questState?: QuestState,
): Ending[] {
  const qState = questState || state.questState || {}
  return ENDINGS.filter(ending =>
    ending.requirements.every(req => checkRequirement(req, state.stats, state.flags, inventory, state.time.day, state.reputation, qState)),
  )
}

export function checkForImmediateEnding(
  state: GameState,
): Ending | null {
  if (state.stats.hp <= 0) {
    return getEndingById('ending_death') || null
  }
  if (state.stats.sanity <= 0) {
    return getEndingById('ending_madness') || null
  }
  return null
}

function checkRequirement(
  req: EndingRequirement,
  stats: PlayerStats,
  flags: Record<string, boolean | number | string>,
  inventory: InventoryItem[],
  day: number,
  reputation: ReputationMap = { monastery: 0, deep_ones: 0, watchers: 0 },
  questState: QuestState = {},
): boolean {
  switch (req.type) {
    case 'flag_set':
      return flags[req.flagKey || ''] === req.flagValue
    case 'pollution_above':
      return stats.pollution >= (req.value || 0)
    case 'pollution_below':
      return stats.pollution <= (req.value || 100)
    case 'sanity_above':
      return stats.sanity >= (req.value || 0)
    case 'sanity_below':
      return stats.sanity <= (req.value || 100)
    case 'day_reach':
      return day >= (req.value || 0)
    case 'has_item':
      return hasItem(inventory, req.itemId || '', 1)
    case 'hp_above':
      return stats.hp >= (req.value || 0)
    case 'reputation_above':
      return req.factionId ? checkReputationRequirement(reputation, req.factionId, req.value || 0) : false
    case 'reputation_below':
      return req.factionId ? checkReputationBelow(reputation, req.factionId, req.value || 0) : false
    case 'quest_completed':
      return req.questId ? getQuestStatus(questState, req.questId) === 'completed' : false
    case 'quest_step_reached':
      return req.questId && req.stepId ? isStepReached(questState, req.questId, req.stepId) : false
    default:
      return false
  }
}

export { getEndingById, ENDINGS }
