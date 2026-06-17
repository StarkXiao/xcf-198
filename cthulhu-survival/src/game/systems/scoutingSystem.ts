import type { MapTile, TileHiddenInfo, TileTrapInfo, TileSpecialResourceInfo, PlayerStats } from '../types/game'
import type { Identity, ScoutingBonuses } from '../types/identity'
import type { InventoryItem } from '../types/items'
import { ITEMS } from '../data/items'
import { getTileAt } from '../data/events'
import { randomInt } from '../utils/random'

export type ReconTarget = 'hidden' | 'trap' | 'special' | 'all'

export interface ReconResult {
  success: boolean
  tileId: string
  revealedHidden: TileHiddenInfo | null
  revealedTrap: TileTrapInfo | null
  revealedSpecial: TileSpecialResourceInfo | null
  messages: string[]
  energyCost: number
  sanityCost: number
}

export interface DisarmResult {
  success: boolean
  tileId: string
  trapDisarmed: boolean
  trapTriggered: boolean
  damage: number
  messages: string[]
}

export interface HarvestResult {
  success: boolean
  tileId: string
  harvested: boolean
  rewards: { itemId: string; count: number }[]
  messages: string[]
  reputationGain?: { factionId: string; reputation: number }
}

export interface LootHiddenResult {
  success: boolean
  tileId: string
  looted: boolean
  items: { itemId: string; count: number }[]
  flagsSet: string[]
  messages: string[]
}

function getIdentityScoutingBonuses(identity: Identity, hasPotionActive: boolean): ScoutingBonuses {
  const base: ScoutingBonuses = {
    hiddenChanceBonus: 0,
    trapChanceBonus: 0,
    resourceChanceBonus: 0,
    disarmChanceBonus: 0,
    revealRadiusBonus: 0,
    energyCostReduction: 0,
    hiddenLootMultiplier: 1,
    specialResourceBonus: 1,
  }

  const specialty = identity.scoutingSpecialty
  const identityBonus = identity.skills.find(s => s.effect.type === 'identity_specific_scouting')
  const bonusValue = identityBonus?.effect.value || 0

  switch (specialty) {
    case 'scholar':
      base.hiddenChanceBonus = bonusValue
      base.specialResourceBonus = 1 + bonusValue * 0.6
      base.revealRadiusBonus = 0
      break
    case 'detective':
      base.trapChanceBonus = bonusValue
      base.disarmChanceBonus = bonusValue * 0.9
      base.hiddenChanceBonus = bonusValue * 0.5
      break
    case 'priest':
      base.resourceChanceBonus = bonusValue
      base.hiddenChanceBonus = bonusValue * 0.5
      base.trapChanceBonus = bonusValue * 0.3
      break
    case 'hunter':
      base.hiddenChanceBonus = bonusValue
      base.revealRadiusBonus = 1
      base.resourceChanceBonus = bonusValue * 0.8
      base.energyCostReduction = 0.25
      break
  }

  if (hasPotionActive) {
    base.hiddenChanceBonus += 0.3
    base.trapChanceBonus += 0.3
    base.resourceChanceBonus += 0.3
    base.revealRadiusBonus += 1
  }

  return base
}

function getItemScoutingBonus(inventory: InventoryItem[], target: ReconTarget): number {
  let bonus = 0

  const hasTelescope = inventory.some(i => i.itemId === 'telescope')
  const hasDivinationRod = inventory.some(i => i.itemId === 'divination_rod')
  const hasCompass = inventory.some(i => i.itemId === 'compass')
  const hasTrapDetector = inventory.some(i => i.itemId === 'trap_detector')
  const hasEyeOfInsight = inventory.some(i => i.itemId === 'eye_of_insight')
  const hasMapFragment = inventory.some(i => i.itemId === 'map_fragment')

  if (hasEyeOfInsight) {
    return 0.9
  }

  if (target === 'hidden' || target === 'all') {
    if (hasTelescope) bonus += 0.25
    if (hasDivinationRod) bonus += 0.35
  }

  if (target === 'trap' || target === 'all') {
    if (hasCompass) bonus += 0.2
    if (hasTrapDetector) bonus += 0.4
  }

  if (target === 'special' || target === 'all') {
    if (hasDivinationRod) bonus += 0.3
    if (hasMapFragment) bonus += 0.15
  }

  return Math.min(bonus, 0.8)
}

