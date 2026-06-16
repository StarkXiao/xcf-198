import { describe, it, expect } from 'vitest'
import {
  getItemDurabilityInfo,
  isItemBroken,
  getDurabilityModifier,
  applyDurabilityWear,
  canRepair,
  repairItem,
  initializeDurability,
  getDurabilityStatusText,
  getDurabilityColor,
  isItemWithDurability,
  isInventoryItemWithDurability,
} from '../systems/durabilitySystem'
import { ITEMS } from '../data/items'
import type { InventoryItem } from '../types/items'

describe('durabilitySystem - 类型守卫', () => {
  it('isItemWithDurability 能正确识别有耐久的物品', () => {
    expect(isItemWithDurability(ITEMS.hunting_knife)).toBe(true)
    expect(isItemWithDurability(ITEMS.bread)).toBe(false)
    expect(isItemWithDurability(undefined)).toBe(false)
  })

  it('isInventoryItemWithDurability 能正确识别有耐久值的背包物品', () => {
    const withDur: InventoryItem = { itemId: 'hunting_knife', count: 1, durability: 50 }
    const withoutDur: InventoryItem = { itemId: 'bread', count: 3 }
    expect(isInventoryItemWithDurability(withDur)).toBe(true)
    expect(isInventoryItemWithDurability(withoutDur)).toBe(false)
  })
})

describe('durabilitySystem - getItemDurabilityInfo', () => {
  it('对有耐久的物品返回正确的耐久信息', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 30 }]
    const info = getItemDurabilityInfo(inv, 'hunting_knife')
    expect(info).not.toBeNull()
    expect(info?.current).toBe(30)
    expect(info?.max).toBe(60)
    expect(info?.ratio).toBe(0.5)
  })

  it('对无耐久的物品返回 null', () => {
    const inv: InventoryItem[] = [{ itemId: 'bread', count: 3 }]
    const info = getItemDurabilityInfo(inv, 'bread')
    expect(info).toBeNull()
  })

  it('物品不在背包时返回 null', () => {
    const inv: InventoryItem[] = []
    const info = getItemDurabilityInfo(inv, 'hunting_knife')
    expect(info).toBeNull()
  })

  it('未设置 durability 的物品默认按满耐久计算', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1 }]
    const info = getItemDurabilityInfo(inv, 'hunting_knife')
    expect(info?.current).toBe(60)
    expect(info?.ratio).toBe(1.0)
  })
})

describe('durabilitySystem - isItemBroken', () => {
  it('耐久 > 0 时未损坏', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 1 }]
    expect(isItemBroken(inv, 'hunting_knife')).toBe(false)
  })

  it('耐久 = 0 时已损坏', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 0 }]
    expect(isItemBroken(inv, 'hunting_knife')).toBe(true)
  })

  it('无耐久的物品永远不会损坏', () => {
    const inv: InventoryItem[] = [{ itemId: 'bread', count: 3 }]
    expect(isItemBroken(inv, 'bread')).toBe(false)
  })
})

describe('durabilitySystem - getDurabilityModifier', () => {
  it('满耐久时修正系数为 1.0', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 60 }]
    expect(getDurabilityModifier(inv, 'hunting_knife')).toBeCloseTo(1.0)
  })

  it('耐久为 0 时修正系数为 0', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 0 }]
    expect(getDurabilityModifier(inv, 'hunting_knife')).toBe(0.0)
  })

  it('耐久在 70% 以上时为高修正', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 45 }]
    const mod = getDurabilityModifier(inv, 'hunting_knife')
    expect(mod).toBeGreaterThan(0.9)
    expect(mod).toBeLessThanOrEqual(1.0)
  })

  it('耐久在 30%-70% 时为中等修正', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 30 }]
    const mod = getDurabilityModifier(inv, 'hunting_knife')
    expect(mod).toBeGreaterThan(0.5)
    expect(mod).toBeLessThan(0.95)
  })

  it('无耐久的物品修正系数为 1.0', () => {
    const inv: InventoryItem[] = [{ itemId: 'bread', count: 3 }]
    expect(getDurabilityModifier(inv, 'bread')).toBe(1.0)
  })
})

describe('durabilitySystem - applyDurabilityWear', () => {
  it('正常损耗耐久', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 60 }]
    const result = applyDurabilityWear(inv, 'hunting_knife', 10)
    expect(result[0].durability).toBe(50)
  })

  it('使用默认损耗值', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 60 }]
    const result = applyDurabilityWear(inv, 'hunting_knife')
    expect(result[0].durability).toBe(60 - (ITEMS.hunting_knife.durabilityCostPerUse || 1))
  })

  it('耐久不会降到 0 以下', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 5 }]
    const result = applyDurabilityWear(inv, 'hunting_knife', 100)
    expect(result[0].durability).toBe(0)
  })

  it('无耐久的物品不变化', () => {
    const inv: InventoryItem[] = [{ itemId: 'bread', count: 3 }]
    const result = applyDurabilityWear(inv, 'bread', 10)
    expect(result[0].durability).toBeUndefined()
  })

  it('不修改原数组', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 60 }]
    const result = applyDurabilityWear(inv, 'hunting_knife', 10)
    expect(inv[0].durability).toBe(60)
    expect(result[0].durability).toBe(50)
  })
})

