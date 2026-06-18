import type { PlayerStats, MapTile } from '../types/game'
import type { SkillEffect } from '../types/identity'
import type { InventoryItem } from '../types/items'
import type {
  NightDefenseConfig,
  NightDefenseResult,
  NightDefenseState,
  InvasionWave,
  PlacedTrap,
  TrapSlot,
  DefenseStrategy,
  SupplyAllocation,
} from '../types/nightDefense'
import { DEFENSE_STRATEGY_INFO, DEFENSE_ITEM_MAP, createInitialNightDefense } from '../types/nightDefense'
import { clamp, randomInt, chance, weightedRandom } from '../utils/random'

export { createInitialNightDefense }

export function setDefenseStrategy(state: NightDefenseState, strategy: DefenseStrategy): NightDefenseState {
  return {
    ...state,
    config: {
      ...state.config,
      strategy,
    },
  }
}

export function placeTrap(
  state: NightDefenseState,
  slot: TrapSlot,
  itemId: string,
  inventory: InventoryItem[],
): { state: NightDefenseState; success: boolean; message: string } {
  if (state.config.traps.some(t => t.slot === slot)) {
    return { state, success: false, message: '该方向已经布置了陷阱' }
  }

  if (state.config.traps.length >= 4) {
    return { state, success: false, message: '陷阱位已满' }
  }

  if (state.config.defenseActionsSpent >= state.config.maxDefenseActions) {
    return { state, success: false, message: '防御行动次数已用完' }
  }

  const trapInfo = DEFENSE_ITEM_MAP[itemId]
  if (!trapInfo) {
    return { state, success: false, message: '该物品不能作为陷阱布置' }
  }

  const invItem = inventory.find(i => i.itemId === itemId)
  if (!invItem || invItem.count <= 0) {
    return { state, success: false, message: '没有该物品' }
  }

  const itemData = getItemName(itemId)
  const trap: PlacedTrap = {
    slot,
    itemId,
    name: itemData,
    damage: trapInfo.damage,
    sanityDamage: trapInfo.sanityDamage,
    trapType: trapInfo.trapType,
    consumed: false,
  }

  return {
    state: {
      ...state,
      config: {
        ...state.config,
        traps: [...state.config.traps, trap],
        defenseActionsSpent: state.config.defenseActionsSpent + 1,
      },
    },
    success: true,
    message: `在${slot === 'north' ? '北面' : slot === 'east' ? '东面' : slot === 'south' ? '南面' : '西面'}布置了${itemData}`,
  }
}

export function removeTrap(state: NightDefenseState, slot: TrapSlot): { state: NightDefenseState; removedTrap: PlacedTrap | null } {
  const trapIndex = state.config.traps.findIndex(t => t.slot === slot)
  if (trapIndex === -1) return { state, removedTrap: null }

  const removed = state.config.traps[trapIndex]
  const newTraps = state.config.traps.filter(t => t.slot !== slot)

  return {
    state: {
      ...state,
      config: {
        ...state.config,
        traps: newTraps,
        defenseActionsSpent: Math.max(0, state.config.defenseActionsSpent - 1),
      },
    },
    removedTrap: removed,
  }
}

export function allocateSupplies(
  state: NightDefenseState,
  type: keyof SupplyAllocation,
  amount: number,
  inventory: InventoryItem[],
): { state: NightDefenseState; success: boolean; message: string } {
  const supplyMap: Record<keyof SupplyAllocation, string> = {
    foodUsed: 'cooked_meat',
    torchUsed: 'torch',
    herbUsed: 'dried_herb',
  }

  const itemId = supplyMap[type]
  const invItem = inventory.find(i => i.itemId === itemId)
  const available = invItem ? invItem.count : 0
  const currentUsed = state.config.supplies[type]

  const newAmount = Math.max(0, Math.min(currentUsed + amount, available))

  const actionSpent = state.config.defenseActionsSpent
  const newActionSpent = amount > 0 ? actionSpent + 1 : actionSpent

  if (newActionSpent > state.config.maxDefenseActions && amount > 0) {
    return { state, success: false, message: '防御行动次数已用完' }
  }

  return {
    state: {
      ...state,
      config: {
        ...state.config,
        supplies: {
          ...state.config.supplies,
          [type]: newAmount,
        },
        defenseActionsSpent: newActionSpent,
      },
    },
    success: true,
    message: amount > 0 ? `分配了${getItemName(itemId)}x${Math.abs(amount)}` : `收回了${getItemName(itemId)}`,
  }
}

