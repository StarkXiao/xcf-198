import type { Affix, AffixRarity, ItemAffixInstance, AffixType } from '../types/affix'
import type { Item, InventoryItem } from '../types/items'
import { AFFIXES } from '../data/affixes'
import { AFFIX_RARITY_WEIGHTS } from '../types/affix'
import { ITEMS } from '../data/items'
import { chance, randomInt } from '../utils/random'

export function generateAffixForItem(item: Item, rarityBoost: number = 0): ItemAffixInstance | null {
  if (!item.canHaveAffix && item.type !== 'material' && item.type !== 'tool' && item.type !== 'weapon' && item.type !== 'consumable') {
    return null
  }

  const affixChance = item.affixChance ?? 0.15
  if (!chance(affixChance + rarityBoost * 0.1)) {
    return null
  }

  const availableAffixes = Object.values(AFFIXES).filter(affix => {
    if (affix.allowedItemTypes && !affix.allowedItemTypes.includes(item.type)) {
      return false
    }
    if (affix.allowedItemIds && !affix.allowedItemIds.includes(item.id)) {
      return false
    }
    return true
  })

  if (availableAffixes.length === 0) {
    return null
  }

  const rarity = rollAffixRarity(rarityBoost)
  const rarityAffixes = availableAffixes.filter(a => a.rarity === rarity)

  if (rarityAffixes.length === 0) {
    const fallbackAffixes = availableAffixes.filter(a => a.rarity === 'common')
    if (fallbackAffixes.length === 0) return null
    const affix = fallbackAffixes[Math.floor(Math.random() * fallbackAffixes.length)]
    return createAffixInstance(affix)
  }

  const affix = rarityAffixes[Math.floor(Math.random() * rarityAffixes.length)]
  return createAffixInstance(affix)
}

export function generateMultipleAffixes(item: Item, count: number = 1, rarityBoost: number = 0): ItemAffixInstance[] {
  const affixes: ItemAffixInstance[] = []
  const usedTypes = new Set<AffixType>()

  for (let i = 0; i < count; i++) {
    let attempts = 0
    while (attempts < 10) {
      const affix = generateAffixForItem(item, rarityBoost)
      if (affix && !usedTypes.has(AFFIXES[affix.affixId]?.type as AffixType)) {
        affixes.push(affix)
        usedTypes.add(AFFIXES[affix.affixId]?.type as AffixType)
        break
      }
      attempts++
    }
  }

  return affixes
}

function rollAffixRarity(rarityBoost: number = 0): AffixRarity {
  const rarities: AffixRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  const weights: Record<AffixRarity, number> = { ...AFFIX_RARITY_WEIGHTS }

  if (rarityBoost > 0) {
    weights.uncommon += rarityBoost * 10
    weights.rare += rarityBoost * 5
    weights.epic += rarityBoost * 2
    weights.legendary += rarityBoost * 0.5
  }

  const totalWeight = Object.values(weights).reduce((sum: number, w: number) => sum + w, 0)
  let roll = Math.random() * totalWeight

  for (const rarity of rarities) {
    roll -= weights[rarity]
    if (roll <= 0) {
      return rarity
    }
  }

  return 'common'
}

function createAffixInstance(affix: Affix): ItemAffixInstance {
  const variance = 0.9 + Math.random() * 0.2
  return {
    affixId: affix.id,
    value: Math.round(affix.value * variance * 100) / 100,
  }
}

export function getItemAffixes(inventoryItem: InventoryItem): Affix[] {
  if (!inventoryItem.affixes) return []
  return inventoryItem.affixes
    .map(ai => AFFIXES[ai.affixId])
    .filter((a): a is Affix => a !== undefined)
}

export function getAffixTotalValue(inventoryItem: InventoryItem, affixType: AffixType): number {
  if (!inventoryItem.affixes) return 0
  return inventoryItem.affixes.reduce((total, ai) => {
    const affix = AFFIXES[ai.affixId]
    if (affix && affix.type === affixType) {
      return total + ai.value
    }
    return total
  }, 0)
}

export function getHighestAffixRarity(inventoryItem: InventoryItem): AffixRarity | null {
  if (!inventoryItem.affixes || inventoryItem.affixes.length === 0) return null

  const rarityOrder: AffixRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  let highest: AffixRarity = 'common'

  for (const ai of inventoryItem.affixes) {
    const affix = AFFIXES[ai.affixId]
    if (affix && rarityOrder.indexOf(affix.rarity) > rarityOrder.indexOf(highest)) {
      highest = affix.rarity
    }
  }

  return highest
}

export function getAffixedItemName(inventoryItem: InventoryItem): string {
  const itemData = ITEMS[inventoryItem.itemId]
  if (!itemData) return inventoryItem.itemId
  if (!inventoryItem.affixes || inventoryItem.affixes.length === 0) return itemData.name

  const prefixes = inventoryItem.affixes
    .map(ai => AFFIXES[ai.affixId]?.name)
    .filter((n): n is string => n !== undefined)

  return `${prefixes.join('·')}${itemData.name}`
}

