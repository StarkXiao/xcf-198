import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PanelName = 'inventory' | 'craft' | 'save' | 'endings' | null

export const useUiStore = defineStore('ui', () => {
  const activePanel = ref<PanelName>(null)
  const showSaveLoad = ref(false)
  const isLoading = ref(false)

  function togglePanel(panel: PanelName) {
    activePanel.value = activePanel.value === panel ? null : panel
  }

  function closeAllPanels() {
    activePanel.value = null
    showSaveLoad.value = false
  }

  function toggleSaveLoad() {
    showSaveLoad.value = !showSaveLoad.value
    if (showSaveLoad.value) activePanel.value = null
  }

  return {
    activePanel,
    showSaveLoad,
    isLoading,
    togglePanel,
    closeAllPanels,
    toggleSaveLoad,
  }
})