function getScoutingCost(inventory: InventoryItem[], bonuses: ScoutingBonuses): { energy: number; sanity: number } {
  let energyCost = 15
  let sanityCost = 5

  if (inventory.some(i => i.itemId === 'telescope')) {
    energyCost = Math.round(energyCost * 0.9)
  }
  if (inventory.some(i => i.itemId === 'divination_rod')) {
    sanityCost = Math.round(sanityCost * 0.8)
  }
  if (inventory.some(i => i.itemId === 'trap_detector')) {
    energyCost = Math.round(energyCost * 0.85)
  }

  energyCost = Math.round(energyCost * (1 - bonuses.energyCostReduction))

  return { energy: Math.max(5, energyCost), sanity: Math.max(0, sanityCost) }
}

export function reconTile(
  tile: MapTile,
  identity: Identity,
  inventory: InventoryItem[],
  _stats: PlayerStats,
  target: ReconTarget = 'all',
  hasPotionActive: boolean = false,
): ReconResult {
  const messages: string[] = []
  const bonuses = getIdentityScoutingBonuses(identity, hasPotionActive)
  const itemBonus = getItemScoutingBonus(inventory, target)
  const costs = getScoutingCost(inventory, bonuses)

  let revealedHidden: TileHiddenInfo | null = null
  let revealedTrap: TileTrapInfo | null = null
  let revealedSpecial: TileSpecialResourceInfo | null = null

  if (target === 'all' || target === 'hidden') {
    if (tile.hidden && !tile.hidden.revealed && !tile.hidden.looted) {
      const baseChance = 0.4
      const chance = Math.min(0.95, baseChance + bonuses.hiddenChanceBonus + itemBonus)
      const roll = Math.random()

      if (roll < chance) {
        tile.hidden.revealed = true
        revealedHidden = { ...tile.hidden }
        messages.push(`🔍 你发现了隐藏区域：${tile.hidden.name}！`)
        messages.push(tile.hidden.description)
      } else {
        messages.push('🤔 你仔细搜寻了这里，但没有发现隐藏的东西。')
      }
    } else if (tile.hidden?.revealed && !tile.hidden.looted) {
      messages.push(`ℹ️ 你知道这里有一个隐藏区域：${tile.hidden.name}`)
    }
  }

  if (target === 'all' || target === 'trap') {
    if (tile.trap && !tile.trap.revealed && !tile.trap.triggered && !tile.trap.disarmed) {
      const baseChance = 0.35
      const chance = Math.min(0.95, baseChance + bonuses.trapChanceBonus + itemBonus)
      const roll = Math.random()

      if (roll < chance) {
        tile.trap.revealed = true
        revealedTrap = { ...tile.trap }
        messages.push(`⚠️ 你发现了陷阱：${tile.trap.name}！`)
        messages.push(tile.trap.description)
      } else {
        messages.push('👣 你小心地检查了周围，没有发现明显的陷阱。')
      }
    } else if (tile.trap?.revealed && !tile.trap.triggered && !tile.trap.disarmed) {
      messages.push(`⚠️ 你知道这里有一个陷阱：${tile.trap.name}`)
    }
  }

  if (target === 'all' || target === 'special') {
    if (tile.specialResource && !tile.specialResource.revealed && !tile.specialResource.harvested) {
      const baseChance = 0.3
      let chance = Math.min(0.95, baseChance + bonuses.resourceChanceBonus + itemBonus)

      if (identity.scoutingSpecialty === 'priest' && tile.specialResource.type === 'sacred_site') {
        chance = Math.min(0.95, chance + 0.25)
      }
      if (identity.scoutingSpecialty === 'scholar' && (tile.specialResource.type === 'watchers_archive' || tile.specialResource.type === 'ancient_cache')) {
        chance = Math.min(0.95, chance + 0.25)
      }
      if (identity.scoutingSpecialty === 'priest' && tile.specialResource.type === 'abyssal_deposit') {
        chance = Math.min(0.95, chance + 0.15)
      }

      const roll = Math.random()

      if (roll < chance) {
        tile.specialResource.revealed = true
        revealedSpecial = { ...tile.specialResource }
        messages.push(`✨ 你发现了特殊资源点：${tile.specialResource.name}！`)
        messages.push(tile.specialResource.description)
      } else {
        messages.push('💭 你感觉这里似乎有什么特别的东西，但无法确定具体位置。')
      }
    } else if (tile.specialResource?.revealed && !tile.specialResource.harvested) {
      messages.push(`✨ 你知道这里有一个特殊资源点：${tile.specialResource.name}`)
    }
  }

  if (!tile.hidden && !tile.trap && !tile.specialResource) {
    messages.push('🏚️ 这里似乎没有什么值得特别注意的东西。')
  }

  return {
    success: revealedHidden !== null || revealedTrap !== null || revealedSpecial !== null,
    tileId: tile.id,
    revealedHidden,
    revealedTrap,
    revealedSpecial,
    messages,
    energyCost: costs.energy,
    sanityCost: costs.sanity,
  }
}