export function createAffixedItem(
  itemId: string,
  count: number = 1,
  options: {
    rarityBoost?: number
    minAffixes?: number
    maxAffixes?: number
  } = {}
): InventoryItem {
  const itemData = ITEMS[itemId]
  if (!itemData) {
    return { itemId, count }
  }

  const { rarityBoost = 0, minAffixes = 0, maxAffixes = 2 } = options

  const inventoryItem: InventoryItem = {
    itemId,
    count: 1,
  }

  if (itemData.maxDurability !== undefined) {
    inventoryItem.durability = itemData.maxDurability
  }

  const affixCount = randomInt(minAffixes, maxAffixes)
  if (affixCount > 0) {
    const affixes = generateMultipleAffixes(itemData, affixCount, rarityBoost)
    if (affixes.length > 0) {
      inventoryItem.affixes = affixes
      inventoryItem.instanceId = `${itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  inventoryItem.count = count

  return inventoryItem
}

export function applyAffixesToItem(inventoryItem: InventoryItem, affixes: ItemAffixInstance[]): InventoryItem {
  return {
    ...inventoryItem,
    affixes,
    instanceId: `${inventoryItem.itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
}

export function getAffixEffectDescription(affix: Affix, _value: number): string {
  return affix.description
}

export function calculateCraftSuccessBonus(inventory: InventoryItem[], recipeIngredients: { itemId: string; count: number }[]): number {
  let bonus = 0
  for (const ing of recipeIngredients) {
    const invItem = inventory.find(i => i.itemId === ing.itemId)
    if (invItem) {
      bonus += getAffixTotalValue(invItem, 'craft_success')
    }
  }
  return Math.min(bonus, 0.5)
}

export function calculateCraftYieldBonus(inventory: InventoryItem[], recipeIngredients: { itemId: string; count: number }[]): number {
  let bonus = 0
  for (const ing of recipeIngredients) {
    const invItem = inventory.find(i => i.itemId === ing.itemId)
    if (invItem) {
      bonus += getAffixTotalValue(invItem, 'craft_yield')
    }
  }
  return bonus
}

export function calculateCraftSuccessBonusFromConsumed(consumedItems: InventoryItem[]): number {
  let bonus = 0
  for (const item of consumedItems) {
    bonus += getAffixTotalValue(item, 'craft_success')
  }
  return Math.min(bonus, 0.5)
}

export function calculateCraftYieldBonusFromConsumed(consumedItems: InventoryItem[]): number {
  let bonus = 0
  for (const item of consumedItems) {
    bonus += getAffixTotalValue(item, 'craft_yield')
  }
  return bonus
}

export function calculateAffixChanceFromConsumed(consumedItems: InventoryItem[]): number {
  let chance = 0
  for (const item of consumedItems) {
    if (item.affixes && item.affixes.length > 0) {
      chance += 0.15 * item.affixes.length
    }
  }
  return chance
}

export function calculateRarityBoostFromConsumed(consumedItems: InventoryItem[]): number {
  let boost = 0
  for (const item of consumedItems) {
    if (item.affixes && item.affixes.length > 0) {
      boost += item.affixes.length * 0.1
    }
  }
  return boost
}

export function simulateConsumedAffixedItems(
  inventory: InventoryItem[],
  ingredients: { itemId: string; count: number }[],
): InventoryItem[] {
  const consumed: InventoryItem[] = []
  const tempInventory = inventory.map(item => ({ ...item }))

  for (const ing of ingredients) {
    let remaining = ing.count
    const itemIndices = tempInventory
      .map((item, idx) => ({ item, idx }))
      .filter(x => x.item.itemId === ing.itemId)
      .sort((a, b) => {
        const aHasAffix = !!a.item.affixes && a.item.affixes.length > 0
        const bHasAffix = !!b.item.affixes && b.item.affixes.length > 0
        if (aHasAffix && !bHasAffix) return -1
        if (!aHasAffix && bHasAffix) return 1
        return 0
      })

    for (const { item, idx } of itemIndices) {
      if (remaining <= 0) break
      const take = Math.min(item.count, remaining)

      if (item.affixes && item.affixes.length > 0) {
        for (let i = 0; i < take; i++) {
          consumed.push({ ...item, count: 1 })
        }
      }

      tempInventory[idx] = { ...tempInventory[idx], count: tempInventory[idx].count - take }
      remaining -= take
    }
  }

  return consumed
}

export function calculateEffectPowerBonus(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'effect_power')
}

export function calculateDurabilityBonus(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'durability_bonus')
}

export function calculatePollutionReduction(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'pollution_reduction')
}

export function calculateSanityBonus(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'sanity_bonus')
}

export function calculateEnergyEfficiency(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'energy_efficiency')
}

export function calculateHealingBoost(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'healing_boost')
}

export function calculateLootBonus(inventory: InventoryItem[]): number {
  let bonus = 0
  for (const item of inventory) {
    bonus += getAffixTotalValue(item, 'loot_bonus')
  }
  return bonus
}

export function calculateDamageBoost(inventoryItem: InventoryItem): number {
  return getAffixTotalValue(inventoryItem, 'damage_boost')
}

export function hasAffix(inventoryItem: InventoryItem, affixId: string): boolean {
  if (!inventoryItem.affixes) return false
  return inventoryItem.affixes.some(ai => ai.affixId === affixId)
}

export function calculateAffixChanceFromEffects(effects: { type: string; value: number }[]): number {
  return effects.reduce((sum, e) => {
    if (e.type === 'affix_chance_boost') return sum + e.value
    return sum
  }, 0)
}

export function calculateAffixRarityFromEffects(effects: { type: string; value: number }[]): number {
  return effects.reduce((sum, e) => {
    if (e.type === 'affix_rarity_boost') return sum + e.value
    return sum
  }, 0)
}