describe('durabilitySystem - canRepair', () => {
  it('满耐久时不能维修', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 60 }]
    const result = canRepair(inv, 'hunting_knife')
    expect(result.canRepair).toBe(false)
    expect(result.reason).toContain('耐久已满')
  })

  it('缺少维修材料时不能维修', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 30 }]
    const result = canRepair(inv, 'hunting_knife')
    expect(result.canRepair).toBe(false)
    expect(result.reason).toContain('缺少')
  })

  it('有维修材料且耐久不满时可以维修', () => {
    const inv: InventoryItem[] = [
      { itemId: 'hunting_knife', count: 1, durability: 30 },
      { itemId: 'flint', count: 5 },
      { itemId: 'wood', count: 5 },
    ]
    const result = canRepair(inv, 'hunting_knife')
    expect(result.canRepair).toBe(true)
  })

  it('无耐久的物品不能维修', () => {
    const inv: InventoryItem[] = [{ itemId: 'bread', count: 3 }]
    const result = canRepair(inv, 'bread')
    expect(result.canRepair).toBe(false)
    expect(result.reason).toContain('无需维修')
  })
})

describe('durabilitySystem - repairItem', () => {
  it('维修成功，恢复耐久并消耗材料', () => {
    const inv: InventoryItem[] = [
      { itemId: 'hunting_knife', count: 1, durability: 10 },
      { itemId: 'flint', count: 5 },
      { itemId: 'wood', count: 5 },
    ]
    const result = repairItem(inv, 'hunting_knife')
    expect(result.success).toBe(true)
    expect(result.repairedAmount).toBeGreaterThan(0)
    expect(result.inventory.find(i => i.itemId === 'hunting_knife')?.durability).toBe(30)
    expect(result.inventory.find(i => i.itemId === 'flint')?.count).toBe(4)
    expect(result.inventory.find(i => i.itemId === 'wood')?.count).toBe(4)
  })

  it('维修不会超过最大耐久', () => {
    const inv: InventoryItem[] = [
      { itemId: 'hunting_knife', count: 1, durability: 55 },
      { itemId: 'flint', count: 5 },
      { itemId: 'wood', count: 5 },
    ]
    const result = repairItem(inv, 'hunting_knife')
    expect(result.success).toBe(true)
    const dur = result.inventory.find(i => i.itemId === 'hunting_knife')?.durability
    expect(dur).toBeLessThanOrEqual(60)
  })

  it('材料不足时维修失败', () => {
    const inv: InventoryItem[] = [
      { itemId: 'hunting_knife', count: 1, durability: 10 },
      { itemId: 'flint', count: 0 },
    ]
    const result = repairItem(inv, 'hunting_knife')
    expect(result.success).toBe(false)
    expect(result.inventory[0].durability).toBe(10)
  })
})

describe('durabilitySystem - initializeDurability', () => {
  it('为新物品初始化满耐久', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1 }]
    const result = initializeDurability(inv)
    expect(result[0].durability).toBe(60)
  })

  it('已有耐久值的物品不修改', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 25 }]
    const result = initializeDurability(inv)
    expect(result[0].durability).toBe(25)
  })

  it('无耐久的物品不变化', () => {
    const inv: InventoryItem[] = [{ itemId: 'bread', count: 3 }]
    const result = initializeDurability(inv)
    expect(result[0].durability).toBeUndefined()
  })

  it('不修改原数组', () => {
    const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1 }]
    const result = initializeDurability(inv)
    expect(inv[0].durability).toBeUndefined()
    expect(result[0].durability).toBe(60)
  })
})

describe('durabilitySystem - UI 辅助函数', () => {
  it('getDurabilityStatusText 返回正确的状态文本', () => {
    expect(getDurabilityStatusText(1.0)).toBe('完好')
    expect(getDurabilityStatusText(0.8)).toBe('良好')
    expect(getDurabilityStatusText(0.5)).toBe('磨损')
    expect(getDurabilityStatusText(0.1)).toBe('破损')
    expect(getDurabilityStatusText(0)).toBe('损坏')
  })

  it('getDurabilityColor 返回正确的颜色', () => {
    expect(getDurabilityColor(0.8)).toBe('#5ec98a')
    expect(getDurabilityColor(0.5)).toBe('#d9a54c')
    expect(getDurabilityColor(0.1)).toBe('#e68a4c')
    expect(getDurabilityColor(0)).toBe('#c44a4a')
  })
})
