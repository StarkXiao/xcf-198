import type { Ending, EndingRequirement } from '../types/events'
import type { GameState, PlayerStats } from '../types/game'
import type { InventoryItem } from '../types/items'
import { ENDINGS, getEndingById } from '../data/endings'
import { hasItem } from './craftSystem'

export function checkAvailableEndings(
  state: GameState,
  inventory: InventoryItem[],
): Ending[] {
  return ENDINGS.filter(ending =>
    ending.requirements.every(req => checkRequirement(req, state.stats, state.flags, inventory, state.time.day)),
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
    default:
      return false
  }
}

export { getEndingById, ENDINGS }
