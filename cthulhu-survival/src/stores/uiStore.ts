import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PanelName = 'inventory' | 'craft' | 'save' | 'endings' | 'growth' | null

export const useUiStore = defineStore('ui', () => {
  const activePanel = ref<PanelName>(null)
  const showSaveLoad = ref(false)
  const showTimeline = ref(false)
  const isLoading = ref(false)

  function togglePanel(panel: PanelName) {
    activePanel.value = activePanel.value === panel ? null : panel
  }

  function closeAllPanels() {
    activePanel.value = null
    showSaveLoad.value = false
    showTimeline.value = false
  }

  function toggleSaveLoad() {
    showSaveLoad.value = !showSaveLoad.value
    if (showSaveLoad.value) {
      activePanel.value = null
      showTimeline.value = false
    }
  }

  function toggleTimeline() {
    showTimeline.value = !showTimeline.value
    if (showTimeline.value) {
      activePanel.value = null
      showSaveLoad.value = false
    }
  }

  return {
    activePanel,
    showSaveLoad,
    showTimeline,
    isLoading,
    togglePanel,
    closeAllPanels,
    toggleSaveLoad,
    toggleTimeline,
  }
})
