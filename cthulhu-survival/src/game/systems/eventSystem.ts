import type { GameEvent, EventChoice, EventConsequence } from '../types/events'
import type { PlayerStats, GameState } from '../types/game'
import type { InventoryItem } from '../types/items'
import type { Identity } from '../types/identity'
import type { ReputationMap } from '../types/faction'
import { EVENTS, getEventById } from '../data/events'
import { chance } from '../utils/random'
import { addToInventory, removeFromInventory, hasItem } from './craftSystem'
import { modifyHp, modifySanity, modifyHunger, modifyEnergy, applyPollutionEffect } from './pollutionSystem'
import { modifyReputation, checkReputationRequirement, checkReputationBelow } from './reputationSystem'
import { getReputationChangeDescription } from '../data/factions'

export interface EventResult {
  event: GameEvent
  choiceId: string
  success: boolean
  consequences: {
    stats: PlayerStats
    inventory: InventoryItem[]
    flags: Record<string, boolean | number | string>
    reputation: ReputationMap
    triggeredEvents: string[]
    unlockedEndings: string[]
    unlockedRecipes: string[]
    revealedTiles: string[]
    actionPointDelta: number
  }
  messages: string[]
}

export function shouldTriggerEvent(
  event: GameEvent,
  state: GameState,
  tileType?: string,
  tileId?: string,
): boolean {
  if (event.onceOnly && state.triggeredEvents.includes(event.id)) {
    return false
  }

  for (const cond of event.conditions) {
    switch (cond.type) {
      case 'reputation_above':
        if (cond.factionId && !checkReputationRequirement(state.reputation, cond.factionId, cond.value || 0)) return false
        break
      case 'reputation_below':
        if (cond.factionId && !checkReputationBelow(state.reputation, cond.factionId, cond.value || 0)) return false
        break
      case 'has_item':
        if (!cond.itemId || !hasItem(state.inventory, cond.itemId, 1)) return false
        break
      case 'has_flag':
        if (state.flags[cond.flagKey || ''] !== cond.flagValue) return false
        break
      case 'pollution_above':
        if (state.stats.pollution < (cond.value || 0)) return false
        break
      case 'sanity_below':
        if (state.stats.sanity > (cond.value || 100)) return false
        break
      case 'day_above':
        if (state.time.day < (cond.value || 0)) return false
        break
    }
  }

  const trigger = event.trigger
  switch (trigger.type) {
    case 'tile_enter':
      if (trigger.tileType && tileType !== trigger.tileType) return false
      if (trigger.tileId && tileId !== trigger.tileId) return false
      return true
    case 'phase_change':
      return true
    case 'pollution_threshold':
      return state.stats.pollution >= (trigger.threshold || 0)
    case 'day_reach':
      return state.time.day >= (trigger.day || 999)
    case 'random':
      return chance(trigger.chance || 0)
    case 'flag_set':
      return state.flags[trigger.flagKey || ''] === trigger.flagValue
    default:
      return false
  }
}

export function findTriggeredEvents(
  state: GameState,
  tileType?: string,
  tileId?: string,
): GameEvent[] {
  const triggered = EVENTS.filter(e => shouldTriggerEvent(e, state, tileType, tileId))
  return triggered.sort((a, b) => b.priority - a.priority)
}

export function checkChoiceRequirements(
  choice: EventChoice,
  inventory: InventoryItem[],
  stats: PlayerStats,
  identity: Identity,
  reputation: ReputationMap = { monastery: 0, deep_ones: 0, watchers: 0 },
): { available: boolean; reason?: string } {
  if (!choice.requirements) return { available: true }

  for (const req of choice.requirements) {
    switch (req.type) {
      case 'has_item':
        if (!req.itemId || !hasItem(inventory, req.itemId, 1)) {
          return { available: false, reason: `缺少物品` }
        }
        break
      case 'min_sanity':
        if (stats.sanity < (req.value || 0)) {
          return { available: false, reason: `理智不足` }
        }
        break
      case 'min_energy':
        if (stats.energy < (req.value || 0)) {
          return { available: false, reason: `精力不足` }
        }
        break
      case 'identity_skill':
        if (!identity.skills.some(s => s.id === req.skillId)) {
          return { available: false, reason: `不具备所需技能` }
        }
        break
      case 'min_reputation':
        if (!req.factionId || !checkReputationRequirement(reputation, req.factionId, req.value || 0)) {
          return { available: false, reason: `声望不足` }
        }
        break
    }
  }
  return { available: true }
}

