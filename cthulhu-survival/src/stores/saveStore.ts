import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAllSaves, writeSave, deleteSave, getSave, type SaveSlot } from '@game/utils/save'
import { useGameStore } from './gameStore'

export const useSaveStore = defineStore('save', () => {
  const slots = ref<SaveSlot[]>([])

  function refresh() {
    slots.value = getAllSaves()
  }

  function saveGame(slotId: number, name?: string) {
    const game = useGameStore()
    const data = game.serialize()
    if (!data) return null
    const saveName = name || `第${game.day}天 - ${game.identity?.name || ''}`
    const slot = writeSave(slotId, saveName, data)
    refresh()
    return slot
  }

  function loadGame(slotId: number): boolean {
    const slot = getSave(slotId)
    if (!slot) return false
    const game = useGameStore()
    game.loadFromSave(slot.data)
    return true
  }

  function removeSave(slotId: number): boolean {
    const result = deleteSave(slotId)
    refresh()
    return result
  }

  const hasAnySave = computed(() => slots.value.length > 0)

  refresh()

  return {
    slots,
    refresh,
    saveGame,
    loadGame,
    removeSave,
    hasAnySave,
  }
})