export function reconArea(
  centerX: number,
  centerY: number,
  identity: Identity,
  inventory: InventoryItem[],
  stats: PlayerStats,
  discoveredTiles: string[],
  hasPotionActive: boolean = false,
): ReconResult[] {
  const bonuses = getIdentityScoutingBonuses(identity, hasPotionActive)
  const radius = 1 + bonuses.revealRadiusBonus
  const results: ReconResult[] = []

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const tile = getTileAt(centerX + dx, centerY + dy)
      if (tile && discoveredTiles.includes(tile.id)) {
        const result = reconTile(tile, identity, inventory, stats, 'all', hasPotionActive)
        if (result.messages.length > 0 && result.messages[0] !== '🏚️ 这里似乎没有什么值得特别注意的东西。') {
          results.push(result)
        }
      }
    }
  }

  return results
}

export function disarmTrap(
  tile: MapTile,
  identity: Identity,
  inventory: InventoryItem[],
  _stats: PlayerStats,
): DisarmResult {
  const messages: string[] = []

  if (!tile.trap) {
    return {
      success: false,
      tileId: tile.id,
      trapDisarmed: false,
      trapTriggered: false,
      damage: 0,
      messages: ['这里没有陷阱。'],
    }
  }

  if (tile.trap.disarmed) {
    return {
      success: true,
      tileId: tile.id,
      trapDisarmed: true,
      trapTriggered: false,
      damage: 0,
      messages: ['陷阱已经被解除了。'],
    }
  }

  if (tile.trap.triggered) {
    return {
      success: false,
      tileId: tile.id,
      trapDisarmed: false,
      trapTriggered: true,
      damage: 0,
      messages: ['陷阱已经被触发了。'],
    }
  }

  if (!tile.trap.revealed) {
    const triggerChance = Math.random()
    if (triggerChance < 0.6) {
      tile.trap.triggered = true
      let damage = tile.trap.damage
      let sanityDamage = tile.trap.sanityDamage || 0
      let pollutionGain = tile.trap.pollutionGain || 0

      if (identity.scoutingSpecialty === 'detective') {
        damage = Math.round(damage * 0.7)
      }
      if (identity.scoutingSpecialty === 'priest' && tile.trap.type === 'pollution_trap') {
        pollutionGain = Math.round(pollutionGain * 0.5)
      }

      messages.push(`💥 你不小心触发了陷阱：${tile.trap.name}！`)
      messages.push(`受到 ${damage} 点伤害${sanityDamage > 0 ? `，${sanityDamage} 点理智伤害` : ''}${pollutionGain > 0 ? `，${pollutionGain} 点污染` : ''}。`)

      return {
        success: false,
        tileId: tile.id,
        trapDisarmed: false,
        trapTriggered: true,
        damage,
        messages,
      }
    } else {
      tile.trap.revealed = true
      messages.push(`⚠️ 你差点触发陷阱，在最后一刻发现了：${tile.trap.name}！`)
    }
  }

  const bonuses = getIdentityScoutingBonuses(identity, false)
  const itemBonus = getItemScoutingBonus(inventory, 'trap')

  const baseChance = 0.5
  const disarmChance = Math.min(0.95, baseChance + bonuses.disarmChanceBonus + itemBonus)
  const roll = Math.random()

  if (roll < disarmChance) {
    tile.trap.disarmed = true
    messages.push(`✅ 你成功解除了陷阱：${tile.trap.name}！`)

    if (tile.trap.type === 'spike_trap') {
      const scrapCount = randomInt(1, 2)
      messages.push(`🔧 你从陷阱中回收了 ${scrapCount} 个燧石。`)
    }

    return {
      success: true,
      tileId: tile.id,
      trapDisarmed: true,
      trapTriggered: false,
      damage: 0,
      messages,
    }
  } else {
    tile.trap.triggered = true
    let damage = tile.trap.damage
    let sanityDamage = tile.trap.sanityDamage || 0
    let pollutionGain = tile.trap.pollutionGain || 0

    if (identity.scoutingSpecialty === 'detective') {
      damage = Math.round(damage * 0.6)
      messages.push(`💥 解除失败，但你的专业经验减少了伤害！`)
    } else {
      messages.push(`💥 解除失败，陷阱被触发了！`)
    }

    if (identity.scoutingSpecialty === 'priest' && tile.trap.type === 'pollution_trap') {
      pollutionGain = Math.round(pollutionGain * 0.5)
    }

    messages.push(`受到 ${damage} 点伤害${sanityDamage > 0 ? `，${sanityDamage} 点理智伤害` : ''}${pollutionGain > 0 ? `，${pollutionGain} 点污染` : ''}。`)

    return {
      success: false,
      tileId: tile.id,
      trapDisarmed: false,
      trapTriggered: true,
      damage,
      messages,
    }
  }
}