export function calculateInvasionWaves(
  config: NightDefenseConfig,
  dangerValue: number,
  pollution: number,
  stats: PlayerStats,
  growthEffects: SkillEffect[] = [],
): InvasionWave[] {
  const waves: InvasionWave[] = []
  const numWaves = Math.max(1, Math.min(4, Math.ceil(dangerValue / 25)))

  const strategyInfo = DEFENSE_STRATEGY_INFO[config.strategy]
  const defenseMultiplier = 1 - strategyInfo.defenseBonus

  const supplyBonus = calculateSupplyDefenseBonus(config.supplies)

  for (let i = 0; i < numWaves; i++) {
    const directions: TrapSlot[] = ['north', 'east', 'south', 'west']
    const direction = directions[randomInt(0, directions.length - 1)]

    const isEldritch = pollution > 50 && chance(0.3)
    const isMixed = !isEldritch && chance(0.2)
    const type: InvasionWave['type'] = isEldritch ? 'eldritch' : isMixed ? 'mixed' : 'physical'

    const baseStrength = dangerValue / 20 + randomInt(1, 3)
    const strength = Math.round(baseStrength * (1 + pollution / 200))

    let baseDamage = Math.round(strength * (type === 'eldritch' ? 1.5 : type === 'mixed' ? 1.2 : 1.0))
    let baseSanityDamage = type === 'eldritch' ? Math.round(strength * 0.8) : type === 'mixed' ? Math.round(strength * 0.4) : 0
    let basePollutionDamage = type === 'eldritch' ? Math.round(strength * 0.5) : type === 'mixed' ? Math.round(strength * 0.2) : 0

    baseDamage = Math.max(0, Math.round(baseDamage * defenseMultiplier * (1 - supplyBonus.damageReduction)))
    baseSanityDamage = Math.max(0, Math.round(baseSanityDamage * defenseMultiplier * (1 - supplyBonus.sanityReduction)))
    basePollutionDamage = Math.max(0, Math.round(basePollutionDamage * defenseMultiplier))

    const trap = config.traps.find(t => t.slot === direction && !t.consumed)
    let trapTriggered = false
    let trapDamage = 0
    let netDamage = baseDamage
    let netSanityDamage = baseSanityDamage
    let netPollutionDamage = basePollutionDamage

    if (trap) {
      trapTriggered = chance(0.7 + (supplyBonus.trapBonus * 0.1))
      if (trapTriggered) {
        trapDamage = trap.damage
        if (type === 'eldritch' && trap.trapType === 'holy') {
          trapDamage = Math.round(trapDamage * 1.5)
        } else if (type === 'physical' && trap.trapType === 'eldritch') {
          trapDamage = Math.round(trapDamage * 1.3)
        }
        netDamage = Math.max(0, baseDamage - trapDamage)
        netSanityDamage = Math.max(0, baseSanityDamage - trap.sanityDamage)
      }
    }

    const desc = buildWaveDescription(type, direction, strength, trapTriggered, trapDamage, netDamage)

    waves.push({
      direction,
      strength,
      type,
      damage: baseDamage,
      sanityDamage: baseSanityDamage,
      pollutionDamage: basePollutionDamage,
      trapTriggered,
      trapDamage,
      netDamage,
      netSanityDamage,
      netPollutionDamage,
      description: desc,
    })
  }

  return waves
}

function calculateSupplyDefenseBonus(supplies: SupplyAllocation): {
  damageReduction: number
  sanityReduction: number
  trapBonus: number
} {
  let damageReduction = 0
  let sanityReduction = 0
  let trapBonus = 0

  damageReduction += supplies.foodUsed * 0.05
  damageReduction += supplies.torchUsed * 0.08
  sanityReduction += supplies.torchUsed * 0.1
  sanityReduction += supplies.herbUsed * 0.08
  trapBonus += supplies.herbUsed * 0.1

  return { damageReduction, sanityReduction, trapBonus }
}

