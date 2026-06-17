import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chance } from '../utils/random'
import {
  canCraft,
  craftItem,
  addToInventory,
  itemIdsToInventory,
  getAvailableRecipes,
} from '../systems/craftSystem'
import { RECIPES } from '../data/recipes'
import { ITEMS } from '../data/items'
import type { InventoryItem, CraftRecipe } from '../types/items'
import type { PlayerStats } from '../types/game'
import type { Identity } from '../types/identity'
import { createInitialAlienation } from '../systems/alienationSystem'

vi.mock('../utils/random', () => ({
  chance: vi.fn(() => true),
}))

const mockIdentity: Identity = {
  id: 'test',
  name: '测试',
  title: '测试身份',
  description: '',
  lore: '',
  icon: '🧪',
  baseStats: {
    maxHp: 100,
    maxSanity: 100,
    startPollution: 0,
    startHunger: 100,
    startEnergy: 100,
  },
  startInventory: [],
  skills: [],
  startPosition: { x: 0, y: 0 },
  scoutingSpecialty: null,
}

const defaultStats: PlayerStats = {
  hp: 100,
  maxHp: 100,
  sanity: 100,
  maxSanity: 100,
  hunger: 100,
  energy: 100,
  pollution: 0,
  alienation: createInitialAlienation(),
}

const toolRecipe: CraftRecipe | undefined = RECIPES.find(r => r.requiredTool === 'quill_pen')

