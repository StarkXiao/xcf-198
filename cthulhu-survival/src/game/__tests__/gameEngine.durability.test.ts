import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../engine/GameEngine'
import { IDENTITIES } from '../data/identities'
import type { SerializedSave } from '../engine/GameEngine'
import type { InventoryItem } from '../types/items'
import { ITEMS } from '../data/items'
import { createInitialGrowthProgress } from '../systems/growthTreeSystem'

describe('GameEngine - 耐久系统集成', () => {
  let engine: GameEngine

  beforeEach(() => {
    const identity = IDENTITIES.find(id => id.id === 'scholar') || IDENTITIES[0]
    engine = new GameEngine(identity)
  })

  describe('初始化耐久', () => {
    it('初始背包中的羽毛笔为满耐久', () => {
      const inv = engine.getInventory()
      const quillPen = inv.find(i => i.itemId === 'quill_pen')
      expect(quillPen).toBeDefined()
      expect(quillPen!.durability).toBe(ITEMS.quill_pen.maxDurability!)
    })

    it('初始背包中的古旧抄本没有耐久（非耐久物品）', () => {
      const inv = engine.getInventory()
      const oldBook = inv.find(i => i.itemId === 'old_book')
      expect(oldBook).toBeDefined()
      expect(oldBook!.durability).toBeUndefined()
    })

    it('初始背包中的消耗品没有耐久字段', () => {
      const inv = engine.getInventory()
      const herbs = inv.find(i => i.itemId === 'dried_herb')
      expect(herbs).toBeDefined()
      expect(herbs!.durability).toBeUndefined()
    })
  })

  describe('canRepairItem / repairItem', () => {
    it('满耐久的羽毛笔不能维修', () => {
      const result = engine.canRepairItem('quill_pen')
      expect(result.canRepair).toBe(false)
      expect(result.reason).toContain('耐久已满')
    })

    it('非耐久物品不能维修', () => {
      const result = engine.canRepairItem('bread')
      expect(result.canRepair).toBe(false)
      expect(result.reason).toContain('无需维修')
    })

    it('不存在的物品不能维修', () => {
      const result = engine.canRepairItem('nonexistent_item')
      expect(result.canRepair).toBe(false)
    })
  })

  describe('序列化与反序列化 - 读档补全耐久', () => {
    it('正常存档加载后耐久值保持不变', () => {
      const inv = engine.getInventory()
      const quillBefore = inv.find(i => i.itemId === 'quill_pen')!
      const durBefore = quillBefore.durability!

      const saveData: SerializedSave = {
        state: engine.getState(),
        identity: engine.getIdentity(),
        inventory: [],
        growthProgress: createInitialGrowthProgress(),
        savedAt: Date.now(),
      }

      const loadedEngine = GameEngine.fromSerialized(saveData)
      const quillAfter = loadedEngine.getInventory().find(i => i.itemId === 'quill_pen')!
      expect(quillAfter.durability).toBe(durBefore)
    })

    it('旧存档（无 durability 字段）加载时自动补全满耐久', () => {
      const identity = IDENTITIES.find(id => id.id === 'scholar') || IDENTITIES[0]
      const oldStyleInventory: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1 },
        { itemId: 'dried_herb', count: 2 },
        { itemId: 'old_book', count: 1 },
      ]

      const baseState = engine.getState()
      const saveData: SerializedSave = {
        state: { ...baseState, inventory: oldStyleInventory },
        identity,
        inventory: [],
        growthProgress: createInitialGrowthProgress(),
        savedAt: Date.now(),
      }

      const loadedEngine = GameEngine.fromSerialized(saveData)
      const loadedInv = loadedEngine.getInventory()

      const quill = loadedInv.find(i => i.itemId === 'quill_pen')
      expect(quill).toBeDefined()
      expect(quill!.durability).toBe(ITEMS.quill_pen.maxDurability!)
      expect(typeof quill!.durability).toBe('number')

      const herb = loadedInv.find(i => i.itemId === 'dried_herb')
      expect(herb).toBeDefined()
      expect(herb!.durability).toBeUndefined()
    })

    it('已有耐久数据的存档加载时不覆盖原值', () => {
      const identity = IDENTITIES.find(id => id.id === 'scholar') || IDENTITIES[0]
      const customDur = 27
      const testInventory: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: customDur },
        { itemId: 'dried_herb', count: 2 },
      ]

      const baseState = engine.getState()
      const saveData: SerializedSave = {
        state: { ...baseState, inventory: testInventory },
        identity,
        inventory: [],
        growthProgress: createInitialGrowthProgress(),
        savedAt: Date.now(),
      }

      const loadedEngine = GameEngine.fromSerialized(saveData)
      const loadedInv = loadedEngine.getInventory()

      const quill = loadedInv.find(i => i.itemId === 'quill_pen')
      expect(quill).toBeDefined()
      expect(quill!.durability).toBe(customDur)
    })

    it('零耐久的物品加载后仍为零耐久', () => {
      const identity = IDENTITIES.find(id => id.id === 'scholar') || IDENTITIES[0]
      const testInventory: InventoryItem[] = [
        { itemId: 'quill_pen', count: 1, durability: 0 },
      ]

      const baseState = engine.getState()
      const saveData: SerializedSave = {
        state: { ...baseState, inventory: testInventory },
        identity,
        inventory: [],
        growthProgress: createInitialGrowthProgress(),
        savedAt: Date.now(),
      }

      const loadedEngine = GameEngine.fromSerialized(saveData)
      const quill = loadedEngine.getInventory().find(i => i.itemId === 'quill_pen')
      expect(quill).toBeDefined()
      expect(quill!.durability).toBe(0)
    })
  })
})
