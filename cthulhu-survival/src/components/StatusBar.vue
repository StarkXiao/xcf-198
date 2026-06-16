<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { getPollutionLevel } from '@game/systems/pollutionSystem'
import { getPhaseDescription, getDayNightIcon } from '@game/systems/timeSystem'

const gameStore = useGameStore()
const { state, day } = storeToRefs(gameStore)

const pollutionInfo = computed(() => {
  if (!state.value) return { level: '-', description: '', color: '#fff' }
  return getPollutionLevel(state.value.stats.pollution)
})

function hpColor(v: number, max: number) {
  const p = v / max
  if (p > 0.6) return '#5ec98a'
  if (p > 0.3) return '#d9a54c'
  return '#c44a4a'
}

function sanityColor(v: number, max: number) {
  const p = v / max
  if (p > 0.6) return '#5a7abf'
  if (p > 0.3) return '#8a5abf'
  return '#c44a4a'
}
</script>

<template>
  <div v-if="state" class="status-bar panel">
    <div class="time-block">
      <div class="day-night">
        <span class="dn-icon">{{ getDayNightIcon(state.time.phase) }}</span>
        <span class="dn-text">
          第 {{ day }} 天 · {{ getPhaseDescription(state.time.phase) }}
        </span>
      </div>
      <div class="actions">
        <span class="label">行动点</span>
        <span class="actions-value">
          {{ state.time.actionsLeft }} / {{ state.time.maxActionsPerPhase }}
        </span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-row">
        <span class="label">❤️ 生命</span>
        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{
              width: `${(state.stats.hp / state.stats.maxHp) * 100}%`,
              background: hpColor(state.stats.hp, state.stats.maxHp),
            }"
          ></div>
        </div>
        <span class="value">{{ state.stats.hp }}/{{ state.stats.maxHp }}</span>
      </div>

      <div class="stat-row">
        <span class="label">🧠 理智</span>
        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{
              width: `${(state.stats.sanity / state.stats.maxSanity) * 100}%`,
              background: sanityColor(state.stats.sanity, state.stats.maxSanity),
            }"
          ></div>
        </div>
        <span class="value">{{ state.stats.sanity }}/{{ state.stats.maxSanity }}</span>
      </div>

      <div class="stat-row">
        <span class="label">☠️ 污染</span>
        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{
              width: `${state.stats.pollution}%`,
              background: pollutionInfo.color,
            }"
          ></div>
        </div>
        <span class="value" :style="{ color: pollutionInfo.color }">{{ pollutionInfo.level }}</span>
      </div>

      <div class="stat-row">
        <span class="label">🍖 饱食</span>
        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{
              width: `${state.stats.hunger}%`,
              background: state.stats.hunger > 40 ? '#d9a54c' : '#c44a4a',
            }"
          ></div>
        </div>
        <span class="value">{{ state.stats.hunger }}%</span>
      </div>

      <div class="stat-row">
        <span class="label">⚡ 精力</span>
        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{
              width: `${state.stats.energy}%`,
              background: state.stats.energy > 40 ? '#5ec98a' : '#c44a4a',
            }"
          ></div>
        </div>
        <span class="value">{{ state.stats.energy }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.time-block {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.day-night {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dn-icon {
  font-size: 22px;
}

.dn-text {
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.actions .label {
  color: var(--color-text-muted);
}

.actions-value {
  color: var(--color-cthulhu-green-glow);
  font-weight: 600;
  font-size: 14px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: grid;
  grid-template-columns: 70px 1fr 60px;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.value {
  font-size: 12px;
  text-align: right;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