function buildWaveDescription(
  type: InvasionWave['type'],
  direction: number | string,
  strength: number,
  trapTriggered: boolean,
  trapDamage: number,
  netDamage: number,
): string {
  const dirLabel = direction === 'north' ? '北面' : direction === 'east' ? '东面' : direction === 'south' ? '南面' : '西面'
  const typeLabel = type === 'eldritch' ? '深渊造物' : type === 'mixed' ? '异变生物' : '暗影掠食者'
  const strengthLabel = strength >= 5 ? '强大' : strength >= 3 ? '中等' : '微弱'

  let desc = `${dirLabel}出现了${strengthLabel}的${typeLabel}`
  if (trapTriggered) {
    desc += `，陷阱造成了${trapDamage}点伤害！`
    if (netDamage <= 0) {
      desc += ' 陷阱完全挡住了这次侵袭！'
    }
  } else {
    desc += '。'
  }

  return desc
}

export function simulateNight(
  config: NightDefenseConfig,
  dangerValue: number,
  pollution: number,
  stats: PlayerStats,
  growthEffects: SkillEffect[] = [],
): NightDefenseResult {
  const waves = calculateInvasionWaves(config, dangerValue, pollution, stats, growthEffects)
  const messages: string[] = []

  let totalHpDamage = 0
  let totalSanityDamage = 0
  let totalPollutionDamage = 0
  const trapsConsumed: string[] = []

  const strategyInfo = DEFENSE_STRATEGY_INFO[config.strategy]
  totalSanityDamage += Math.abs(strategyInfo.sanityEffect)

  const supplyBonus = calculateSupplyDefenseBonus(config.supplies)

  messages.push(`🌙 夜幕降临，你选择了「${strategyInfo.name}」策略。`)

  for (const wave of waves) {
    totalHpDamage += wave.netDamage
    totalSanityDamage += wave.netSanityDamage
    totalPollutionDamage += wave.netPollutionDamage
    messages.push(wave.description)

    if (wave.trapTriggered) {
      const trap = config.traps.find(t => t.slot === wave.direction && !t.consumed)
      if (trap) {
        trapsConsumed.push(trap.itemId)
        trap.consumed = true
      }
    }
  }

  const campDamage = Math.max(0, Math.round(totalHpDamage * 0.3 - supplyBonus.damageReduction * 10))
  const safetyModifier = calculateSafetyModifier(totalHpDamage, totalSanityDamage, waves.length, campDamage)

  if (totalHpDamage === 0 && totalSanityDamage === 0) {
    messages.push('✨ 完美防守！营地安然无恙，你毫发无伤。')
  } else if (totalHpDamage <= 5) {
    messages.push('🛡️ 防守尚可，只是受了些轻伤。')
  } else if (totalHpDamage <= 15) {
    messages.push('⚠️ 夜晚的侵袭给你造成了一些伤害。')
  } else {
    messages.push('💀 这个夜晚异常凶险，你付出了惨重的代价...')
  }

  if (campDamage > 0) {
    messages.push(`🏚️ 营地受到了${campDamage}点损坏。`)
  }

  const defenseRating = calculateDefenseRating(totalHpDamage, totalSanityDamage, campDamage)

  return {
    waves,
    totalHpDamage,
    totalSanityDamage,
    totalPollutionDamage,
    trapsConsumed,
    suppliesConsumed: { ...config.supplies },
    campDamage,
    safetyModifier,
    defenseRating,
    messages,
  }
}

function calculateSafetyModifier(hpDamage: number, sanityDamage: number, waveCount: number, campDamage: number): number {
  let modifier = 0

  if (hpDamage === 0) modifier += 2
  else if (hpDamage <= 5) modifier += 1
  else if (hpDamage <= 15) modifier += 0
  else modifier -= 1

  if (sanityDamage <= 3) modifier += 1
  else if (sanityDamage >= 10) modifier -= 1

  if (campDamage === 0) modifier += 1
  else if (campDamage >= 10) modifier -= 2

  return modifier
}

function calculateDefenseRating(hpDamage: number, sanityDamage: number, campDamage: number): NightDefenseResult['defenseRating'] {
  const total = hpDamage + sanityDamage * 0.5 + campDamage * 0.3

  if (total === 0) return 'perfect'
  if (total <= 5) return 'good'
  if (total <= 15) return 'mediocre'
  if (total <= 30) return 'poor'
  return 'disaster'
}

