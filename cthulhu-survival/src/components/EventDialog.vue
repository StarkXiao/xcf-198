<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { getEffectiveChoice } from '@game/systems/eventSystem'
import { getAlienationStatus } from '@game/systems/alienationSystem'

const gameStore = useGameStore()
const { currentEvent, lastEventResult, state } = storeToRefs(gameStore)

const alienationInfo = computed(() => {
  if (!state.value) return { isActive: false, levelName: '', color: '#fff', permanentCorruption: 0, durationText: '', description: '' }
  return getAlienationStatus(state.value.stats.alienation)
})

const choices = computed(() => {
  if (!currentEvent.value || !state.value) return []
  return currentEvent.value.choices.map(c => {
    const effectiveChoice = getEffectiveChoice(c, state.value!.stats)
    const { available, reason } = gameStore.checkChoiceAvail(c.id)
    return { ...effectiveChoice, originalId: c.id, available, reason, hasAlienationVariant: !!c.alienationVariant }
  })
})

function selectChoice(id: string) {
  gameStore.executeChoice(id)
}

function close() {
  gameStore.closeEvent()
}

const typeIcon: Record<string, string> = {
  exploration: '🔍',
  encounter: '⚔️',
  vision: '👁️',
  ritual: '🔮',
  choice: '❓',
  discovery: '✨',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="currentEvent" class="event-overlay">
        <div class="event-dialog panel">
          <div class="event-header">
            <span class="event-type-icon">{{ typeIcon[currentEvent.type] || '📖' }}</span>
            <h2 class="event-title">{{ currentEvent.title }}</h2>
          </div>

          <p class="event-desc">{{ currentEvent.description }}</p>

          <div v-if="lastEventResult && lastEventResult.messages.length > 0" class="event-feedback">
            <p v-for="(m, i) in lastEventResult.messages" :key="i" class="feedback-text">
              {{ m }}
            </p>
          </div>

          <div class="choices">
            <button
              v-for="c in choices"
              :key="c.id"
              class="choice-btn"
              :class="{ 
                disabled: !c.available, 
                hasSuccess: c.successRate !== undefined,
                'alienation-choice': c.hasAlienationVariant && (alienationInfo.isActive || alienationInfo.permanentCorruption > 0)
              }"
              :disabled="!c.available"
              @click="c.available && selectChoice(c.id)"
            >
              <div class="choice-main">
                <span class="choice-text">
                  <span v-if="c.hasAlienationVariant && (alienationInfo.isActive || alienationInfo.permanentCorruption > 0)" class="alienation-mark">👁️</span>
                  {{ c.text }}
                </span>
                <span v-if="c.successRate !== undefined" class="success-rate">
                  成功率 {{ Math.round(c.successRate * 100) }}%
                </span>
              </div>
              <p v-if="c.description" class="choice-desc">{{ c.description }}</p>
              <p v-if="!c.available && c.reason" class="choice-reason">⚠️ {{ c.reason }}</p>
            </button>
          </div>

          <div v-if="lastEventResult" class="close-row">
            <button class="btn-primary" @click="close">继续</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.event-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.event-dialog {
  max-width: 540px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 28px;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.event-type-icon {
  font-size: 32px;
}

.event-title {
  font-size: 22px;
  color: var(--color-cthulhu-green-glow);
  letter-spacing: 0.05em;
}

.event-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.8;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-cthulhu-green);
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.event-feedback {
  background: rgba(94, 201, 138, 0.08);
  border: 1px solid rgba(94, 201, 138, 0.2);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 20px;
}

.feedback-text {
  font-size: 13px;
  color: var(--color-cthulhu-green-glow);
  line-height: 1.7;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice-btn {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  text-align: left;
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.choice-btn:not(:disabled):hover {
  border-color: var(--color-cthulhu-green);
  background: var(--color-bg-hover);
  transform: translateX(2px);
}

.choice-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.choice-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.choice-text {
  font-size: 14px;
  font-weight: 600;
}

.success-rate {
  font-size: 12px;
  color: var(--color-warning);
  font-weight: 500;
}

.choice-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.choice-reason {
  font-size: 12px;
  color: var(--color-danger);
  margin-top: 4px;
}

.alienation-choice {
  border-color: var(--color-alienation, #8a5abf);
  background: rgba(138, 90, 191, 0.08);
}

.alienation-choice:not(:disabled):hover {
  border-color: var(--color-alienation-glow, #a84ac4);
  background: rgba(168, 74, 196, 0.15);
  box-shadow: 0 0 12px rgba(168, 74, 196, 0.3);
}

.alienation-mark {
  margin-right: 6px;
  animation: alienation-glow 2s ease-in-out infinite;
}

@keyframes alienation-glow {
  0%, 100% {
    opacity: 1;
    filter: brightness(1);
  }
  50% {
    opacity: 0.7;
    filter: brightness(1.3);
  }
}

.close-row {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
