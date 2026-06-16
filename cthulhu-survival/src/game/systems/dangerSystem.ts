import type { MapTile, DayPhase, DangerInfo, LootQualityModifier, ActionCostModifier, EventWeightModifier } from '../types/game'
import type { EventDangerCategory, GameEvent } from '../types/events'
import type { LootTableEntry, LootResult } from '../types/items'
import { clamp, weightedRandom, randomInt, chance } from '../utils/random'

export function calculateDangerInfo(
  tile: MapTile,
  phase: DayPhase,
  pollution: number
): DangerInfo {
  const tileDanger = tile.danger || 0
  const nightModifier = phase === 'night' ? 1.5 : 1.0
  const pollutionModifier = 1 + (pollution / 100) * 0.8

  const baseValue = tileDanger * 2
  const value = clamp(Math.round(baseValue * nightModifier * pollutionModifier), 0, 100)

  let level: DangerInfo['level']
  let description: string
  let color: string
  let icon: string

  if (value < 15) {
    level = 'safe'
    description = '这片区域暂时安全，你可以放松一些。'
    color = '#5ec98a'
    icon = '🛡️'
  } else if (value < 35) {
    level = 'low'
    description = '你察觉到一丝危险的气息，保持警惕。'
    color = '#a8d96e'
    icon = '⚠️'
  } else if (value < 55) {
    level = 'medium'
    description = '危险在这里徘徊，你需要小心行事。'
    color = '#d9a54c'
    icon = '⚡'
  } else if (value < 75) {
    level = 'high'
    description = '危险无处不在，稍有不慎便会万劫不复。'
    color = '#e68a4c'
    icon = '💀'
  } else {
    level = 'extreme'
    description = '这里是真正的深渊，活着离开都是奢望...'
    color = '#c44a4a'
    icon = '☠️'
  }

  return {
    level,
    value,
    tileDanger,
    nightModifier,
    pollutionModifier,
    description,
    color,
    icon,
  }
}

export function getDangerLevelNumber(level: DangerInfo['level']): number {
  const levels: Record<DangerInfo['level'], number> = {
    safe: 0,
    low: 1,
    medium: 2,
    high: 3,
    extreme: 4,
  }
  return levels[level]
}

export function calculateLootQualityModifier(dangerInfo: DangerInfo): LootQualityModifier {
  const dangerValue = dangerInfo.value
  const multiplier = 1 + (dangerValue / 100) * 0.8
  const rarityBoost = Math.floor(dangerValue / 25)

  let description: string
  if (dangerValue < 20) {
    description = '普通的收获'
  } else if (dangerValue < 50) {
    description = '不错的收获'
  } else if (dangerValue < 80) {
    description = '丰富的收获'
  } else {
    description = '珍贵的收获'
  }

  return { multiplier, rarityBoost, description }
}

export function calculateActionCostModifier(dangerInfo: DangerInfo): ActionCostModifier {
  const dangerValue = dangerInfo.value
  const movement = 1 + (dangerValue / 100) * 0.6
  const exploration = 1 + (dangerValue / 100) * 0.8
  const combat = 1 + (dangerValue / 100) * 1.0

  let description: string
  if (dangerValue < 20) {
    description = '行动自如'
  } else if (dangerValue < 50) {
    description = '略有阻碍'
  } else if (dangerValue < 80) {
    description = '举步维艰'
  } else {
    description = '寸步难行'
  }

  return { movement, exploration, combat, description }
}

export function calculateEventWeightModifier(dangerInfo: DangerInfo): EventWeightModifier {
  const dangerValue = dangerInfo.value

  const weirdEventMultiplier = 1 + (dangerValue / 100) * 2.5
  const dangerousEventMultiplier = 1 + (dangerValue / 100) * 3.0
  const beneficialEventMultiplier = Math.max(0.1, 1 - (dangerValue / 100) * 0.8)

  let description: string
  if (dangerValue < 20) {
    description = '平静无事'
  } else if (dangerValue < 50) {
    description = '异象频发'
  } else if (dangerValue < 80) {
    description = '危机四伏'
  } else {
    description = '大难临头'
  }

  return { weirdEventMultiplier, dangerousEventMultiplier, beneficialEventMultiplier, description }
}

export function getEventCategoryMultiplier(
  category: EventDangerCategory | undefined,
  weightModifier: EventWeightModifier
): number {
  switch (category) {
    case 'beneficial':
      return weightModifier.beneficialEventMultiplier
    case 'neutral':
      return 1.0
    case 'weird':
      return weightModifier.weirdEventMultiplier
    case 'dangerous':
    case 'deadly':
      return weightModifier.dangerousEventMultiplier
    default:
      return 1.0
  }
}

export function filterEventsByDanger(events: GameEvent[], dangerInfo: DangerInfo): GameEvent[] {
  const dangerLevelNum = getDangerLevelNumber(dangerInfo.level)

  return events.filter(event => {
    if (event.minDangerLevel !== undefined && dangerLevelNum < event.minDangerLevel) {
      return false
    }
    if (event.maxDangerLevel !== undefined && dangerLevelNum > event.maxDangerLevel) {
      return false
    }
    return true
  })
}

