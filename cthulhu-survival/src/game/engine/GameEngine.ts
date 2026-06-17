import type { GameState, MapTile, Position, DangerInfo } from '../types/game'
import type { Identity, SkillEffect } from '../types/identity'
import type { InventoryItem, CraftRecipe } from '../types/items'
import type { GameEvent, Ending, EventChoice } from '../types/events'
import type { GrowthTreeProgress, GrowthNode } from '../types/growthTree'
import type { FactionId } from '../types/faction'
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
  reconTile,
  reconArea,
  disarmTrap,
  lootHidden,
  harvestSpecialResource,
  triggerTrapOnEnter,
  type ReconResult,
  type DisarmResult,
  type LootHiddenResult,
  type HarvestResult,
  type ReconTarget,
} from '../systems/scoutingSystem'
import { applyDurabilityWear, isItemBroken } from '../systems/durabilitySystem'
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
import { createSnapshotFromSave, addSnapshot, mergePermanentUnlocks, getTimeline, saveTimeline } from '../utils/snapshot'
import {
  createInitialQuestState,
  startQuest,
  advanceQuestStep,
  getActiveQuests,
  getCompletedQuests,
  getAvailableQuests,
  getCurrentStep,
  updateQuestProgressOnDayChange,
  recordQuestChoice,
  getQuestStatus,
} from '../systems/questChainSystem'
import { QUEST_CHAINS } from '../data/questChains'
import { getAlienationBuffs } from '../systems/alienationSystem'
import {
  calculateEffectPowerBonus,
  calculateHealingBoost,
  calculatePollutionReduction,
  calculateSanityBonus,
  calculateEnergyEfficiency,
} from '../systems/affixSystem'

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
      questState: createInitialQuestState(),
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
      questState: { ...this.state.questState },
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
    const alienationBuffs = getAlienationBuffs(this.state.stats.alienation)
    const actionCost = calculateMovementCost(dangerInfo, 1, alienationBuffs)

    this.state.position = { x, y }

    if (!this.state.discoveredTiles.includes(tile.id)) {
      this.state.discoveredTiles.push(tile.id)
      this.discoverNearby(x, y)
      messages.push(`你发现了新的区域：${tile.name}`)

      const exploreLoot = generateBonusLoot(tile.resources, dangerInfo, alienationBuffs)
      if (exploreLoot.length > 0) {
        for (const loot of exploreLoot) {
          this.state.inventory = addToInventory(this.state.inventory, loot.itemId, loot.count)
        }
        const lootSummary = exploreLoot.map(l => `${l.itemId}x${l.count}`).join(', ')
        messages.push(`探索收获：${lootSummary}（危险度加成 x${lootQualityModifier.multiplier.toFixed(1)}）`)
      }
    }

    const trapResult = triggerTrapOnEnter(tile, this.identity, this.state.inventory)
    if (trapResult.triggered) {
      messages.push(...trapResult.messages)
      this.state.stats.hp = clamp(this.state.stats.hp - trapResult.damage, 0, this.state.stats.maxHp)
      if (trapResult.sanityDamage > 0) {
        this.state.stats.sanity = clamp(this.state.stats.sanity - trapResult.sanityDamage, 0, this.state.stats.maxSanity)
      }
      if (trapResult.pollutionGain > 0) {
        this.state.stats = applyPollutionEffect(this.state.stats, trapResult.pollutionGain, this.identity, this.getGrowthEffects())
      }
    } else if (trapResult.messages.length > 0) {
      messages.push(...trapResult.messages)
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

      if (dayChanged) {
        const questUpdate = updateQuestProgressOnDayChange(this.state, this.getQuestState())
        this.state.questState = questUpdate.questState
        if (questUpdate.messages.length > 0) {
          messages.push(...questUpdate.messages)
        }
      }
    }

    const potionMsg = this.decrementScoutingPotion()
    if (potionMsg) messages.push(potionMsg)

    const rawEvents = findTriggeredEvents(this.state, tile.type, tile.id, this.getQuestState())
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

  private getQuestState() {
    return this.state.questState || {}
  }

  private handlePhaseChange() {
    const night = isNight(this.state.time)
    this.state.stats = applyPhaseEffects(this.state.stats, night, this.identity, this.getGrowthEffects())
    this.growthProgress = decrementCooldowns(this.growthProgress)
  }

  private decrementScoutingPotion(): string | null {
    if (this.state.flags['scouting_potion_active']) {
      const turns = this.state.flags['scouting_potion_turns'] as number
      if (turns > 1) {
        this.state.flags['scouting_potion_turns'] = turns - 1
        return null
      } else {
        this.state.flags['scouting_potion_active'] = false
        this.state.flags['scouting_potion_turns'] = 0
        return '鹰眼药剂的效果消退了，你的感官恢复了正常。'
      }
    }
    return null
  }

  triggerEvent(event: GameEvent): void {
    if (this.isKeyDecisionEvent(event) && !this.state.triggeredEvents.includes(event.id)) {
      this.createPreEventSnapshot(event)
    }
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
      const alienationBuffs = getAlienationBuffs(this.state.stats.alienation)
      const bonusItems = generateBonusLoot(tile.resources, dangerInfo, alienationBuffs)
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
        this.updateLastPreEventSnapshot(event, { choice, success: result.success })
      }
    }

    const questResult = this.checkAndAdvanceQuests(event.id, choiceId, result.success)
    if (questResult.messages.length > 0) {
      result.messages.push(...questResult.messages)
    }

    this.updatePermanentUnlocks()

    return result
  }

  private checkAndAdvanceQuests(eventId: string, choiceId: string, success: boolean): {
    messages: string[]
  } {
    const messages: string[] = []
    const questState = this.getQuestState()

    for (const quest of QUEST_CHAINS) {
      const status = getQuestStatus(questState, quest.id)
      if (status !== 'in_progress') continue

      const currentStep = getCurrentStep(questState, quest.id)
      if (!currentStep) continue

      if (currentStep.eventTriggers?.includes(eventId)) {
        const advanceResult = advanceQuestStep(
          this.state,
          questState,
          quest.id,
          currentStep.id,
          success,
        )

        this.state.questState = advanceResult.questState
        this.state.stats = advanceResult.stats
        this.updateInventory(advanceResult.inventory)
        this.state.reputation = advanceResult.reputation
        this.state.flags = advanceResult.flags

        if (advanceResult.unlockedEndings.length > 0) {
          this.state.unlockedEndings.push(...advanceResult.unlockedEndings)
        }
        if (advanceResult.revealedTiles.length > 0) {
          for (const tileId of advanceResult.revealedTiles) {
            if (!this.state.discoveredTiles.includes(tileId)) {
              this.state.discoveredTiles.push(tileId)
            }
          }
        }

        this.state.questState = recordQuestChoice(
          advanceResult.questState,
          quest.id,
          currentStep.id,
          choiceId,
          this.state.time.day,
          success,
        )

        messages.push(...advanceResult.messages)
      }
    }

    return { messages }
  }

  startQuestById(questId: string): { success: boolean; message?: string } {
    const result = startQuest(this.state, this.getQuestState(), questId)
    if (result.success) {
      this.state.questState = result.questState
    }
    return { success: result.success, message: result.message }
  }

  getActiveQuests() {
    return getActiveQuests(this.getQuestState())
  }

  getCompletedQuests() {
    return getCompletedQuests(this.getQuestState())
  }

  getAvailableQuests() {
    return getAvailableQuests(this.state, this.getQuestState())
  }

  getQuestProgress(questId: string) {
    return this.getQuestState()[questId] || null
  }

  closeEvent(): void {
    this.state.currentEventId = null
    this.state.status = 'playing'
  }

  checkChoiceAvail(event: GameEvent, choiceId: string) {
    const choice = event.choices.find(c => c.id === choiceId)
    if (!choice) return { available: false }
    return checkChoiceRequirements(
      choice,
      this.state.inventory,
      this.state.stats,
      this.identity,
      this.state.reputation,
      this.getQuestState(),
    )
  }

  getCraftableRecipes(): CraftRecipe[] {
    return getAvailableRecipes(this.state.inventory, this.state.flags, this.state.reputation)
  }

  canCraft(recipe: CraftRecipe) {
    return canCraft(recipe, this.state.inventory, this.state.stats)
  }

  craft(recipe: CraftRecipe) {
    const result = craftItem(recipe, this.state.inventory, this.state.stats, this.identity, this.getGrowthEffects())
    this.updateInventory(result.inventory)
    this.state.stats = result.stats
    return result
  }

  useItem(itemId: string): { success: boolean; message: string } {
    const idx = this.state.inventory.findIndex(i => i.itemId === itemId && !i.affixes)
    if (idx === -1) {
      const affixedIdx = this.state.inventory.findIndex(i => i.itemId === itemId && i.affixes)
      if (affixedIdx !== -1) {
        return this.useAffixedItem(affixedIdx)
      }
      return { success: false, message: '物品不存在' }
    }

    return this._useItemByIndex(idx)
  }

  useAffixedItem(index: number): { success: boolean; message: string } {
    if (index < 0 || index >= this.state.inventory.length) {
      return { success: false, message: '物品不存在' }
    }
    return this._useItemByIndex(index)
  }

  private _useItemByIndex(index: number): { success: boolean; message: string } {
    const invItem = this.state.inventory[index]
    if (!invItem) return { success: false, message: '物品不存在' }

    const itemId = invItem.itemId
    const itemData = ITEMS[itemId]
    if (!itemData) return { success: false, message: '物品数据错误' }

    const hasAffixes = !!invItem.affixes && invItem.affixes.length > 0
    const effectPowerBonus = hasAffixes ? calculateEffectPowerBonus(invItem) : 0
    const healingBonus = hasAffixes ? calculateHealingBoost(invItem) : 0
    const pollutionReduction = hasAffixes ? calculatePollutionReduction(invItem) : 0
    const sanityBonus = hasAffixes ? calculateSanityBonus(invItem) : 0
    const energyEfficiency = hasAffixes ? calculateEnergyEfficiency(invItem) : 0

    if (itemId === 'scouting_potion') {
      return this.useScoutingPotion()
    }

    const scoutingTools = ['telescope', 'divination_rod', 'compass', 'trap_detector', 'eye_of_insight']
    if (scoutingTools.includes(itemId)) {
      return this.useScoutingItem(itemId)
    }

    if (itemData.type !== 'consumable' && !itemData.hpOnUse && !itemData.sanityOnUse
        && !itemData.pollutionOnUse && !itemData.hungerOnUse && !itemData.energyOnUse) {
      return { success: false, message: '该物品无法使用' }
    }

    if (itemData.hpOnUse) {
      const hpGain = itemData.hpOnUse * (1 + effectPowerBonus + healingBonus)
      this.state.stats.hp = clamp(this.state.stats.hp + hpGain, 0, this.state.stats.maxHp)
    }
    if (itemData.sanityOnUse) {
      let sanityGain = itemData.sanityOnUse * (1 + effectPowerBonus)
      if (sanityGain > 0) {
        sanityGain *= (1 + sanityBonus)
      } else {
        sanityGain *= (1 - sanityBonus)
      }
      this.state.stats.sanity = clamp(this.state.stats.sanity + sanityGain, 0, this.state.stats.maxSanity)
    }
    if (itemData.pollutionOnUse) {
      let pollutionChange = itemData.pollutionOnUse
      if (pollutionChange > 0) {
        pollutionChange *= (1 - pollutionReduction)
      } else {
        pollutionChange *= (1 + pollutionReduction)
      }
      this.state.stats = applyPollutionEffect(this.state.stats, pollutionChange, this.identity, this.getGrowthEffects())
    }
    if (itemData.hungerOnUse) {
      const hungerGain = itemData.hungerOnUse * (1 + effectPowerBonus)
      this.state.stats.hunger = clamp(this.state.stats.hunger + hungerGain, 0, 100)
    }
    if (itemData.energyOnUse) {
      let energyChange = itemData.energyOnUse
      if (energyChange > 0) {
        energyChange *= (1 + effectPowerBonus + energyEfficiency)
      } else {
        energyChange *= (1 - energyEfficiency)
      }
      this.state.stats.energy = clamp(this.state.stats.energy + energyChange, 0, 100)
    }

    const newInventory = [...this.state.inventory]
    if (invItem.count > 1) {
      newInventory[index] = { ...newInventory[index], count: newInventory[index].count - 1 }
    } else {
      newInventory.splice(index, 1)
    }
    this.updateInventory(newInventory)

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
    return checkAvailableEndings(this.state, this.state.inventory, this.getQuestState())
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

  reconCurrentTile(target: ReconTarget = 'all'): ReconResult {
    const tile = this.getCurrentTile()
    if (!tile) {
      return {
        success: false,
        tileId: '',
        revealedHidden: null,
        revealedTrap: null,
        revealedSpecial: null,
        messages: ['你不在任何可侦查的区域'],
        energyCost: 0,
        sanityCost: 0,
      }
    }

    const hasPotion = this.state.flags['scouting_potion_active'] === true
    const result = reconTile(tile, this.identity, this.state.inventory, this.state.stats, target, hasPotion)

    if (result.energyCost > 0) {
      this.state.stats.energy = clamp(this.state.stats.energy - result.energyCost, 0, 100)
    }
    if (result.sanityCost > 0) {
      this.state.stats.sanity = clamp(this.state.stats.sanity - result.sanityCost, 0, this.state.stats.maxSanity)
    }

    if (result.success) {
      const actionResult = consumeAction(this.state.time, 1)
      this.state.time = actionResult.time
      if (actionResult.phaseChanged) {
        this.handlePhaseChange()
      }
      const potionMsg = this.decrementScoutingPotion()
      if (potionMsg) result.messages.push(potionMsg)
    }

    const ending = checkForImmediateEnding(this.state)
    if (ending) {
      this.state.status = 'ending'
      this.state.currentEndingId = ending.id
    }

    return result
  }

  reconSurroundingArea(): ReconResult[] {
    const hasPotion = this.state.flags['scouting_potion_active'] === true
    const results = reconArea(
      this.state.position.x,
      this.state.position.y,
      this.identity,
      this.state.inventory,
      this.state.stats,
      this.state.discoveredTiles,
      hasPotion,
    )

    let totalEnergyCost = 0
    for (const result of results) {
      totalEnergyCost += result.energyCost
    }

    if (totalEnergyCost > 0) {
      const avgEnergy = Math.round(totalEnergyCost / Math.max(1, results.length))
      this.state.stats.energy = clamp(this.state.stats.energy - avgEnergy, 0, 100)
    }

    if (results.length > 0) {
      const actionResult = consumeAction(this.state.time, 1)
      this.state.time = actionResult.time
      if (actionResult.phaseChanged) {
        this.handlePhaseChange()
      }
      const potionMsg = this.decrementScoutingPotion()
      if (potionMsg && results.length > 0) {
        results[results.length - 1].messages.push(potionMsg)
      }
    }

    const ending = checkForImmediateEnding(this.state)
    if (ending) {
      this.state.status = 'ending'
      this.state.currentEndingId = ending.id
    }

    return results
  }

  disarmCurrentTrap(): DisarmResult {
    const tile = this.getCurrentTile()
    if (!tile) {
      return {
        success: false,
        tileId: '',
        trapDisarmed: false,
        trapTriggered: false,
        damage: 0,
        messages: ['你不在任何可操作的区域'],
      }
    }

    const result = disarmTrap(tile, this.identity, this.state.inventory, this.state.stats)

    if (result.damage > 0) {
      this.state.stats.hp = clamp(this.state.stats.hp - result.damage, 0, this.state.stats.maxHp)
    }

    if (result.trapDisarmed) {
      const actionResult = consumeAction(this.state.time, 1)
      this.state.time = actionResult.time
      if (actionResult.phaseChanged) {
        this.handlePhaseChange()
      }
      const potionMsg = this.decrementScoutingPotion()
      if (potionMsg) result.messages.push(potionMsg)
    }

    const ending = checkForImmediateEnding(this.state)
    if (ending) {
      this.state.status = 'ending'
      this.state.currentEndingId = ending.id
    }

    return result
  }

  lootCurrentHidden(): LootHiddenResult {
    const tile = this.getCurrentTile()
    if (!tile) {
      return {
        success: false,
        tileId: '',
        looted: false,
        items: [],
        flagsSet: [],
        messages: ['你不在任何可操作的区域'],
        affixedItems: [],
      }
    }

    const result = lootHidden(tile, this.identity, this.state.inventory, this.state.stats, this.getGrowthEffects())

    if (result.looted) {
      for (const item of result.items) {
        this.state.inventory = addToInventory(this.state.inventory, item.itemId, item.count)
      }
      for (const affixedItem of result.affixedItems) {
        this.state.inventory.push(affixedItem)
      }
      for (const flag of result.flagsSet) {
        this.state.flags[flag] = true
      }

      const actionResult = consumeAction(this.state.time, 1)
      this.state.time = actionResult.time
      if (actionResult.phaseChanged) {
        this.handlePhaseChange()
      }
      const potionMsg = this.decrementScoutingPotion()
      if (potionMsg) result.messages.push(potionMsg)
    }

    const ending = checkForImmediateEnding(this.state)
    if (ending) {
      this.state.status = 'ending'
      this.state.currentEndingId = ending.id
    }

    return result
  }

  harvestCurrentSpecialResource(): HarvestResult {
    const tile = this.getCurrentTile()
    if (!tile) {
      return {
        success: false,
        tileId: '',
        harvested: false,
        rewards: [],
        messages: ['你不在任何可操作的区域'],
        affixedItems: [],
      }
    }

    const result = harvestSpecialResource(tile, this.identity, this.state.inventory, this.state.stats, this.getGrowthEffects())

    if (result.harvested) {
      for (const reward of result.rewards) {
        this.state.inventory = addToInventory(this.state.inventory, reward.itemId, reward.count)
      }
      for (const affixedItem of result.affixedItems) {
        this.state.inventory.push(affixedItem)
      }
      if (result.reputationGain) {
        const factionId = result.reputationGain.factionId as FactionId
        this.state.reputation[factionId] = Math.min(
          100,
          (this.state.reputation[factionId] || 0) + result.reputationGain.reputation,
        )
      }

      if (tile.specialResource?.harvestCost) {
        this.state.stats.energy = clamp(
          this.state.stats.energy - tile.specialResource.harvestCost.energy,
          0,
          100,
        )
        if (tile.specialResource.harvestCost.sanity) {
          this.state.stats.sanity = clamp(
            this.state.stats.sanity - tile.specialResource.harvestCost.sanity,
            0,
            this.state.stats.maxSanity,
          )
        }
      }

      const actionResult = consumeAction(this.state.time, 1)
      this.state.time = actionResult.time
      if (actionResult.phaseChanged) {
        this.handlePhaseChange()
      }
      const potionMsg = this.decrementScoutingPotion()
      if (potionMsg) result.messages.push(potionMsg)
    }

    const ending = checkForImmediateEnding(this.state)
    if (ending) {
      this.state.status = 'ending'
      this.state.currentEndingId = ending.id
    }

    return result
  }

  getAvailableScoutingActions(): {
    canRecon: boolean
    canDisarm: boolean
    canLootHidden: boolean
    canHarvestSpecial: boolean
    hasRevealedHidden: boolean
    hasRevealedTrap: boolean
    hasRevealedSpecial: boolean
  } {
    const tile = this.getCurrentTile()
    if (!tile) {
      return {
        canRecon: false,
        canDisarm: false,
        canLootHidden: false,
        canHarvestSpecial: false,
        hasRevealedHidden: false,
        hasRevealedTrap: false,
        hasRevealedSpecial: false,
      }
    }

    const hasEnergy = this.state.stats.energy >= 10
    const hasActions = this.state.time.actionsLeft > 0

    return {
      canRecon: hasEnergy && hasActions,
      canDisarm: !!(tile.trap?.revealed && !tile.trap.disarmed && !tile.trap.triggered) && hasActions,
      canLootHidden: !!(tile.hidden?.revealed && !tile.hidden.looted) && hasActions,
      canHarvestSpecial: !!(tile.specialResource?.revealed && !tile.specialResource.harvested) && hasEnergy && hasActions,
      hasRevealedHidden: !!(tile.hidden?.revealed && !tile.hidden.looted),
      hasRevealedTrap: !!(tile.trap?.revealed && !tile.trap.triggered && !tile.trap.disarmed),
      hasRevealedSpecial: !!(tile.specialResource?.revealed && !tile.specialResource.harvested),
    }
  }

  useScoutingItem(itemId: string): { success: boolean; message: string; duration?: number } {
    const idx = this.state.inventory.findIndex(i => i.itemId === itemId)
    if (idx === -1) {
      return { success: false, message: '物品不存在' }
    }

    const itemData = ITEMS[itemId]
    if (!itemData) {
      return { success: false, message: '物品数据错误' }
    }

    const scoutingItems = ['telescope', 'divination_rod', 'compass', 'trap_detector', 'eye_of_insight']
    if (!scoutingItems.includes(itemId)) {
      return { success: false, message: '该物品不是侦查道具' }
    }

    if (isItemBroken(this.state.inventory, itemId)) {
      return { success: false, message: `${itemData.name} 已经损坏，需要先维修` }
    }

    if (itemData.maxDurability !== undefined && itemData.durabilityCostPerUse !== undefined) {
      const newInventory = applyDurabilityWear(this.state.inventory, itemId, itemData.durabilityCostPerUse)
      this.updateInventory(newInventory)
    }

    return {
      success: true,
      message: `使用了 ${itemData.name}，侦查能力提升！`,
    }
  }

  useScoutingPotion(): { success: boolean; message: string } {
    const idx = this.state.inventory.findIndex(i => i.itemId === 'scouting_potion')
    if (idx === -1) {
      return { success: false, message: '你没有鹰眼药剂' }
    }

    const itemData = ITEMS['scouting_potion']
    this.state.inventory = removeFromInventory(this.state.inventory, 'scouting_potion', 1)

    this.state.stats.sanity = clamp(this.state.stats.sanity + (itemData.sanityOnUse || 0), 0, this.state.stats.maxSanity)
    this.state.stats.energy = clamp(this.state.stats.energy + (itemData.energyOnUse || 0), 0, 100)

    this.state.flags['scouting_potion_active'] = true
    this.state.flags['scouting_potion_turns'] = 3

    return {
      success: true,
      message: '你喝下了鹰眼药剂，感官变得异常敏锐！侦查能力在 3 回合内大幅提升。',
    }
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

  createPreEventSnapshot(event: GameEvent): void {
    const save = this.serialize()
    const snapshot = createSnapshotFromSave(save, {
      eventId: event.id,
      eventTitle: event.title,
      eventDescription: event.description,
      choiceMade: null,
      snapshotType: 'auto',
      isPreEventSnapshot: true,
      parentSnapshotId: null,
    })
    addSnapshot(snapshot)
  }

  updateLastPreEventSnapshot(
    event: GameEvent,
    choiceMade: { choice: EventChoice; success: boolean },
  ): void {
    const timeline = getTimeline()
    const lastPreEventIndex = [...timeline.snapshots].reverse().findIndex(
      s => s.isPreEventSnapshot && s.eventId === event.id && s.choiceMade === null,
    )
    if (lastPreEventIndex !== -1) {
      const actualIndex = timeline.snapshots.length - 1 - lastPreEventIndex
      const snap = timeline.snapshots[actualIndex]
      snap.choiceMade = {
        choiceId: choiceMade.choice.id,
        choiceText: choiceMade.choice.text,
        success: choiceMade.success,
      }
      snap.isPreEventSnapshot = false
      saveTimeline(timeline)
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
      isPreEventSnapshot: false,
      description,
    })
    addSnapshot(snapshot)
  }

  updatePermanentUnlocks(): void {
    const progress = this.getGrowthProgress()
    const unlockedRecipes: string[] = []
    const flags = this.state.flags
    Object.keys(flags).forEach(key => {
      if (key.startsWith('unlock_recipe_') && flags[key]) {
        unlockedRecipes.push(key.replace('unlock_recipe_', ''))
      }
      if (key.startsWith('unlock_') && flags[key] && key !== 'unlock_alchemy' && key !== 'unlock_ritual') {
        const recipeId = key.replace('unlock_', '')
        if (!unlockedRecipes.includes(recipeId)) {
          unlockedRecipes.push(recipeId)
        }
      }
    })
    if (flags['unlock_alchemy']) unlockedRecipes.push('alchemy')
    if (flags['unlock_ritual']) unlockedRecipes.push('ritual')

    mergePermanentUnlocks({
      unlockedEndings: this.state.unlockedEndings,
      discoveredTiles: this.state.discoveredTiles,
      triggeredEvents: this.state.triggeredEvents,
      unlockedRecipes,
      completedAchievements: progress.completedAchievements,
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
