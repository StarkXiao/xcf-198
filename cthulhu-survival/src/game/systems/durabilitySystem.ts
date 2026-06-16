import type { InventoryItem, Item } from '../types/items'
import { ITEMS } from '../data/items'
import { hasItem, removeFromInventory } from './craftSystem'

export interface ItemWithDurability extends Item {
  maxDurability: number
  durabilityCostPerUse?: number
  repairMaterials?: { itemId: string; count: number }[]
  repairAmount?: number
}

export interface InventoryItemWithDurability extends InventoryItem {
  durability: number
}

export function isItemWithDurability(item: Item | undefined): item is ItemWithDurability {
  return !!item && typeof item.maxDurability === 'number'
}

export function isInventoryItemWithDurability(
  inv: InventoryItem,
): inv is InventoryItemWithDurability {
  return typeof inv.durability === 'number'
}

export function getItemDurabilityInfo(
  inventory: InventoryItem[],
  itemId: string,
): { current: number; max: number; ratio: number } | null {
  const itemData = ITEMS[itemId]
  if (!isItemWithDurability(itemData)) return null

  const inv = inventory.find(i => i.itemId === itemId)
  if (!inv) return null

  const current = inv.durability ?? itemData.maxDurability
  const max = itemData.maxDurability
  return { current, max, ratio: current / max }
}

export function isItemBroken(inventory: InventoryItem[], itemId: string): boolean {
  const info = getItemDurabilityInfo(inventory, itemId)
  if (!info) return false
  return info.current <= 0
}

export function getDurabilityModifier(inventory: InventoryItem[], itemId: string): number {
  const info = getItemDurabilityInfo(inventory, itemId)
  if (!info) return 1.0
  if (info.ratio <= 0) return 0.0
  if (info.ratio >= 1.0) return 1.0
  if (info.ratio >= 0.7) return 0.9 + info.ratio * 0.1
  if (info.ratio >= 0.3) return 0.6 + info.ratio * 0.5
  return 0.3 + info.ratio * 0.5
}

export function applyDurabilityWear(
  inventory: InventoryItem[],
  itemId: string,
  cost?: number,
): InventoryItem[] {
  const itemData = ITEMS[itemId]
  if (!isItemWithDurability(itemData)) return inventory

  const wearCost = cost ?? itemData.durabilityCostPerUse ?? 1
  const idx = inventory.findIndex(i => i.itemId === itemId)
  if (idx === -1) return inventory

  const inv = inventory[idx]
  const current = inv.durability ?? itemData.maxDurability
  const newDurability = Math.max(0, current - wearCost)

  return inventory.map((item, i) =>
    i === idx ? { ...item, durability: newDurability } : item,
  )
}

export function canRepair(inventory: InventoryItem[], itemId: string): { canRepair: boolean; reason?: string } {
  const itemData = ITEMS[itemId]
  if (!isItemWithDurability(itemData)) return { canRepair: false, reason: '该物品无需维修' }

  const info = getItemDurabilityInfo(inventory, itemId)
  if (!info) return { canRepair: false, reason: '物品不存在' }
  if (info.current >= info.max) return { canRepair: false, reason: '耐久已满' }

  if (itemData.repairMaterials) {
    for (const mat of itemData.repairMaterials) {
      if (!hasItem(inventory, mat.itemId, mat.count)) {
        const matData = ITEMS[mat.itemId]
        return { canRepair: false, reason: `缺少${matData?.name || mat.itemId}` }
      }
    }
  }

  return { canRepair: true }
}

export function repairItem(
  inventory: InventoryItem[],
  itemId: string,
): { success: boolean; inventory: InventoryItem[]; message: string; repairedAmount: number } {
  const check = canRepair(inventory, itemId)
  if (!check.canRepair) {
    return { success: false, inventory, message: check.reason || '无法维修', repairedAmount: 0 }
  }

  const itemData = ITEMS[itemId]
  if (!isItemWithDurability(itemData)) {
    return { success: false, inventory, message: '该物品无法维修', repairedAmount: 0 }
  }

  const info = getItemDurabilityInfo(inventory, itemId)
  if (!info) {
    return { success: false, inventory, message: '物品不存在', repairedAmount: 0 }
  }

  let newInventory = [...inventory]

  if (itemData.repairMaterials) {
    for (const mat of itemData.repairMaterials) {
      newInventory = removeFromInventory(newInventory, mat.itemId, mat.count)
    }
  }

  const repairAmount = itemData.repairAmount ?? Math.floor(itemData.maxDurability * 0.3)
  const newDurability = Math.min(itemData.maxDurability, info.current + repairAmount)

  const idx = newInventory.findIndex(i => i.itemId === itemId)
  if (idx !== -1) {
    newInventory = newInventory.map((item, i) =>
      i === idx ? { ...item, durability: newDurability } : item,
    )
  }

  return {
    success: true,
    inventory: newInventory,
    message: `维修了${itemData.name}，耐久恢复 +${repairAmount}（${newDurability}/${itemData.maxDurability}）`,
    repairedAmount: repairAmount,
  }
}

export function initializeDurability(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.map(inv => {
    const itemData = ITEMS[inv.itemId]
    if (!isItemWithDurability(itemData)) return inv
    if (isInventoryItemWithDurability(inv)) return inv
    return { ...inv, durability: itemData.maxDurability }
  })
}

export function getDurabilityStatusText(ratio: number): string {
  if (ratio >= 1.0) return '完好'
  if (ratio >= 0.7) return '良好'
  if (ratio >= 0.3) return '磨损'
  if (ratio > 0) return '破损'
  return '损坏'
}

export function getDurabilityColor(ratio: number): string {
  if (ratio >= 0.7) return '#5ec98a'
  if (ratio >= 0.3) return '#d9a54c'
  if (ratio > 0) return '#e68a4c'
  return '#c44a4a'
}