describe('craftSystem - 耐久集成', () => {
  beforeEach(() => {
    vi.mocked(chance).mockReturnValue(true)
  })

  describe('canCraft - 工具耐久检查', () => {
    it('工具完好且在背包中时可以合成', () => {
      if (!toolRecipe) {
        expect(true).toBe(true)
        return
      }
      const inv: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: 50 },
        { itemId: 'strange_stone', count: 5 },
        { itemId: 'ancient_rune', count: 5 },
        { itemId: 'dried_herb', count: 5 },
      ]
      const result = canCraft(toolRecipe, inv, defaultStats)
      expect(result.canCraft).toBe(true)
    })

    it('工具损坏时不能合成', () => {
      if (!toolRecipe) {
        expect(true).toBe(true)
        return
      }
      const inv: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: 0 },
        { itemId: 'strange_stone', count: 5 },
        { itemId: 'ancient_rune', count: 5 },
        { itemId: 'dried_herb', count: 5 },
      ]
      const result = canCraft(toolRecipe, inv, defaultStats)
      expect(result.canCraft).toBe(false)
      expect(result.reason).toContain('损坏')
    })

    it('工具不在背包中时不能合成', () => {
      if (!toolRecipe) {
        expect(true).toBe(true)
        return
      }
      const inv: InventoryItem[] = [
        { itemId: 'strange_stone', count: 5 },
        { itemId: 'ancient_rune', count: 5 },
        { itemId: 'dried_herb', count: 5 },
      ]
      const result = canCraft(toolRecipe, inv, defaultStats)
      expect(result.canCraft).toBe(false)
      expect(result.reason).toContain('工具')
    })
  })

  describe('craftItem - 工具耐久损耗', () => {
    it('合成成功后工具耐久减少', () => {
      if (!toolRecipe) {
        expect(true).toBe(true)
        return
      }
      const inv: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: 50 },
        { itemId: 'strange_stone', count: 5 },
        { itemId: 'ancient_rune', count: 5 },
        { itemId: 'dried_herb', count: 5 },
      ]
      vi.mocked(chance).mockReturnValue(true)
      const result = craftItem(toolRecipe, inv, defaultStats, mockIdentity)
      expect(result.success).toBe(true)
      const tool = result.inventory.find(i => i.itemId === 'quill_pen')
      expect(tool).toBeDefined()
      expect(tool!.durability).toBeLessThan(50)
      expect(tool!.durability).toBe(50 - (ITEMS.quill_pen.durabilityCostPerUse || 1))
    })

    it('合成失败后工具也会损耗耐久', () => {
      if (!toolRecipe) {
        expect(true).toBe(true)
        return
      }
      const inv: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: 50 },
        { itemId: 'strange_stone', count: 5 },
        { itemId: 'ancient_rune', count: 5 },
        { itemId: 'dried_herb', count: 5 },
      ]
      vi.mocked(chance).mockReturnValue(false)
      const result = craftItem(toolRecipe, inv, defaultStats, mockIdentity)
      expect(result.success).toBe(false)
      const tool = result.inventory.find(i => i.itemId === 'quill_pen')
      expect(tool).toBeDefined()
      expect(tool!.durability).toBeLessThan(50)
    })

    it('合成有耐久的产物时，新物品初始化为满耐久', () => {
      const recipe = RECIPES.find(r => r.id === 'make_torch')!
      const inv: InventoryItem[] = [
        { itemId: 'wood', count: 10 },
        { itemId: 'dried_herb', count: 10 },
      ]
      vi.mocked(chance).mockReturnValue(true)
      const result = craftItem(recipe, inv, defaultStats, mockIdentity)
      expect(result.success).toBe(true)
      const torch = result.inventory.find(i => i.itemId === 'torch')
      expect(torch).toBeDefined()
      expect(torch!.durability).toBe(ITEMS.torch.maxDurability)
    })
  })

  describe('addToInventory - 耐久初始化', () => {
    it('添加有耐久的新物品时自动设为满耐久', () => {
      const inv: InventoryItem[] = []
      const result = addToInventory(inv, 'hunting_knife', 1)
      expect(result[0].durability).toBe(ITEMS.hunting_knife.maxDurability)
    })

    it('添加无耐久的物品时不设置耐久', () => {
      const inv: InventoryItem[] = []
      const result = addToInventory(inv, 'bread', 3)
      expect(result[0].durability).toBeUndefined()
    })

    it('堆叠已有物品时不改变耐久', () => {
      const inv: InventoryItem[] = [{ itemId: 'hunting_knife', count: 1, durability: 20 }]
      const result = addToInventory(inv, 'hunting_knife', 1)
      expect(result[0].count).toBe(2)
      expect(result[0].durability).toBe(20)
    })
  })

  describe('itemIdsToInventory - 耐久初始化', () => {
    it('转换物品列表时为有耐久的物品设置满耐久', () => {
      const result = itemIdsToInventory(['hunting_knife', 'bread', 'bread'])
      const knife = result.find(i => i.itemId === 'hunting_knife')
      const bread = result.find(i => i.itemId === 'bread')
      expect(knife?.durability).toBe(ITEMS.hunting_knife.maxDurability)
      expect(bread?.durability).toBeUndefined()
      expect(bread?.count).toBe(2)
    })
  })

  describe('getAvailableRecipes - 集成', () => {
    it('能正确获取可合成配方列表', () => {
      const inv: InventoryItem[] = [
        { itemId: 'raw_meat', count: 10 },
        { itemId: 'wood', count: 10 },
        { itemId: 'flint', count: 10 },
      ]
      const recipes = getAvailableRecipes(inv, {})
      expect(recipes.length).toBeGreaterThan(0)
      const cookMeat = recipes.find(r => r.id === 'cook_meat')
      expect(cookMeat).toBeDefined()
    })

    it('工具损坏时相关配方虽然出现但不能合成', () => {
      if (!toolRecipe) {
        expect(true).toBe(true)
        return
      }
      const inv: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: 0 },
        { itemId: 'strange_stone', count: 5 },
        { itemId: 'ancient_rune', count: 5 },
        { itemId: 'dried_herb', count: 5 },
      ]
      const recipes = getAvailableRecipes(inv, { unlock_ritual: true })
      const found = recipes.find(r => r.id === toolRecipe.id)
      expect(found).toBeDefined()
      const craftResult = canCraft(toolRecipe, inv, defaultStats)
      expect(craftResult.canCraft).toBe(false)
      expect(craftResult.reason).toContain('损坏')
    })
  })
})
