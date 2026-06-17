import type { GameState, MapTile, Position, DangerInfo } from '../types/game'
import type { Identity, SkillEffect } from '../types/identity'
import type { InventoryItem, CraftRecipe } from '../types/items'
import type { GameEvent, Ending, EventChoice } from '../types/events'
import type { GrowthTreeProgress, GrowthNode } from '../types/growthTree'
import { MAP_TILES, getTileAt } from '../data/events'
import { ITEMS } from '../data/items'
import {
  createInitialTime,
  consumeAction,
  isNight,
} from '../systems/timeSystem'
import {
  createInitialStats,
  applyPollutionEffect,
  applyPhaseEffects,
  isStatsCritical,
} from '../systems/pollutionSystem'
import {
  itemIdsToInventory,
  getAvailableRecipes,
  canCraft,
  craftItem,
  removeFromInventory,
  addToInventory,
} from '../systems/craftSystem'
import {
  findTriggeredEvents,
  executeEventChoice,
  checkChoiceRequirements,
  type EventResult,
} from '../systems/eventSystem'
import {
  checkAvailableEndings,
  checkForImmediateEnding,
} from '../systems/endingSystem'
import { createDefaultReputation } from '../systems/reputationSystem'
import {
  calculateDangerInfo,
  calculateMovementCost,
  weightEventsByDanger,
  filterEventsByDanger,
  calculateLootQualityModifier,
  generateBonusLoot,
} from '../systems/dangerSystem'
import {
  createInitialGrowthProgress,
  getGrowthTreeForIdentity,
  unlockNode as unlockNodeSystem,
  useActiveNode as useActiveNodeSystem,
  getAvailableUnlockableNodes,
  decrementCooldowns,
  checkNodeCanUnlock,
  canUseActiveNode,
  getUnlockedPassiveEffects,
} from '../systems/growthTreeSystem'
import type { LootQualityModifier } from '../types/game'
import { clamp } from '../utils/random'
import { repairItem as repairItemSystem, canRepair, initializeDurability } from '../systems/durabilitySystem'
import { createSnapshotFromSave, addSnapshot, mergePermanentUnlocks } from '../utils/snapshot'

export interface EngineState {
  state: GameState
  identity: Identity
}

export interface MoveResult {
  success: boolean
  newPosition: Position
  tile: MapTile | undefined
  events: GameEvent[]
  messages: string[]
  actionConsumed: boolean
  actionCost: number
  phaseChanged: boolean
  dayChanged: boolean
  dangerInfo: DangerInfo | null
  lootQualityModifier: LootQualityModifier | null
}

export class GameEngine {
  private state: GameState
  private identity: Identity
  private growthProgress: GrowthTreeProgress

  constructor(identity: Identity) {
    this.identity = identity
    this.state = this.createInitialState(identity)
    this.growthProgress = createInitialGrowthProgress()
  }

  static fromSerialized(data: SerializedSave): GameEngine {
    const identity = data.identity
    const engine = new GameEngine(identity)
    const rawInventory = Array.isArray(data.state.inventory) && data.state.inventory.length > 0
      ? data.state.inventory
      : (data.inventory || [])
    engine.state = {
      ...data.state,
      inventory: initializeDurability(rawInventory),
      reputation: data.state.reputation || createDefaultReputation(),
    }
    engine.identity = data.identity
    engine.growthProgress = data.growthProgress || createInitialGrowthProgress()
    return engine
  }

  private createInitialState(identity: Identity): GameState {
    const inventory = initializeDurability(itemIdsToInventory([...identity.startInventory]))
    return {
      status: 'playing',
      time: createInitialTime(identity),
      stats: createInitialStats(identity),
      position: { ...identity.startPosition },
      inventory,
      equippedItem: null,
      flags: {},
      discoveredTiles: this.getInitialDiscoveredTiles(identity.startPosition),
      triggeredEvents: [],
      unlockedEndings: [],
      currentEndingId: null,
      currentEventId: null,
      reputation: createDefaultReputation(),
    }
  }