export function lootHidden(
  tile: MapTile,
  identity: Identity,
  _inventory: InventoryItem[],
  _stats: PlayerStats,
): LootHiddenResult {
  const messages: string[] = []
  const items: { itemId: string; count: number }[] = []
  const flagsSet: string[] = []

  if (!tile.hidden) {
    return {
      success: false,
      tileId: tile.id,
      looted: false,
      items: [],
      flagsSet: [],
      messages: ['这里没有隐藏的宝物。'],
    }
  }

  if (tile.hidden.looted) {
    return {
      success: true,
      tileId: tile.id,
      looted: true,
      items: [],
      flagsSet: [],
      messages: ['这里已经被搜刮过了。'],
    }
  }

  if (!tile.hidden.revealed) {
    return {
      success: false,
      tileId: tile.id,
      looted: false,
      items: [],
      flagsSet: [],
      messages: ['你还没有发现隐藏区域，先侦查一下吧。'],
    }
  }

  const bonuses = getIdentityScoutingBonuses(identity, false)

  tile.hidden.looted = true

  if (tile.hidden.lootItems) {
    for (const loot of tile.hidden.lootItems) {
      let count = loot.count
      if (tile.hidden.type === 'hidden_loot' || tile.hidden.type === 'hidden_knowledge') {
        count = Math.max(1, Math.round(count * bonuses.hiddenLootMultiplier))
      }
      if (tile.hidden.type === 'hidden_knowledge' && identity.scoutingSpecialty === 'scholar') {
        count = Math.round(count * 1.5)
      }
      items.push({ itemId: loot.itemId, count })
      const itemData = ITEMS[loot.itemId]
      messages.push(`📦 获得 ${itemData?.name || loot.itemId} x${count}`)
    }
  }

  if (tile.hidden.flags) {
    for (const flag of tile.hidden.flags) {
      flagsSet.push(flag)
      messages.push(`🚩 触发了新的线索：${flag}`)
    }
  }

  if (tile.hidden.type === 'hidden_knowledge') {
    messages.push('📚 你获得了宝贵的知识！')
  } else if (tile.hidden.type === 'hidden_passage') {
    messages.push('🚪 你发现了一条隐藏的通道！')
  } else if (tile.hidden.type === 'hidden_loot') {
    messages.push('💰 你找到了一批隐藏的宝物！')
  }

  return {
    success: true,
    tileId: tile.id,
    looted: true,
    items,
    flagsSet,
    messages,
  }
}