export function weightEventsByDanger(
  events: GameEvent[],
  dangerInfo: DangerInfo
): GameEvent[] {
  const weightModifier = calculateEventWeightModifier(dangerInfo)

  return events.map(event => {
    const baseWeight = event.weight || 1
    const categoryMultiplier = getEventCategoryMultiplier(event.dangerCategory, weightModifier)
    const adjustedWeight = baseWeight * categoryMultiplier

    return {
      ...event,
      weight: adjustedWeight,
    }
  })
}

export function selectWeightedEvent(events: GameEvent[]): GameEvent | null {
  if (events.length === 0) return null

  const weights = events.map(e => e.weight || 1)
  const index = weightedRandom(weights)

  return events[index] || events[0]
}

export function rollLoot(
  lootTable: LootTableEntry[],
  dangerInfo: DangerInfo,
  rolls: number = 1
): LootResult[] {
  const qualityModifier = calculateLootQualityModifier(dangerInfo)
  const results: LootResult[] = []
  const dangerValue = dangerInfo.value

  for (let i = 0; i < rolls; i++) {
    const eligibleEntries = lootTable.filter(entry => {
      if (entry.minDanger !== undefined && dangerValue < entry.minDanger) return false
      if (entry.maxDanger !== undefined && dangerValue > entry.maxDanger) return false
      return true
    })

    if (eligibleEntries.length === 0) continue

    const weights = eligibleEntries.map(e => e.weight)
    const selectedIndex = weightedRandom(weights)
    const selected = eligibleEntries[selectedIndex]

    if (!selected) continue

    let baseCount = randomInt(selected.minCount, selected.maxCount)
    let count = Math.round(baseCount * qualityModifier.multiplier)

    const qualityBonus = qualityModifier.rarityBoost

    results.push({
      itemId: selected.itemId,
      count: Math.max(1, count),
      qualityBonus,
    })
  }

  return results
}

export function calculateMovementCost(
  dangerInfo: DangerInfo,
  baseCost: number = 1
): number {
  const costModifier = calculateActionCostModifier(dangerInfo)
  return Math.max(1, Math.ceil(baseCost * costModifier.movement))
}

export function calculateExplorationCost(
  dangerInfo: DangerInfo,
  baseCost: number = 1
): number {
  const costModifier = calculateActionCostModifier(dangerInfo)
  return Math.max(1, Math.ceil(baseCost * costModifier.exploration))
}

export function calculateCombatCost(
  dangerInfo: DangerInfo,
  baseCost: number = 1
): number {
  const costModifier = calculateActionCostModifier(dangerInfo)
  return Math.max(1, Math.ceil(baseCost * costModifier.combat))
}

export function scaleSuccessRate(baseRate: number, dangerInfo: DangerInfo): number {
  const dangerValue = dangerInfo.value
  const penalty = 1 - (dangerValue / 100) * 0.3
  return clamp(baseRate * penalty, 0.05, 1.0)
}

export function scaleItemGainCount(baseCount: number, dangerInfo: DangerInfo): number {
  const quality = calculateLootQualityModifier(dangerInfo)
  return Math.max(1, Math.round(baseCount * quality.multiplier))
}

export function scaleStatChange(baseValue: number, dangerInfo: DangerInfo, statKind: string): number {
  const dangerValue = dangerInfo.value
  if (statKind === 'hp' || statKind === 'sanity' || statKind === 'energy') {
    if (baseValue < 0) {
      const amplify = 1 + (dangerValue / 100) * 0.5
      return Math.round(baseValue * amplify)
    }
    const dampen = Math.max(0.3, 1 - (dangerValue / 100) * 0.4)
    return Math.round(baseValue * dampen)
  }
  if (statKind === 'pollution') {
    if (baseValue > 0) {
      const amplify = 1 + (dangerValue / 100) * 0.6
      return Math.round(baseValue * amplify)
    }
    const dampen = Math.max(0.4, 1 - (dangerValue / 100) * 0.3)
    return Math.round(baseValue * dampen)
  }
  return baseValue
}

export function generateBonusLoot(
  tileResources: string[],
  dangerInfo: DangerInfo
): { itemId: string; count: number }[] {
  const results: { itemId: string; count: number }[] = []
  if (tileResources.length === 0) return results

  const dangerValue = dangerInfo.value
  const bonusChance = dangerValue / 100 * 0.4
  if (!chance(bonusChance)) return results

  const quality = calculateLootQualityModifier(dangerInfo)
  const pool = tileResources.filter(() => chance(0.6))
  if (pool.length === 0) return results

  for (const itemId of pool) {
    const count = Math.max(1, Math.round(quality.multiplier))
    results.push({ itemId, count })
  }

  return results
}
