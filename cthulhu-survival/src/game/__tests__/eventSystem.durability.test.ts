import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkChoiceRequirements, executeEventChoice } from '../systems/eventSystem'
import { getEventById } from '../data/events'
import { ITEMS } from '../data/items'
import type { InventoryItem } from '../types/items'
import type { Identity } from '../types/identity'
import type { GameState, PlayerStats } from '../types/game'
import { createDefaultReputation } from '../systems/reputationSystem'
import { createInitialTime } from '../systems/timeSystem'

vi.mock('../utils/random', async () => {
  const actual = await vi.importActual<typeof import('../utils/random')>('../utils/random')
  return {
    ...actual,
    chance: vi.fn(() => true),
  }
})

import { chance } from '../utils/random'

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
}

const defaultStats: PlayerStats = {
  hp: 100,
  maxHp: 100,
  sanity: 100,
  maxSanity: 100,
  hunger: 100,
  energy: 100,
  pollution: 0,
}

function createState(inventory: InventoryItem[]): GameState {
  return {
    status: 'playing',
    time: createInitialTime(mockIdentity),
    stats: { ...defaultStats },
    inventory,
    equippedItem: null,
    flags: {},
    discoveredTiles: ['forest_2'],
    triggeredEvents: [],
    unlockedEndings: [],
    currentEndingId: null,
    currentEventId: null,
    position: { x: 0, y: 0 },
    reputation: createDefaultReputation(),
  }
}

describe('eventSystem - 耐久集成', () => {
  beforeEach(() => {
    vi.mocked(chance).mockReturnValue(true)
  })

  describe('checkChoiceRequirements - 物品耐久检查', () => {
    it('武器完好时选项可用', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 60 },
      ]
      const choice = event.choices.find(c => c.id === 'fight')
      expect(choice).toBeDefined()
      if (!choice) return

      const result = checkChoiceRequirements(choice, inv, defaultStats, mockIdentity)
      expect(result.available).toBe(true)
    })

    it('武器损坏时选项不可用', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 0 },
      ]
      const choice = event.choices.find(c => c.id === 'fight')
      expect(choice).toBeDefined()
      if (!choice) return

      const result = checkChoiceRequirements(choice, inv, defaultStats, mockIdentity)
      expect(result.available).toBe(false)
      expect(result.reason).toContain('损坏')
    })

    it('没有武器时选项不可用', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = []
      const choice = event.choices.find(c => c.id === 'fight')
      expect(choice).toBeDefined()
      if (!choice) return

      const result = checkChoiceRequirements(choice, inv, defaultStats, mockIdentity)
      expect(result.available).toBe(false)
    })
  })

  describe('executeEventChoice - 耐久对成功率的影响', () => {
    it('满耐久武器时成功率不受损', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 60 },
      ]
      const state = createState(inv)

      let capturedRate = 0
      vi.mocked(chance).mockImplementation(rate => {
        capturedRate = rate
        return true
      })

      executeEventChoice(event, 'fight', state, mockIdentity, null)

      expect(capturedRate).toBeCloseTo(0.7)
    })

    it('低耐久武器时成功率降低', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 10 },
      ]
      const state = createState(inv)

      let capturedRate = 0
      vi.mocked(chance).mockImplementation(rate => {
        capturedRate = rate
        return true
      })

      executeEventChoice(event, 'fight', state, mockIdentity, null)

      expect(capturedRate).toBeLessThan(0.7)
      expect(capturedRate).toBeGreaterThan(0)
    })

    it('零耐久武器时成功率为0', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 0 },
      ]
      const state = createState(inv)

      let capturedRate = -1
      vi.mocked(chance).mockImplementation(rate => {
        capturedRate = rate
        return false
      })

      executeEventChoice(event, 'fight', state, mockIdentity, null)

      expect(capturedRate).toBe(0)
    })
  })

  describe('executeEventChoice - 使用后耐久损耗', () => {
    it('事件执行成功后武器耐久减少', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 60 },
      ]
      const state = createState(inv)
      vi.mocked(chance).mockReturnValue(true)

      const result = executeEventChoice(event, 'fight', state, mockIdentity, null)
      expect(result).not.toBeNull()
      if (!result) return

      const knife = result.consequences.inventory.find(i => i.itemId === 'hunting_knife')
      expect(knife).toBeDefined()
      expect(knife!.durability).toBeLessThan(60)
      expect(knife!.durability).toBe(60 - (ITEMS.hunting_knife.durabilityCostPerUse || 1))
    })

    it('事件执行失败后武器也会损耗耐久', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 60 },
      ]
      const state = createState(inv)
      vi.mocked(chance).mockReturnValue(false)

      const result = executeEventChoice(event, 'fight', state, mockIdentity, null)
      expect(result).not.toBeNull()
      if (!result) return

      const knife = result.consequences.inventory.find(i => i.itemId === 'hunting_knife')
      expect(knife).toBeDefined()
      expect(knife!.durability).toBeLessThan(60)
    })

    it('武器耐久降到0时提示损坏信息', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 5 },
      ]
      const state = createState(inv)
      vi.mocked(chance).mockReturnValue(true)

      const result = executeEventChoice(event, 'fight', state, mockIdentity, null)
      expect(result).not.toBeNull()
      if (!result) return

      const knife = result.consequences.inventory.find(i => i.itemId === 'hunting_knife')
      expect(knife!.durability).toBe(0)
      const hasBreakMsg = result.messages.some(m => m.includes('损坏'))
      expect(hasBreakMsg).toBe(true)
    })

    it('无耐久的物品使用后不影响', () => {
      const event = getEventById('event_forest_creature')
      expect(event).toBeDefined()
      if (!event) return

      const inv: InventoryItem[] = [
        { itemId: 'hunting_knife', count: 1, durability: 60 },
        { itemId: 'bread', count: 5 },
      ]
      const state = createState(inv)
      vi.mocked(chance).mockReturnValue(true)

      const result = executeEventChoice(event, 'fight', state, mockIdentity, null)
      expect(result).not.toBeNull()
      if (!result) return

      const bread = result.consequences.inventory.find(i => i.itemId === 'bread')
      expect(bread?.durability).toBeUndefined()
      expect(bread?.count).toBe(5)
    })
  })
})