export function harvestSpecialResource(
  tile: MapTile,
  identity: Identity,
  _inventory: InventoryItem[],
  _stats: PlayerStats,
): HarvestResult {
  const messages: string[] = []
  const rewards: { itemId: string; count: number }[] = []

  if (!tile.specialResource) {
    return {
      success: false,
      tileId: tile.id,
      harvested: false,
      rewards: [],
      messages: ['这里没有特殊资源。'],
    }
  }

  if (tile.specialResource.harvested) {
    return {
      success: true,
      tileId: tile.id,
      harvested: true,
      rewards: [],
      messages: ['这里的资源已经被采集过了。'],
    }
  }

  if (!tile.specialResource.revealed) {
    return {
      success: false,
      tileId: tile.id,
      harvested: false,
      rewards: [],
      messages: ['你还没有发现特殊资源点，先侦查一下吧。'],
    }
  }

  const bonuses = getIdentityScoutingBonuses(identity, false)

  tile.specialResource.harvested = true

  for (const reward of tile.specialResource.rewards) {
    let count = reward.count
    count = Math.max(1, Math.round(count * bonuses.specialResourceBonus))

    if (tile.specialResource.type === 'sacred_site' && identity.scoutingSpecialty === 'priest') {
      count = Math.round(count * 1.35)
    }
    if ((tile.specialResource.type === 'ancient_cache' || tile.specialResource.type === 'watchers_archive') && identity.scoutingSpecialty === 'scholar') {
      count = Math.round(count * 1.25)
    }
    if (tile.specialResource.type === 'abyssal_deposit' && identity.scoutingSpecialty === 'hunter') {
      count = Math.round(count * 1.3)
    }

    rewards.push({ itemId: reward.itemId, count })
    const itemData = ITEMS[reward.itemId]
    messages.push(`✨ 获得 ${itemData?.name || reward.itemId} x${count}`)
  }

  let reputationGain: { factionId: string; reputation: number } | undefined
  if (tile.specialResource.factionBonus) {
    const bonus = tile.specialResource.factionBonus
    reputationGain = {
      factionId: bonus.factionId,
      reputation: bonus.reputation,
    }
    messages.push(`🤝 与 ${bonus.factionId} 的声望提升了 ${bonus.reputation} 点`)
  }

  return {
    success: true,
    tileId: tile.id,
    harvested: true,
    rewards,
    messages,
    reputationGain,
  }
}

export function triggerTrapOnEnter(
  tile: MapTile,
  identity: Identity,
  inventory: InventoryItem[],
): { triggered: boolean; damage: number; sanityDamage: number; pollutionGain: number; messages: string[] } {
  const messages: string[] = []

  if (!tile.trap || tile.trap.disarmed || tile.trap.triggered) {
    return { triggered: false, damage: 0, sanityDamage: 0, pollutionGain: 0, messages: [] }
  }

  const bonuses = getIdentityScoutingBonuses(identity, false)
  const itemBonus = getItemScoutingBonus(inventory, 'trap')

  const avoidChance = 0.3 + bonuses.trapChanceBonus * 0.8 + itemBonus * 0.6
  const roll = Math.random()

  if (roll < avoidChance) {
    tile.trap.revealed = true
    messages.push(`⚠️ 你敏锐地察觉到了危险，避开了陷阱：${tile.trap.name}！`)
    return { triggered: false, damage: 0, sanityDamage: 0, pollutionGain: 0, messages }
  }

  tile.trap.triggered = true
  let damage = tile.trap.damage
  let sanityDamage = tile.trap.sanityDamage || 0
  let pollutionGain = tile.trap.pollutionGain || 0

  if (identity.scoutingSpecialty === 'detective') {
    damage = Math.round(damage * 0.7)
  }
  if (identity.scoutingSpecialty === 'priest' && tile.trap.type === 'pollution_trap') {
    pollutionGain = Math.round(pollutionGain * 0.5)
  }

  messages.push(`💥 你触发了陷阱：${tile.trap.name}！`)
  messages.push(`受到 ${damage} 点伤害${sanityDamage > 0 ? `，${sanityDamage} 点理智伤害` : ''}${pollutionGain > 0 ? `，${pollutionGain} 点污染` : ''}。`)

  return { triggered: true, damage, sanityDamage, pollutionGain, messages }
}
