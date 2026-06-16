<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { getPhaseDescription, getDayNightIcon } from '@game/systems/timeSystem'

const gameStore = useGameStore()
const { state, day, isNight, actionsLeft } = storeToRefs(gameStore)

const phaseText = computed(() => state.value ? getPhaseDescription(state.value.time.phase) : '')
const phaseIcon = computed(() => state.value ? getDayNightIcon(state.value.time.phase) : '☀️')
</script>

<template>
  <div class="day-night-indicator" :class="{ night: isNight }">
    <span class="icon">{{ phaseIcon }}</span>
    <div class="info">
      <span class="day">第 {{ day }} 天</span>
      <span class="phase">{{ phaseText }}</span>
    </div>
    <div class="actions">
      <span class="label">行动</span>
      <span class="value">{{ actionsLeft }}</span>
    </div>
  </div>
</template>

<style scoped>
.day-night-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #1a2a1f, #12121c);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.4s ease;
}

.day-night-indicator.night {
  background: linear-gradient(135deg, #1a1a2e, #0f0f1a);
  border-color: #3a3a5e;
}

.icon {
  font-size: 28px;
}

.info {
  display: flex;
  flex-direction: column;
}

.day {
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.phase {
  font-size: 11px;
  color: var(--color-text-muted);
}

.actions {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actions .label {
  font-size: 10px;
  color: var(--color-text-muted);
}

.actions .value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-cthulhu-green-glow);
  font-variant-numeric: tabular-nums;
}
</style>