  private getInitialDiscoveredTiles(start: Position): string[] {
    const discovered: string[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = getTileAt(start.x + dx, start.y + dy)
        if (tile) discovered.push(tile.id)
      }
    }
    return discovered
  }

  getState(): GameState {
    return {
      ...this.state,
      inventory: [...this.state.inventory],
      discoveredTiles: [...this.state.discoveredTiles],
      triggeredEvents: [...this.state.triggeredEvents],
      unlockedEndings: [...this.state.unlockedEndings],
      flags: { ...this.state.flags },
      reputation: { ...this.state.reputation },
    }
  }

  getIdentity(): Identity {
    return { ...this.identity }
  }

  getInventory(): InventoryItem[] {
    return [...this.state.inventory]
  }

  getTileAtPosition(x: number, y: number): MapTile | undefined {
    return getTileAt(x, y)
  }

  getCurrentTile(): MapTile | undefined {
    return getTileAt(this.state.position.x, this.state.position.y)
  }

  getAllTiles(): MapTile[] {
    return MAP_TILES.map(t => ({
      ...t,
      explored: this.state.discoveredTiles.includes(t.id),
    }))
  }

  private updateInventory(newInventory: InventoryItem[]) {
    this.state.inventory = [...newInventory]
  }

  getCurrentDangerInfo(tile: MapTile | undefined = this.getCurrentTile()): DangerInfo | null {
    if (!tile) return null
    return calculateDangerInfo(tile, this.state.time.phase, this.state.stats.pollution)
  }

  getLootQualityModifier(): LootQualityModifier | null {
    const tile = this.getCurrentTile()
    const dangerInfo = this.getCurrentDangerInfo(tile)
    if (!dangerInfo) return null
    return calculateLootQualityModifier(dangerInfo)
  }

  moveTo(x: number, y: number): MoveResult {
    const messages: string[] = []
    const dx = Math.abs(x - this.state.position.x)
    const dy = Math.abs(y - this.state.position.y)

    if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
      return {
        success: false,
        newPosition: this.state.position,
        tile: undefined,
        events: [],
        messages: ['无法移动到该位置'],
        actionConsumed: false,
        actionCost: 0,
        phaseChanged: false,
        dayChanged: false,
        dangerInfo: null,
        lootQualityModifier: null,
      }
    }

    const tile = getTileAt(x, y)
    if (!tile) {
      return {
        success: false,
        newPosition: this.state.position,
        tile: undefined,
        events: [],
        messages: ['那里没有可探索的区域'],
        actionConsumed: false,
        actionCost: 0,
        phaseChanged: false,
        dayChanged: false,
        dangerInfo: null,
        lootQualityModifier: null,
      }
    }

    const dangerInfo = calculateDangerInfo(tile, this.state.time.phase, this.state.stats.pollution)
    const lootQualityModifier = calculateLootQualityModifier(dangerInfo)
    const actionCost = calculateMovementCost(dangerInfo, 1)

    this.state.position = { x, y }

    if (!this.state.discoveredTiles.includes(tile.id)) {
      this.state.discoveredTiles.push(tile.id)
      this.discoverNearby(x, y)
      messages.push(`你发现了新的区域：${tile.name}`)

      const exploreLoot = generateBonusLoot(tile.resources, dangerInfo)
      if (exploreLoot.length > 0) {
        for (const loot of exploreLoot) {
          this.state.inventory = addToInventory(this.state.inventory, loot.itemId, loot.count)
        }
        const lootSummary = exploreLoot.map(l => `${l.itemId}x${l.count}`).join(', ')
        messages.push(`探索收获：${lootSummary}（危险度加成 x${lootQualityModifier.multiplier.toFixed(1)}）`)
      }
    }

    messages.push(`${dangerInfo.icon} ${dangerInfo.description}`)
    if (actionCost > 1) {
      messages.push(`危险区域消耗了额外的行动力：${actionCost} 点`)
    }

    const actionResult = consumeAction(this.state.time, actionCost)
    this.state.time = actionResult.time

    let phaseChanged = actionResult.phaseChanged
    let dayChanged = actionResult.dayChanged

    if (phaseChanged) {
      this.handlePhaseChange()
      messages.push(
        dayChanged
          ? `新的一天开始了...第 ${this.state.time.day} 天`
          : this.state.time.phase === 'night'
          ? '夜幕降临，小心行事...'
          : '黎明到来，阳光稍许驱散了阴霾。',
      )
    }

    const rawEvents = findTriggeredEvents(this.state, tile.type, tile.id)
    const filteredEvents = filterEventsByDanger(rawEvents, dangerInfo)
    const weightedEvents = weightEventsByDanger(filteredEvents, dangerInfo)

    const triggerableEvents = weightedEvents.filter(e => {
      if (e.trigger.type === 'tile_enter' && e.trigger.tileId) {
        return tile.hasEvent && tile.eventId === e.id
      }
      return true
    })

    const ending = checkForImmediateEnding(this.state)
    if (ending) {
      this.state.status = 'ending'
      this.state.currentEndingId = ending.id
    }

    return {
      success: true,
      newPosition: this.state.position,
      tile,
      events: triggerableEvents,
      messages,
      actionConsumed: true,
      actionCost,
      phaseChanged,
      dayChanged,
      dangerInfo,
      lootQualityModifier,
    }
  }

  private discoverNearby(x: number, y: number) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = getTileAt(x + dx, y + dy)
        if (tile && !this.state.discoveredTiles.includes(tile.id)) {
          this.state.discoveredTiles.push(tile.id)
        }
      }
    }
  }

  private getGrowthEffects(): SkillEffect[] {
    const tree = this.getGrowthTree()
    if (!tree) return []
    return getUnlockedPassiveEffects(this.growthProgress, tree)
  }

  private handlePhaseChange() {
    const night = isNight(this.state.time)
    this.state.stats = applyPhaseEffects(this.state.stats, night, this.identity, this.getGrowthEffects())
    this.growthProgress = decrementCooldowns(this.growthProgress)
  }

  triggerEvent(event: GameEvent): void {
    this.state.currentEventId = event.id
    this.state.status = 'event'
  }

  executeChoice(event: GameEvent, choiceId: string): EventResult | null {
    const tile = this.getCurrentTile()
    const dangerInfo = tile
      ? calculateDangerInfo(tile, this.state.time.phase, this.state.stats.pollution)
      : null

    const result = executeEventChoice(event, choiceId, this.state, this.identity, dangerInfo, this.getGrowthEffects())
    if (!result) return null

    this.state.stats = result.consequences.stats
    this.updateInventory(result.consequences.inventory)
    this.state.flags = { ...result.consequences.flags }
    this.state.reputation = { ...result.consequences.reputation }

    if (result.consequences.triggeredEvents.length > 0) {
      this.state.triggeredEvents.push(...result.consequences.triggeredEvents)
    }
    if (result.consequences.unlockedEndings.length > 0) {
      this.state.unlockedEndings.push(...result.consequences.unlockedEndings)
    }
    if (result.consequences.revealedTiles.length > 0) {
      for (const tileId of result.consequences.revealedTiles) {
        if (!this.state.discoveredTiles.includes(tileId)) {
          this.state.discoveredTiles.push(tileId)
        }
      }
    }
    if (result.consequences.actionPointDelta !== 0) {
      this.state.time.actionsLeft = clamp(
        this.state.time.actionsLeft + result.consequences.actionPointDelta,
        0,
        this.state.time.maxActionsPerPhase * 2,
      )
    }

    if (event.onceOnly) {
      this.state.triggeredEvents.push(event.id)
    }

    if (event.pollutionGain) {
      let pGain = event.pollutionGain
      if (dangerInfo) {
        pGain = Math.round(pGain * dangerInfo.pollutionModifier)
      }
      this.state.stats = applyPollutionEffect(this.state.stats, pGain, this.identity, this.getGrowthEffects())
    }
    if (event.sanityGain) {
      let sGain = event.sanityGain
      if (dangerInfo) {
        if (sGain < 0) {
          sGain = Math.round(sGain * (1 + (dangerInfo.value / 100) * 0.5))
        }
      }
      this.state.stats.sanity = clamp(this.state.stats.sanity + sGain, 0, this.state.stats.maxSanity)
    }

    if (result.success && tile && dangerInfo) {
      const bonusItems = generateBonusLoot(tile.resources, dangerInfo)
      if (bonusItems.length > 0) {
        for (const bi of bonusItems) {
          this.state.inventory = addToInventory(this.state.inventory, bi.itemId, bi.count)
        }
        result.messages.push(`在探索中发现了额外物资！+${bonusItems.map(b => `x${b.count}`).join(', ')}`)
      }
    }

    this.state.currentEventId = null
    this.state.status = 'playing'

    const immediateEnding = checkForImmediateEnding(this.state)
    if (immediateEnding) {
      this.state.status = 'ending'
      this.state.currentEndingId = immediateEnding.id
    }

    if (this.isKeyDecisionEvent(event)) {
      const choice = event.choices.find(c => c.id === choiceId)
      if (choice) {
        this.createChapterSnapshot(event, { choice, success: result.success })
      }
    }

    return result
  }

  closeEvent(): void {
    this.state.currentEventId = null
    this.state.status = 'playing'
  }

  checkChoiceAvail(event: GameEvent, choiceId: string) {
    const choice = event.choices.find(c => c.id === choiceId)
    if (!choice) return { available: false }
    return checkChoiceRequirements(choice, this.state.inventory, this.state.stats, this.identity, this.state.reputation)
  }

  getCraftableRecipes(): CraftRecipe[] {
    return getAvailableRecipes(this.state.inventory, this.state.flags, this.state.reputation)
  }

  canCraft(recipe: CraftRecipe) {
    return canCraft(recipe, this.state.inventory, this.state.stats)
  }

  craft(recipe: CraftRecipe) {
    const result = craftItem(recipe, this.state.inventory, this.state.stats, this.identity)
    this.updateInventory(result.inventory)
    this.state.stats = result.stats
    return result
  }

  useItem(itemId: string): { success: boolean; message: string } {
    const idx = this.state.inventory.findIndex(i => i.itemId === itemId)
    if (idx === -1) return { success: false, message: '物品不存在' }

    const itemData = ITEMS[itemId]
    if (!itemData) return { success: false, message: '物品数据错误' }

    if (itemData.type !== 'consumable' && !itemData.hpOnUse && !itemData.sanityOnUse
        && !itemData.pollutionOnUse && !itemData.hungerOnUse && !itemData.energyOnUse) {
      return { success: false, message: '该物品无法使用' }
    }

    if (itemData.hpOnUse) {
      this.state.stats.hp = clamp(this.state.stats.hp + itemData.hpOnUse, 0, this.state.stats.maxHp)
    }
    if (itemData.sanityOnUse) {
      this.state.stats.sanity = clamp(this.state.stats.sanity + itemData.sanityOnUse, 0, this.state.stats.maxSanity)
    }
    if (itemData.pollutionOnUse) {
      this.state.stats = applyPollutionEffect(this.state.stats, itemData.pollutionOnUse, this.identity, this.getGrowthEffects())
    }
    if (itemData.hungerOnUse) {
      this.state.stats.hunger = clamp(this.state.stats.hunger + itemData.hungerOnUse, 0, 100)
    }
    if (itemData.energyOnUse) {
      this.state.stats.energy = clamp(this.state.stats.energy + itemData.energyOnUse, 0, 100)
    }

    this.updateInventory(removeFromInventory(this.state.inventory, itemId, 1))

    const immediateEnding = checkForImmediateEnding(this.state)
    if (immediateEnding) {
      this.state.status = 'ending'
      this.state.currentEndingId = immediateEnding.id
    }

    return { success: true, message: `使用了 ${itemData.name}` }
  }

  restAtCamp(): { success: boolean; messages: string[] } {
    const tile = this.getCurrentTile()
    if (!tile || tile.type !== 'camp') {
      return { success: false, messages: ['只能在营地休息'] }
    }

    this.state.stats.energy = clamp(this.state.stats.energy + 30, 0, 100)
    this.state.stats.sanity = clamp(this.state.stats.sanity + 10, 0, this.state.stats.maxSanity)
    this.state.stats.hunger = clamp(this.state.stats.hunger - 15, 0, 100)

    return { success: true, messages: ['你在营地休息了一会儿，恢复了精力。'] }
  }

  canRepairItem(itemId: string): { canRepair: boolean; reason?: string } {
    return canRepair(this.state.inventory, itemId)
  }

  repairItem(itemId: string): { success: boolean; message: string } {
    const result = repairItemSystem(this.state.inventory, itemId)
    if (result.success) {
      this.updateInventory(result.inventory)
    }
    return { success: result.success, message: result.message }
  }

  checkEndings(): Ending[] {
    return checkAvailableEndings(this.state, this.state.inventory)
  }

  triggerEnding(endingId: string): void {
    this.state.status = 'ending'
    this.state.currentEndingId = endingId
  }

  isGameOver(): boolean {
    return isStatsCritical(this.state.stats) || this.state.status === 'ending'
  }

  setCraftingMode(active: boolean): void {
    this.state.status = active ? 'crafting' : 'playing'
  }

  getActionsLeft(): number {
    return this.state.time.actionsLeft
  }

  getGrowthProgress(): GrowthTreeProgress {
    return {
      ...this.growthProgress,
      unlockedNodes: [...this.growthProgress.unlockedNodes],
      activeNodeCooldowns: { ...this.growthProgress.activeNodeCooldowns },
      completedAchievements: [...this.growthProgress.completedAchievements],
    }
  }

  getGrowthTree() {
    return getGrowthTreeForIdentity(this.identity)
  }

  checkNodeUnlock(nodeId: string) {
    const tree = this.getGrowthTree()
    if (!tree) return { canUnlock: false, satisfiedConditions: 0, totalConditions: 0, missingConditions: ['未找到成长树'] }
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node) return { canUnlock: false, satisfiedConditions: 0, totalConditions: 0, missingConditions: ['未找到节点'] }
    return checkNodeCanUnlock(node, this.state, this.growthProgress)
  }

  unlockGrowthNode(nodeId: string): { success: boolean; message: string } {
    const tree = this.getGrowthTree()
    if (!tree) return { success: false, message: '未找到成长树' }
    const result = unlockNodeSystem(nodeId, this.state, this.growthProgress, tree)
    if (result.success) {
      this.growthProgress = result.progress
    }
    return { success: result.success, message: result.message }
  }

  getAvailableGrowthNodes(): GrowthNode[] {
    const tree = this.getGrowthTree()
    if (!tree) return []
    return getAvailableUnlockableNodes(this.state, this.growthProgress, tree)
  }

  useActiveGrowthNode(nodeId: string): { success: boolean; message: string } {
    const tree = this.getGrowthTree()
    if (!tree) return { success: false, message: '未找到成长树' }
    const result = useActiveNodeSystem(nodeId, this.growthProgress, tree)
    if (result.success) {
      this.growthProgress = result.progress
    }
    return { success: result.success, message: result.message }
  }

  canUseActiveGrowthNode(nodeId: string): boolean {
    return canUseActiveNode(nodeId, this.growthProgress)
  }

  serialize(): SerializedSave {
    return {
      state: this.getState(),
      identity: this.getIdentity(),
      inventory: this.getInventory(),
      growthProgress: this.getGrowthProgress(),
      savedAt: Date.now(),
    }
  }

  createChapterSnapshot(
    event: GameEvent,
    choiceMade?: { choice: EventChoice; success: boolean } | null,
    description?: string,
  ): void {
    const save = this.serialize()
    const snapshot = createSnapshotFromSave(save, {
      eventId: event.id,
      eventTitle: event.title,
      eventDescription: event.description,
      choiceMade: choiceMade
        ? {
            choiceId: choiceMade.choice.id,
            choiceText: choiceMade.choice.text,
            success: choiceMade.success,
          }
        : null,
      snapshotType: 'auto',
      description,
    })
    addSnapshot(snapshot)
    this.updatePermanentUnlocks()
  }

  updatePermanentUnlocks(): void {
    mergePermanentUnlocks({
      unlockedEndings: this.state.unlockedEndings,
      discoveredTiles: this.state.discoveredTiles,
      triggeredEvents: this.state.triggeredEvents,
    })
  }

  isKeyDecisionEvent(event: GameEvent): boolean {
    return event.onceOnly && event.choices.length >= 2
  }
}

export interface SerializedSave {
  state: GameState
  identity: Identity
  inventory: InventoryItem[]
  growthProgress: GrowthTreeProgress
  savedAt: number
}