export function applyNightDefenseResult(
  stats: PlayerStats,
  result: NightDefenseResult,
  strategy: DefenseStrategy,
): PlayerStats {
  let newStats = { ...stats }

  newStats.hp = clamp(newStats.hp - result.totalHpDamage, 0, newStats.maxHp)
  newStats.sanity = clamp(newStats.sanity - result.totalSanityDamage, 0, newStats.maxSanity)
  newStats.pollution = clamp(newStats.pollution + result.totalPollutionDamage, 0, 100)

  const strategyInfo = DEFENSE_STRATEGY_INFO[strategy]
  newStats.energy = clamp(newStats.energy + strategyInfo.energyEffect, 0, 100)

  if (result.suppliesConsumed.foodUsed > 0) {
    newStats.hunger = clamp(newStats.hunger + result.suppliesConsumed.foodUsed * 10, 0, 100)
  }

  return newStats
}

export function consumeDefenseSupplies(
  inventory: InventoryItem[],
  config: NightDefenseConfig,
  result: NightDefenseResult,
): InventoryItem[] {
  let newInventory = [...inventory]

  for (const trap of config.traps) {
    if (trap.consumed || result.trapsConsumed.includes(trap.itemId)) {
      const idx = newInventory.findIndex(i => i.itemId === trap.itemId)
      if (idx !== -1) {
        if (newInventory[idx].count > 1) {
          newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - 1 }
        } else {
          newInventory.splice(idx, 1)
        }
      }
    }
  }

  const supplyMap: Record<keyof SupplyAllocation, string> = {
    foodUsed: 'cooked_meat',
    torchUsed: 'torch',
    herbUsed: 'dried_herb',
  }

  for (const [key, itemId] of Object.entries(supplyMap)) {
    const amount = config.supplies[key as keyof SupplyAllocation]
    if (amount > 0) {
      for (let i = 0; i < amount; i++) {
        const idx = newInventory.findIndex(inv => inv.itemId === itemId)
        if (idx !== -1) {
          if (newInventory[idx].count > 1) {
            newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - 1 }
          } else {
            newInventory.splice(idx, 1)
          }
        }
      }
    }
  }

  return newInventory
}

export function canPlaceTrap(itemId: string): boolean {
  return itemId in DEFENSE_ITEM_MAP
}

export function getAvailableSupplyCount(inventory: InventoryItem[], type: keyof SupplyAllocation): number {
  const supplyMap: Record<keyof SupplyAllocation, string> = {
    foodUsed: 'cooked_meat',
    torchUsed: 'torch',
    herbUsed: 'dried_herb',
  }
  const item = inventory.find(i => i.itemId === supplyMap[type])
  return item ? item.count : 0
}

function getItemName(itemId: string): string {
  const nameMap: Record<string, string> = {
    spike_barrier: '尖刺栅栏',
    alarm_tripwire: '警报绊线',
    holy_ward: '圣光结界',
    eldritch_trap: '深渊陷阱',
    hunting_knife: '猎刀',
    arrow: '箭矢',
    torch: '火把',
    ancient_rune: '古老符文',
    cooked_meat: '烤肉',
    dried_herb: '干草药',
  }
  return nameMap[itemId] || itemId
}

export function getNextDaySafetyInfo(safetyModifier: number): {
  dangerAdjustment: number
  campStatus: 'intact' | 'damaged' | 'heavily_damaged' | 'ruined'
  description: string
} {
  let dangerAdjustment = 0
  let campStatus: 'intact' | 'damaged' | 'heavily_damaged' | 'ruined' = 'intact'
  let description = ''

  if (safetyModifier >= 3) {
    dangerAdjustment = -1
    campStatus = 'intact'
    description = '昨夜防守完美，营地周围异常安静，危险似乎远离了你。'
  } else if (safetyModifier >= 1) {
    dangerAdjustment = 0
    campStatus = 'intact'
    description = '昨夜的防守还算成功，营地状况良好。'
  } else if (safetyModifier >= 0) {
    dangerAdjustment = 0
    campStatus = 'damaged'
    description = '昨夜的侵袭造成了一些破坏，营地需要修缮。'
  } else if (safetyModifier >= -2) {
    dangerAdjustment = 1
    campStatus = 'heavily_damaged'
    description = '昨夜的侵袭非常凶猛，营地损毁严重，周围更加危险了。'
  } else {
    dangerAdjustment = 2
    campStatus = 'ruined'
    description = '昨夜是一场灾难，营地几乎被摧毁，暗影在附近徘徊不去...'
  }

  return { dangerAdjustment, campStatus, description }
}
