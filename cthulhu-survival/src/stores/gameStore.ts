import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, MapTile, Position } from '@game/types/game'
import type { Identity } from '@game/types/identity'
import type { InventoryItem, CraftRecipe } from '@game/types/items'
import type { GameEvent, Ending } from '@game/types/events'
import { GameEngine, type SerializedSave } from '@game/engine/GameEngine'
import type { EventResult } from '@game/systems/eventSystem'

export const useGameStore = defineStore('game', () => {
  const engine = ref<GameEngine | null>(null)
  const state = ref<GameState | null>(null)
  const identity = ref<Identity | null>(null)
  const messages = ref<string[]>([])
  const currentEvent = ref<GameEvent | null>(null)
  const lastEventResult = ref<EventResult | null>(null)

  const inventory = computed<InventoryItem[]>(() => state.value?.inventory ?? [])

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
  }

  function moveTo(pos: Position) {
    if (!engine.value) return
    const result = engine.value.moveTo(pos.x, pos.y)
    syncFromEngine()
    messages.value.push(...result.messages)
    if (result.events.length > 0) {
      currentEvent.value = result.events[0]
    }
    return result
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
    return result
  }

  function closeEvent() {
    if (!engine.value) return
    engine.value.closeEvent()
    currentEvent.value = null
    lastEventResult.value = null
    syncFromEngine()
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

  function rest() {
    if (!engine.value) return { success: false, messages: ['错误'] }
    const result = engine.value.restAtCamp()
    syncFromEngine()
    messages.value.push(...result.messages)
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
    if (!engine.value || !state.value || !identity.value) return null
    return {
      state: state.value,
      identity: identity.value,
      inventory: state.value.inventory,
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
  }

  return {
    engine,
    state,
    identity,
    inventory,
    messages,
    currentEvent,
    lastEventResult,
    currentTile,
    allTiles,
    actionsLeft,
    isNight,
    day,
    startGame,
    moveTo,
    executeChoice,
    closeEvent,
    getCraftableRecipes,
    canCraftRecipe,
    craft,
    useItem,
    rest,
    checkChoiceAvail,
    checkEndings,
    triggerEnding,
    isGameOver,
    serialize,
    loadFromSave,
    addMessage,
    clearMessages,
    reset,
  }
})
