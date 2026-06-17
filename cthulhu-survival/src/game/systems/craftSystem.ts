import type { CraftRecipe, InventoryItem } from '../types/items'
import type { ReputationMap } from '../types/faction'
import { RECIPES } from '../data/recipes'
import { chance } from '../utils/random'
import type { PlayerStats } from '../types/game'
import type { Identity } from '../types/identity'
import { checkReputationRequirement } from './reputationSystem'
import { isItemBroken, applyDurabilityWear, initializeDurability, isItemWithDurability } from './durabilitySystem'
import { ITEMS } from '../data/items'
import {
  calculateCraftSuccessBonus,
  calculateCraftYieldBonus,
  createAffixedItem,
  calculateAffixChanceFromEffects,
  calculateAffixRarityFromEffects,
} from './affixSystem'

export function getAvailableRecipes(
  _inventory: InventoryItem[],
  flags: Record<string, boolean | number | string>,
  reputation: ReputationMap = { monastery: 0, deep_ones: 0, watchers: 0 },
): CraftRecipe[] {
  return RECIPES.filter(recipe => {
    if (recipe.unlockedByDefault) return true
    if (recipe.requiredFlag && flags[recipe.requiredFlag]) return true
    if (recipe.requiredReputation) {
      return checkReputationRequirement(
        reputation,
        recipe.requiredReputation.factionId,
        recipe.requiredReputation.minReputation,
      )
    }
    return false
  })
}

export function canCraft(
  recipe: CraftRecipe,
  inventory: InventoryItem[],
  stats: PlayerStats,
): { canCraft: boolean; reason?: string } {
  for (const ing of recipe.ingredients) {
    const totalCount = inventory.reduce((sum, item) => {
      if (item.itemId === ing.itemId) {
        return sum + item.count
      }
      return sum
    }, 0)
    if (totalCount < ing.count) {
      return { canCraft: false, reason: '材料不足' }
    }
  }

  if (recipe.requiredTool) {
    const tool = inventory.find(i => i.itemId === recipe.requiredTool && i.count > 0)
    if (!tool) {
      return { canCraft: false, reason: '缺少必需工具' }
    }
    if (isItemBroken(inventory, recipe.requiredTool)) {
      return { canCraft: false, reason: '工具已损坏，需要维修' }
    }
  }

  if (stats.energy < recipe.energyCost) {
    return { canCraft: false, reason: '精力不足' }
  }

  if (stats.sanity <= Math.abs(recipe.sanityCost)) {
    return { canCraft: false, reason: '理智不足' }
  }

  return { canCraft: true }
}

