import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, MapTile, Position, DangerInfo, LootQualityModifier } from '@game/types/game'
import type { Identity } from '@game/types/identity'
import type { InventoryItem, CraftRecipe } from '@game/types/items'
import type { GameEvent, Ending } from '@game/types/events'
import type { ReputationMap } from '@game/types/faction'
import type { GrowthTreeProgress, GrowthNode, GrowthTree } from '@game/types/growthTree'
import type { Merchant, MerchantState } from '@game/types/merchant'
import { GameEngine, type SerializedSave } from '@game/engine/GameEngine'
import type { EventResult } from '@game/systems/eventSystem'
import { findTriggeredEvents } from '@game/systems/eventSystem'
import { getFactionReputationSummary } from '@game/systems/reputationSystem'
import type { MerchantInteractionResult, AvailableItemResult } from '@game/systems/merchantSystem'
import {
  getTimeline,
  rewindToSnapshot,
  clearAllSnapshots,
  deleteSnapshot,
  getPermanentUnlocks,
} from '@game/utils/snapshot'
import type { ChapterSnapshot, PermanentUnlocks } from '@game/types/snapshot'

export const useGameStore = defineStore('game', () => {
  const engine = ref<GameEngine | null>(null)
  const state = ref<GameState | null>(null)
  const identity = ref<Identity | null>(null)
  const messages = ref<string[]>([])
  const currentEvent = ref<GameEvent | null>(null)
  const lastEventResult = ref<EventResult | null>(null)
  const growthProgress = ref<GrowthTreeProgress | null>(null)
  const newUnlockNotification = ref<string | null>(null)
  const merchantInteraction = ref<MerchantInteractionResult | null>(null)
  const merchantPanelVisible = ref(false)
  const lastMerchantPurchaseResult = ref<{
    success: boolean
    messages: string[]
    triggeredEvent?: string
  } | null>(null)

  const inventory = computed<InventoryItem[]>(() => state.value?.inventory ?? [])
  const growthTree = computed<GrowthTree | undefined>(() => {
    if (!engine.value || !identity.value) return undefined
    return engine.value.getGrowthTree()
  })
  const availableGrowthNodes = computed<GrowthNode[]>(() => {
    if (!engine.value) return []
    return engine.value.getAvailableGrowthNodes()
  })

  const currentTile = computed<MapTile | undefined>(() => {
    if (!engine.value || !state.value) return undefined
    return engine.value.getCurrentTile()
  })

  const allTiles = computed<MapTile[]>(() => {
    if (!engine.value) return []
    return engine.value.getAllTiles()
  })

  const actionsLeft = computed(() => state.value?.time.actionsLeft ?? 0)
  const isNight = computed(() => state.value?.time.phase === 'night')
  const day = computed(() => state.value?.time.day ?? 1)

  const reputation = computed<ReputationMap>(() => state.value?.reputation ?? { monastery: 0, deep_ones: 0, watchers: 0 })

  const currentDangerInfo = computed<DangerInfo | null>(() => {
    if (!engine.value) return null
    return engine.value.getCurrentDangerInfo()
  })

  const lootQualityModifier = computed<LootQualityModifier | null>(() => {
    if (!engine.value) return null
    return engine.value.getLootQualityModifier()
  })

  const scoutingPotionActive = computed<boolean>(() => {
    return state.value?.flags?.['scouting_potion_active'] === true
  })

  const scoutingPotionTurns = computed<number>(() => {
    return (state.value?.flags?.['scouting_potion_turns'] as number) || 0
  })

  const availableScoutingActions = computed(() => {
    if (!engine.value) {
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
    return engine.value.getAvailableScoutingActions()
  })

  const reputationSummary = computed(() => {
    if (!state.value) return []
    return getFactionReputationSummary(state.value.reputation)
  })

  const merchantState = computed<MerchantState | null>(() => {
    return state.value?.merchantState || null
  })

  const currentMerchant = computed<Merchant | null>(() => {
    return merchantInteraction.value?.merchant || null
  })

  const merchantAvailableItems = computed<AvailableItemResult[]>(() => {
    return merchantInteraction.value?.availableItems || []
  })

  const merchantDialogue = computed<string>(() => {
    return merchantInteraction.value?.dialogue || ''
  })

  const merchantSuccessfulDeals = computed<number>(() => {
    if (!engine.value || !merchantInteraction.value?.merchant) return 0
    return engine.value.getSuccessfulDeals(merchantInteraction.value.merchant.id)
  })

  function startGame(selectedIdentity: Identity) {
    engine.value = new GameEngine(selectedIdentity)
    identity.value = selectedIdentity
    syncFromEngine()
    messages.value = [`你以「${selectedIdentity.name}」的身份降临到这片诡秘之地...`]
  }

  function syncFromEngine() {
    if (!engine.value) return
    state.value = engine.value.getState()
    identity.value = engine.value.getIdentity()
    growthProgress.value = engine.value.getGrowthProgress()
  }

  function moveTo(pos: Position) {
    if (!engine.value) return
    const result = engine.value.moveTo(pos.x, pos.y)
    syncFromEngine()
    messages.value.push(...result.messages)
    if (result.events.length > 0) {
      currentEvent.value = result.events[0]
    }
    checkMerchantFlags()
    return result
  }

  function checkMerchantFlags() {
    if (!engine.value || !state.value) return
    const openPanelFlag = state.value.flags['open_merchant_panel']
    if (openPanelFlag && typeof openPanelFlag === 'string') {
      openMerchantPanel(openPanelFlag)
      delete state.value.flags['open_merchant_panel']
    }
    const triggerEventFlag = state.value.flags['merchant_trigger_event']
    if (triggerEventFlag && typeof triggerEventFlag === 'string') {
      setTimeout(() => {
        if (!engine.value || !state.value) return
        const tile = engine.value.getCurrentTile()
        const questState = state.value.questState || {}
        const rawEvents = findTriggeredEvents(state.value, tile?.type || 'forest', tile?.id || '', questState)
        const matchedEvent = rawEvents.find((e: GameEvent) => e.id === triggerEventFlag)
        if (matchedEvent) {
          currentEvent.value = matchedEvent
        }
        delete state.value!.flags['merchant_trigger_event']
      }, 500)
    }
  }

  function openMerchantPanel(merchantId?: string): MerchantInteractionResult | null {
    if (!engine.value) return null
    let interaction: MerchantInteractionResult | null
    if (merchantId) {
      interaction = engine.value.openMerchantByFlag(merchantId)
    } else {
      interaction = engine.value.getMerchantInteraction()
    }
    if (interaction) {
      merchantInteraction.value = interaction
      merchantPanelVisible.value = true
      syncFromEngine()
    }
    return interaction
  }

  function refreshMerchantPanel() {
    if (!engine.value) return
    const interaction = engine.value.getMerchantInteraction()
    if (interaction) {
      merchantInteraction.value = interaction
      syncFromEngine()
    }
  }

  function purchaseMerchantItem(itemIndex: number): {
    success: boolean
    messages: string[]
    triggeredEvent?: string
  } {
    if (!engine.value) return { success: false, messages: ['错误'] }
    const result = engine.value.purchaseMerchantItem(itemIndex)
    lastMerchantPurchaseResult.value = result
    messages.value.push(...result.messages)
    refreshMerchantPanel()
    syncFromEngine()
    checkMerchantFlags()
    return result
  }

  function closeMerchantPanel() {
    if (!engine.value) return
    const closeMsgs = engine.value.closeMerchant()
    messages.value.push(...closeMsgs)
    merchantInteraction.value = null
    merchantPanelVisible.value = false
    lastMerchantPurchaseResult.value = null
    syncFromEngine()
  }

  function executeChoice(choiceId: string) {
    if (!engine.value || !currentEvent.value) return
    const result = engine.value.executeChoice(currentEvent.value, choiceId)
    syncFromEngine()
    lastEventResult.value = result
    if (result) {
      messages.value.push(...result.messages)
    }
    currentEvent.value = null
    checkMerchantFlags()
    return result
  }

  function closeEvent() {
    if (!engine.value) return
    engine.value.closeEvent()
    currentEvent.value = null
    lastEventResult.value = null
    syncFromEngine()
    checkMerchantFlags()
  }

  function getCraftableRecipes(): CraftRecipe[] {
    if (!engine.value) return []
    return engine.value.getCraftableRecipes()
  }

  function canCraftRecipe(recipe: CraftRecipe) {
    if (!engine.value) return { canCraft: false }
    return engine.value.canCraft(recipe)
  }

  function craft(recipe: CraftRecipe) {
    if (!engine.value) return { success: false, message: '错误' }
    const result = engine.value.craft(recipe)
    syncFromEngine()
    messages.value.push(result.message)
    return result
  }

  function useItem(itemId: string) {
    if (!engine.value) return { success: false, message: '错误' }
    const result = engine.value.useItem(itemId)
    syncFromEngine()
    messages.value.push(result.message)
    return result
  }

  function useAffixedItem(index: number) {
    if (!engine.value) return { success: false, message: '错误' }
    const result = engine.value.useAffixedItem(index)
    syncFromEngine()
    messages.value.push(result.message)
    return result
  }

  function rest() {
    if (!engine.value) return { success: false, messages: ['错误'] }
    const result = engine.value.restAtCamp()
    syncFromEngine()
    messages.value.push(...result.messages)
    return result
  }

  function canRepairItem(itemId: string) {
    if (!engine.value) return { canRepair: false }
    return engine.value.canRepairItem(itemId)
  }

  function repairItem(itemId: string) {
    if (!engine.value) return { success: false, message: '错误' }
    const result = engine.value.repairItem(itemId)
    syncFromEngine()
    messages.value.push(result.message)
    return result
  }

  function checkChoiceAvail(choiceId: string) {
    if (!engine.value || !currentEvent.value) return { available: false }
    return engine.value.checkChoiceAvail(currentEvent.value, choiceId)
  }

  function checkEndings(): Ending[] {
    if (!engine.value) return []
    return engine.value.checkEndings()
  }

  function triggerEnding(id: string) {
    if (!engine.value) return
    engine.value.triggerEnding(id)
    syncFromEngine()
  }

  function isGameOver(): boolean {
    if (!engine.value) return false
    return engine.value.isGameOver()
  }

  function serialize(): SerializedSave | null {
    if (!engine.value || !state.value || !identity.value || !growthProgress.value) return null
    return {
      state: state.value,
      identity: identity.value,
      inventory: state.value.inventory,
      growthProgress: growthProgress.value,
      savedAt: Date.now(),
    }
  }

  function loadFromSave(save: SerializedSave) {
    engine.value = GameEngine.fromSerialized(save)
    syncFromEngine()
    messages.value = ['读取存档成功。']
  }

  function addMessage(msg: string) {
    messages.value.push(msg)
  }

  function clearMessages() {
    messages.value = []
  }

  function reset() {
    engine.value = null
    state.value = null
    identity.value = null
    messages.value = []
    currentEvent.value = null
    lastEventResult.value = null
    growthProgress.value = null
    newUnlockNotification.value = null
    merchantInteraction.value = null
    merchantPanelVisible.value = false
    lastMerchantPurchaseResult.value = null
  }

  function unlockGrowthNode(nodeId: string) {
    if (!engine.value) return { success: false, message: '错误' }
    const result = engine.value.unlockGrowthNode(nodeId)
    syncFromEngine()
    if (result.success) {
      messages.value.push(result.message)
      newUnlockNotification.value = nodeId
      setTimeout(() => {
        newUnlockNotification.value = null
      }, 3000)
    }
    return result
  }

  function checkGrowthNodeUnlock(nodeId: string) {
    if (!engine.value) return { canUnlock: false, satisfiedConditions: 0, totalConditions: 0, missingConditions: [] }
    return engine.value.checkNodeUnlock(nodeId)
  }

  function useActiveGrowthNode(nodeId: string) {
    if (!engine.value) return { success: false, message: '错误' }
    const result = engine.value.useActiveGrowthNode(nodeId)
    syncFromEngine()
    if (result.success) {
      messages.value.push(result.message)
    }
    return result
  }

  function reconCurrentTile() {
    if (!engine.value) return null
    const result = engine.value.reconCurrentTile('all')
    syncFromEngine()
    messages.value.push(...result.messages)
    return result
  }

  function reconSurroundingArea() {
    if (!engine.value) return []
    const results = engine.value.reconSurroundingArea()
    syncFromEngine()
    for (const r of results) {
      messages.value.push(...r.messages)
    }
    return results
  }

  function disarmCurrentTrap() {
    if (!engine.value) return null
    const result = engine.value.disarmCurrentTrap()
    syncFromEngine()
    messages.value.push(...result.messages)
    return result
  }

  function lootCurrentHidden() {
    if (!engine.value) return null
    const result = engine.value.lootCurrentHidden()
    syncFromEngine()
    messages.value.push(...result.messages)
    return result
  }

  function harvestCurrentSpecialResource() {
    if (!engine.value) return null
    const result = engine.value.harvestCurrentSpecialResource()
    syncFromEngine()
    messages.value.push(...result.messages)
    return result
  }

  function canUseActiveGrowthNode(nodeId: string) {
    if (!engine.value) return false
    return engine.value.canUseActiveGrowthNode(nodeId)
  }

  function getSnapshots(): ChapterSnapshot[] {
    const timeline = getTimeline()
    return timeline.snapshots.sort((a, b) => b.timestamp - a.timestamp)
  }

  function getCurrentSnapshotId(): string | null {
    const timeline = getTimeline()
    return timeline.currentSnapshotId
  }

  function rewindToSnapshotById(snapshotId: string): boolean {
    const result = rewindToSnapshot(snapshotId)
    if (!result) return false
    loadFromSave(result.save)
    messages.value = ['时间回溯...你回到了那个关键的抉择时刻。']
    return true
  }

  function removeSnapshot(snapshotId: string): boolean {
    return deleteSnapshot(snapshotId)
  }

  function clearSnapshots(): void {
    clearAllSnapshots()
  }

  function getPermanentRecords(): PermanentUnlocks {
    return getPermanentUnlocks()
  }

  function createManualSnapshot(description?: string): boolean {
    if (!engine.value || !state.value || !identity.value || !growthProgress.value) return false
    const event = {
      id: 'manual_save',
      title: '手动存档',
      description: description || '玩家手动创建的存档点',
      onceOnly: false,
      priority: 0,
      type: 'choice' as const,
      trigger: { type: 'flag_set' as const, flagKey: 'manual' },
      conditions: [],
      choices: [],
    }
    engine.value.createChapterSnapshot(event, null, description)
    return true
  }

  return {
    engine,
    state,
    identity,
    inventory,
    messages,
    currentEvent,
    lastEventResult,
    growthProgress,
    growthTree,
    availableGrowthNodes,
    newUnlockNotification,
    currentTile,
    allTiles,
    actionsLeft,
    isNight,
    day,
    reputation,
    reputationSummary,
    currentDangerInfo,
    lootQualityModifier,
    scoutingPotionActive,
    scoutingPotionTurns,
    availableScoutingActions,
    merchantState,
    currentMerchant,
    merchantInteraction,
    merchantAvailableItems,
    merchantDialogue,
    merchantSuccessfulDeals,
    merchantPanelVisible,
    lastMerchantPurchaseResult,
    startGame,
    moveTo,
    executeChoice,
    closeEvent,
    getCraftableRecipes,
    canCraftRecipe,
    craft,
    useItem,
    useAffixedItem,
    rest,
    canRepairItem,
    repairItem,
    checkChoiceAvail,
    checkEndings,
    triggerEnding,
    isGameOver,
    serialize,
    loadFromSave,
    addMessage,
    clearMessages,
    reset,
    unlockGrowthNode,
    checkGrowthNodeUnlock,
    useActiveGrowthNode,
    canUseActiveGrowthNode,
    reconCurrentTile,
    reconSurroundingArea,
    disarmCurrentTrap,
    lootCurrentHidden,
    harvestCurrentSpecialResource,
    getSnapshots,
    getCurrentSnapshotId,
    rewindToSnapshotById,
    removeSnapshot,
    clearSnapshots,
    getPermanentRecords,
    createManualSnapshot,
    openMerchantPanel,
    refreshMerchantPanel,
    purchaseMerchantItem,
    closeMerchantPanel,
    checkMerchantFlags,
  }
})
