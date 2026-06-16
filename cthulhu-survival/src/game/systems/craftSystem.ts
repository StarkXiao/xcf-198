import type { CraftRecipe, InventoryItem } from '../types/items'
import type { ReputationMap } from '../types/faction'
import { RECIPES } from '../data/recipes'
import { chance } from '../utils/random'
import type { PlayerStats } from '../types/game'
import type { Identity } from '../types/identity'
import { checkReputationRequirement } from './reputationSystem'

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
    const inv = inventory.find(i => i.itemId === ing.itemId)
    if (!inv || inv.count < ing.count) {
      return { canCraft: false, reason: '材料不足' }
    }
  }

  if (recipe.requiredTool) {
    const tool = inventory.find(i => i.itemId === recipe.requiredTool && i.count > 0)
    if (!tool) {
      return { canCraft: false, reason: '缺少必需工具' }
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
  const successRate = Math.max(0.1, 1 - recipe.difficulty + bonusSuccess)
  const success = chance(successRate)

  let newInventory = [...inventory]
  let newStats = { ...stats }

  for (const ing of recipe.ingredients) {
    const idx = newInventory.findIndex(i => i.itemId === ing.itemId)
    if (idx !== -1) {
      newInventory[idx] = { ...newInventory[idx], count: newInventory[idx].count - ing.count }
      if (newInventory[idx].count <= 0) {
        newInventory = newInventory.filter((_, i) => i !== idx)
      }
    }
  }

  newStats.energy = Math.max(0, newStats.energy - recipe.energyCost)
  newStats.sanity = Math.max(0, newStats.sanity + recipe.sanityCost)
  newStats.pollution = Math.min(100, newStats.pollution + recipe.pollutionCost)

  if (success) {
    const existingIdx = newInventory.findIndex(i => i.itemId === recipe.result.itemId)
    if (existingIdx !== -1) {
      newInventory[existingIdx] = {
        ...newInventory[existingIdx],
        count: newInventory[existingIdx].count + recipe.result.count,
      }
    } else {
      newInventory.push({ itemId: recipe.result.itemId, count: recipe.result.count })
    }
    return {
      success: true,
      inventory: newInventory,
      stats: newStats,
      message: `合成成功！获得 ${recipe.name} x${recipe.result.count}`,
    }
  } else {
    return {
      success: false,
      inventory: newInventory,
      stats: newStats,
      message: '合成失败...材料已消耗。',
    }
  }
}

export function addToInventory(inventory: InventoryItem[], itemId: string, count: number = 1): InventoryItem[] {
  const idx = inventory.findIndex(i => i.itemId === itemId)
  if (idx !== -1) {
    return inventory.map((item, i) =>
      i === idx ? { ...item, count: item.count + count } : item,
    )
  }
  return [...inventory, { itemId, count }]
}

export function removeFromInventory(inventory: InventoryItem[], itemId: string, count: number = 1): InventoryItem[] {
  const idx = inventory.findIndex(i => i.itemId === itemId)
  if (idx === -1) return inventory
  const newCount = inventory[idx].count - count
  if (newCount <= 0) {
    return inventory.filter((_, i) => i !== idx)
  }
  return inventory.map((item, i) =>
    i === idx ? { ...item, count: newCount } : item,
  )
}

export function hasItem(inventory: InventoryItem[], itemId: string, count: number = 1): boolean {
  const item = inventory.find(i => i.itemId === itemId)
  return !!item && item.count >= count
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
  return Array.from(map.entries()).map(([itemId, count]) => ({ itemId, count }))
}
