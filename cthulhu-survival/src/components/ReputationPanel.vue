<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { FACTIONS } from '@game/data/factions'
import { getReputationLevel } from '@game/data/factions'
import type { FactionId } from '@game/types/faction'

const gameStore = useGameStore()
const { state } = storeToRefs(gameStore)

const factionInfos = computed(() => {
  if (!state.value) return []
  return FACTIONS.map(f => {
    const value = state.value!.reputation[f.id] || 0
    const level = getReputationLevel(f.id, value)
    return {
      id: f.id,
      name: f.name,
      icon: f.icon,
      value,
      levelName: level.name,
      title: level.title,
      color: level.color,
      percentage: Math.max(0, Math.min(100, (value + 100) / 2)),
    }
  })
})
</script>

<template>
  <div v-if="state" class="reputation-panel">
    <h4 class="rep-title">⚖️ 阵营声望</h4>
    <div class="faction-list">
      <div v-for="f in factionInfos" :key="f.id" class="faction-row">
        <div class="faction-header">
          <span class="faction-icon">{{ f.icon }}</span>
          <span class="faction-name">{{ f.name }}</span>
          <span class="faction-level" :style="{ color: f.color }">{{ f.levelName }}</span>
        </div>
        <div class="rep-bar-track">
          <div
            class="rep-bar-fill"
            :style="{ width: f.percentage + '%', background: f.color }"
          ></div>
        </div>
        <div class="faction-detail">
          <span class="faction-title" :style="{ color: f.color }">{{ f.title }}</span>
          <span class="rep-value">{{ f.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reputation-panel {
  padding: 14px;
}

.rep-title {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--color-text-primary);
  letter-spacing: 0.05em;
}

.faction-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faction-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.faction-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.faction-icon {
  font-size: 16px;
  line-height: 1;
}

.faction-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.faction-level {
  font-size: 11px;
  font-weight: 500;
}

.rep-bar-track {
  height: 4px;
  background: var(--color-bg-dark);
  border-radius: 2px;
  overflow: hidden;
}

.rep-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
}

.faction-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faction-title {
  font-size: 10px;
  font-style: italic;
}

.rep-value {
  font-size: 10px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