export function craftItem(
  recipe: CraftRecipe,
  inventory: InventoryItem[],
  stats: PlayerStats,
  identity: Identity,
  effects: { type: string; value: number }[] = [],
): {
  success: boolean
  inventory: InventoryItem[]
  stats: PlayerStats
  message: string
} {
  const check = canCraft(recipe, inventory, stats)
  if (!check.canCraft) {
    return { success: false, inventory, stats, message: check.reason || '无法合成' }
  }

  const bonusSuccess = identity.skills.reduce((acc, s) => {
    if (s.effect.type === 'bonus_craft_success') return acc + s.effect.value
    return acc
  }, 0)

  const affixSuccessBonus = calculateCraftSuccessBonus(inventory, recipe.ingredients)
  const affixYieldBonus = calculateCraftYieldBonus(inventory, recipe.ingredients)

  const successRate = Math.max(0.1, 1 - recipe.difficulty + bonusSuccess + affixSuccessBonus)
  const success = chance(successRate)

  let newInventory = [...inventory]
  let newStats = { ...stats }

  for (const ing of recipe.ingredients) {
    let remaining = ing.count
    const itemIndices = newInventory
      .map((item, idx) => ({ item, idx }))
      .filter(x => x.item.itemId === ing.itemId)
      .sort((a, b) => {
        const aHasAffix = !!a.item.affixes && a.item.affixes.length > 0
        const bHasAffix = !!b.item.affixes && b.item.affixes.length > 0
        if (aHasAffix && !bHasAffix) return 1
        if (!aHasAffix && bHasAffix) return -1
        return 0
      })

    for (const { item, idx } of itemIndices) {
      if (remaining <= 0) break
      const take = Math.min(item.count, remaining)
      newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - take }
      remaining -= take
    }

    newInventory = newInventory.filter(item => item.count > 0)
  }

  newStats.energy = Math.max(0, newStats.energy - recipe.energyCost)
  newStats.sanity = Math.max(0, newStats.sanity + recipe.sanityCost)
  newStats.pollution = Math.min(100, newStats.pollution + recipe.pollutionCost)

  if (success) {
    const resultItemData = ITEMS[recipe.result.itemId]
    let resultCount = recipe.result.count
    if (affixYieldBonus > 0) {
      resultCount = Math.max(1, Math.round(resultCount * (1 + affixYieldBonus)))
    }

    const canResultHaveAffix = resultItemData && (
      resultItemData.canHaveAffix ||
      resultItemData.type === 'tool' ||
      resultItemData.type === 'weapon' ||
      resultItemData.type === 'consumable' ||
      resultItemData.type === 'artifact'
    )

    let affixChance = 0
    let totalRarityBoost = 0
    for (const ing of recipe.ingredients) {
      for (const invItem of inventory) {
        if (invItem.itemId === ing.itemId && invItem.affixes && invItem.affixes.length > 0) {
          affixChance += 0.15 * invItem.affixes.length
          totalRarityBoost += invItem.affixes.length * 0.1
        }
      }
    }

    affixChance += calculateAffixChanceFromEffects(effects)
    totalRarityBoost += calculateAffixRarityFromEffects(effects)

    if (canResultHaveAffix && resultCount > 0 && Math.random() < Math.min(affixChance, 0.8)) {
      const affixedItem = createAffixedItem(recipe.result.itemId, 1, {
        rarityBoost: totalRarityBoost,
        minAffixes: 1,
        maxAffixes: 2,
      })
      if (affixedItem.affixes && affixedItem.affixes.length > 0) {
        newInventory.push(affixedItem)
        resultCount -= 1
      }
    }

    if (resultCount > 0) {
      const existingIdx = newInventory.findIndex(i => i.itemId === recipe.result.itemId && !i.affixes)
      if (existingIdx !== -1) {
        newInventory[existingIdx] = {
          ...newInventory[existingIdx],
          count: newInventory[existingIdx].count + resultCount,
        }
      } else {
        const newItem: InventoryItem = { itemId: recipe.result.itemId, count: resultCount }
        if (isItemWithDurability(resultItemData)) {
          newItem.durability = resultItemData.maxDurability
        }
        newInventory.push(newItem)
      }
    }

    if (recipe.requiredTool) {
      newInventory = applyDurabilityWear(newInventory, recipe.requiredTool)
    }

    const bonusMsg = affixYieldBonus > 0 ? `（词缀加成：产量+${Math.round(affixYieldBonus * 100)}%）` : ''
    return {
      success: true,
      inventory: newInventory,
      stats: newStats,
      message: `合成成功！获得 ${recipe.name} x${recipe.result.count}${bonusMsg}`,
    }
  } else {
    if (recipe.requiredTool) {
      newInventory = applyDurabilityWear(newInventory, recipe.requiredTool)
    }
    return {
      success: false,
      inventory: newInventory,
      stats: newStats,
      message: '合成失败...材料已消耗。',
    }
  }
}

export function addToInventory(inventory: InventoryItem[], itemId: string, count: number = 1): InventoryItem[] {
  const itemData = ITEMS[itemId]
  const existingIdx = inventory.findIndex(i => i.itemId === itemId && !i.affixes)
  if (existingIdx !== -1) {
    return inventory.map((item, i) =>
      i === existingIdx ? { ...item, count: item.count + count } : item,
    )
  }
  const newItem: InventoryItem = { itemId, count }
  if (isItemWithDurability(itemData)) {
    newItem.durability = itemData.maxDurability
  }
  return [...inventory, newItem]
}

export function removeFromInventory(inventory: InventoryItem[], itemId: string, count: number = 1): InventoryItem[] {
  let remaining = count
  const newInventory = [...inventory]

  const normalIdx = newInventory.findIndex(i => i.itemId === itemId && !i.affixes)
  if (normalIdx !== -1) {
    const take = Math.min(newInventory[normalIdx].count, remaining)
    newInventory[normalIdx] = { ...newInventory[normalIdx], count: newInventory[normalIdx].count - take }
    remaining -= take
  }

  if (remaining > 0) {
    const affixedItems = newInventory
      .map((item, idx) => ({ item, idx }))
      .filter(x => x.item.itemId === itemId && !!x.item.affixes)
      .sort((a, b) => {
        const aCount = a.item.affixes?.length || 0
        const bCount = b.item.affixes?.length || 0
        return aCount - bCount
      })

    for (const { item, idx } of affixedItems) {
      if (remaining <= 0) break
      const take = Math.min(item.count, remaining)
      newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - take }
      remaining -= take
    }
  }

  return newInventory.filter(item => item.count > 0)
}

export function hasItem(inventory: InventoryItem[], itemId: string, count: number = 1): boolean {
  const total = inventory.reduce((sum, item) => {
    if (item.itemId === itemId) {
      return sum + item.count
    }
    return sum
  }, 0)
  return total >= count
}

export function inventoryToItemIds(inventory: InventoryItem[]): string[] {
  const result: string[] = []
  for (const item of inventory) {
    for (let i = 0; i < item.count; i++) {
      result.push(item.itemId)
    }
  }
  return result
}

export function itemIdsToInventory(itemIds: string[]): InventoryItem[] {
  const map = new Map<string, number>()
  for (const id of itemIds) {
    map.set(id, (map.get(id) || 0) + 1)
  }
  return initializeDurability(
    Array.from(map.entries()).map(([itemId, count]) => ({ itemId, count })),
  )
}