export function executeEventChoice(
  event: GameEvent,
  choiceId: string,
  state: GameState,
  identity: Identity,
): EventResult | null {
  const choice = event.choices.find(c => c.id === choiceId)
  if (!choice) return null

  const success = choice.successRate !== undefined ? chance(choice.successRate) : true
  const messages: string[] = []

  let stats = { ...state.stats }
  let inventory = [...state.inventory]
  let flags = { ...state.flags }
  let reputation = { ...state.reputation }
  const triggeredEvents: string[] = []
  const unlockedEndings: string[] = []
  const unlockedRecipes: string[] = []
  const revealedTiles: string[] = []
  let actionPointDelta = 0

  const consequences = success ? choice.consequences : getFailureConsequences(choice)

  for (const cons of consequences) {
    const result = applyConsequence(cons, stats, inventory, flags, reputation, identity)
    stats = result.stats
    inventory = result.inventory
    flags = result.flags
    reputation = result.reputation
    if (result.message) messages.push(result.message)
    if (result.triggeredEvent) triggeredEvents.push(result.triggeredEvent)
    if (result.unlockedEnding) unlockedEndings.push(result.unlockedEnding)
    if (result.unlockedRecipe) unlockedRecipes.push(result.unlockedRecipe)
    if (result.revealedTile) revealedTiles.push(result.revealedTile)
    if (result.actionPointDelta !== undefined) actionPointDelta += result.actionPointDelta
  }

  if (!success) {
    messages.unshift('行动失败了...')
  }

  return {
    event,
    choiceId,
    success,
    consequences: {
      stats,
      inventory,
      flags,
      reputation,
      triggeredEvents,
      unlockedEndings,
      unlockedRecipes,
      revealedTiles,
      actionPointDelta,
    },
    messages,
  }
}

function getFailureConsequences(_choice: EventChoice): EventConsequence[] {
  return [
    { type: 'change_energy', value: -10 },
    { type: 'change_sanity', value: -5 },
    { type: 'text_feedback', text: '你失败了，付出了一些代价。' },
  ]
}

function applyConsequence(
  cons: EventConsequence,
  stats: PlayerStats,
  inventory: InventoryItem[],
  flags: Record<string, boolean | number | string>,
  reputation: ReputationMap,
  identity: Identity,
): {
  stats: PlayerStats
  inventory: InventoryItem[]
  flags: Record<string, boolean | number | string>
  reputation: ReputationMap
  message?: string
  triggeredEvent?: string
  unlockedEnding?: string
  unlockedRecipe?: string
  revealedTile?: string
  actionPointDelta?: number
} {
  let result: any = { stats, inventory, flags, reputation }

  switch (cons.type) {
    case 'gain_item':
      if (cons.itemId) {
        result.inventory = addToInventory(inventory, cons.itemId, cons.count || 1)
      }
      break
    case 'lose_item':
      if (cons.itemId) {
        result.inventory = removeFromInventory(inventory, cons.itemId, cons.count || 1)
      }
      break
    case 'change_hp':
      result.stats = modifyHp(stats, cons.value || 0, identity)
      break
    case 'change_sanity':
      result.stats = modifySanity(stats, cons.value || 0)
      break
    case 'change_pollution':
      result.stats = applyPollutionEffect(stats, cons.value || 0, identity)
      break
    case 'change_hunger':
      result.stats = modifyHunger(stats, cons.value || 0)
      break
    case 'change_energy':
      result.stats = modifyEnergy(stats, cons.value || 0)
      break
    case 'set_flag':
      if (cons.flagKey !== undefined) {
        result.flags = { ...flags, [cons.flagKey]: cons.flagValue ?? true }
      }
      break
    case 'trigger_event':
      if (cons.eventId) result.triggeredEvent = cons.eventId
      break
    case 'unlock_ending':
      if (cons.endingId) result.unlockedEnding = cons.endingId
      break
    case 'unlock_recipe':
      if (cons.recipeId) result.unlockedRecipe = cons.recipeId
      break
    case 'reveal_tile':
      if (cons.tileId) result.revealedTile = cons.tileId
      break
    case 'gain_action_points':
      result.actionPointDelta = cons.value || 0
      break
    case 'change_reputation':
      if (cons.factionId && cons.value) {
        result.reputation = modifyReputation(reputation, cons.factionId, cons.value)
        result.message = getReputationChangeDescription(cons.factionId, cons.value)
      }
      break
    case 'text_feedback':
      result.message = cons.text
      break
  }

  return result
}

export { getEventById }
