<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@stores/gameStore'
import type { DefenseStrategy, TrapSlot, NightDefenseResult } from '@game/types/nightDefense'
import { DEFENSE_STRATEGY_INFO, TRAP_SLOT_LABELS } from '@game/types/nightDefense'

const gameStore = useGameStore()

const nightDefenseState = computed(() => gameStore.nightDefenseState)
const isCompleted = computed(() => gameStore.nightDefenseCompleted)
const currentStrategy = computed(() => nightDefenseState.value?.config.strategy || 'fortify')
const placedTraps = computed(() => nightDefenseState.value?.config.traps || [])
const defenseActionsLeft = computed(() => {
  if (!nightDefenseState.value) return 0
  return nightDefenseState.value.config.maxDefenseActions - nightDefenseState.value.config.defenseActionsSpent
})
const supplies = computed(() => nightDefenseState.value?.config.supplies || { foodUsed: 0, torchUsed: 0, herbUsed: 0 })
const defenseResult = computed(() => nightDefenseState.value?.result || null)

const placableTraps = computed(() => gameStore.getPlacableTrapItems())
const availableFood = computed(() => gameStore.getAvailableSupplyCount('foodUsed'))
const availableTorch = computed(() => gameStore.getAvailableSupplyCount('torchUsed'))
const availableHerb = computed(() => gameStore.getAvailableSupplyCount('herbUsed'))

const selectedTrapItem = ref<string>('')
const resultStep = ref<'summary' | 'waves' | 'done'>('summary')

const ratingInfo: Record<string, { label: string; color: string; icon: string }> = {
  perfect: { label: '完美防守', color: '#f1c40f', icon: '✨' },
  good: { label: '良好', color: '#2ecc71', icon: '🛡️' },
  mediocre: { label: '一般', color: '#d9a54c', icon: '⚠️' },
  poor: { label: '较差', color: '#e68a4c', icon: '💥' },
  disaster: { label: '灾难', color: '#c44a4a', icon: '💀' },
}

const slots: TrapSlot[] = ['north', 'east', 'south', 'west']

function getTrapAtSlot(slot: TrapSlot) {
  return placedTraps.value.find(t => t.slot === slot)
}

function selectStrategy(strategy: DefenseStrategy) {
  gameStore.setNightDefenseStrategy(strategy)
}

function placeTrapAtSlot(slot: TrapSlot) {
  if (!selectedTrapItem.value) return
  gameStore.placeNightTrap(slot, selectedTrapItem.value)
  selectedTrapItem.value = ''
}

function removeTrapAtSlot(slot: TrapSlot) {
  gameStore.removeNightTrap(slot)
}

function addSupply(type: 'foodUsed' | 'torchUsed' | 'herbUsed') {
  gameStore.allocateNightSupplies(type, 1)
}

function removeSupply(type: 'foodUsed' | 'torchUsed' | 'herbUsed') {
  gameStore.allocateNightSupplies(type, -1)
}

function startDefense() {
  const result = gameStore.executeNightDefense()
  if (result) {
    resultStep.value = 'summary'
  }
}

function finishDefense() {
  gameStore.finishNightDefense()
}

watch(() => gameStore.nightDefenseActive, (active) => {
  if (active) {
    resultStep.value = 'summary'
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="nightDefenseState && nightDefenseState.active" class="night-overlay">
        <div class="night-panel">
          <div class="night-header">
            <h2 class="night-title">🌙 夜间防守</h2>
            <p class="night-subtitle">布置陷阱、分配物资、选择策略以抵御夜间侵袭</p>
          </div>

          <div v-if="!isCompleted" class="night-body">
            <div class="defense-actions-info">
              <span class="actions-badge">
                ⚔️ 剩余防御行动: {{ defenseActionsLeft }}
              </span>
            </div>

            <div class="section">
              <h3 class="section-title">🛡️ 防守策略</h3>
              <div class="strategy-grid">
                <button
                  v-for="(info, key) in DEFENSE_STRATEGY_INFO"
                  :key="key"
                  class="strategy-btn"
                  :class="{ active: currentStrategy === key }"
                  @click="selectStrategy(key as DefenseStrategy)"
                >
                  <span class="strategy-icon">{{ info.icon }}</span>
                  <span class="strategy-name">{{ info.name }}</span>
                  <span class="strategy-desc">{{ info.description }}</span>
                  <span class="strategy-bonus" :class="info.defenseBonus >= 0 ? 'positive' : 'negative'">
                    防御 {{ info.defenseBonus >= 0 ? '+' : '' }}{{ Math.round(info.defenseBonus * 100) }}%
                  </span>
                </button>
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">🪤 布置陷阱</h3>
              <div class="trap-selector" v-if="placableTraps.length > 0 && defenseActionsLeft > 0">
                <select v-model="selectedTrapItem" class="trap-select">
                  <option value="">选择陷阱物品...</option>
                  <option v-for="trap in placableTraps" :key="trap.itemId" :value="trap.itemId">
                    {{ trap.name }} x{{ trap.count }}
                  </option>
                </select>
              </div>
              <p v-else-if="defenseActionsLeft <= 0" class="no-actions-hint">防御行动次数已用完</p>
              <p v-else class="no-actions-hint">没有可布置的陷阱物品</p>

              <div class="trap-slots">
                <div
                  v-for="slot in slots"
                  :key="slot"
                  class="trap-slot"
                  :class="{ occupied: !!getTrapAtSlot(slot) }"
                >
                  <div class="slot-direction">{{ TRAP_SLOT_LABELS[slot] }}</div>
                  <div v-if="getTrapAtSlot(slot)" class="slot-trap">
                    <span class="trap-name">{{ getTrapAtSlot(slot)!.name }}</span>
                    <span class="trap-dmg">伤害: {{ getTrapAtSlot(slot)!.damage }}</span>
                    <button class="trap-remove" @click="removeTrapAtSlot(slot)">✕</button>
                  </div>
                  <div v-else class="slot-empty">
                    <button
                      class="place-btn"
                      :disabled="!selectedTrapItem || defenseActionsLeft <= 0"
                      @click="placeTrapAtSlot(slot)"
                    >
                      + 布置
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">📦 物资分配</h3>
              <div class="supply-grid">
                <div class="supply-item">
                  <span class="supply-label">🍖 食物 (烤肉)</span>
                  <div class="supply-controls">
                    <button class="supply-btn" :disabled="supplies.foodUsed <= 0" @click="removeSupply('foodUsed')">-</button>
                    <span class="supply-count">{{ supplies.foodUsed }}</span>
                    <button class="supply-btn" :disabled="supplies.foodUsed >= availableFood || defenseActionsLeft <= 0" @click="addSupply('foodUsed')">+</button>
                  </div>
                  <span class="supply-available">库存: {{ availableFood }}</span>
                  <span class="supply-effect">每份减少5%伤害，恢复饥饿</span>
                </div>
                <div class="supply-item">
                  <span class="supply-label">🔥 火把</span>
                  <div class="supply-controls">
                    <button class="supply-btn" :disabled="supplies.torchUsed <= 0" @click="removeSupply('torchUsed')">-</button>
                    <span class="supply-count">{{ supplies.torchUsed }}</span>
                    <button class="supply-btn" :disabled="supplies.torchUsed >= availableTorch || defenseActionsLeft <= 0" @click="addSupply('torchUsed')">+</button>
                  </div>
                  <span class="supply-available">库存: {{ availableTorch }}</span>
                  <span class="supply-effect">每份减少8%伤害和10%精神损伤</span>
                </div>
                <div class="supply-item">
                  <span class="supply-label">🌿 干草药</span>
                  <div class="supply-controls">
                    <button class="supply-btn" :disabled="supplies.herbUsed <= 0" @click="removeSupply('herbUsed')">-</button>
                    <span class="supply-count">{{ supplies.herbUsed }}</span>
                    <button class="supply-btn" :disabled="supplies.herbUsed >= availableHerb || defenseActionsLeft <= 0" @click="addSupply('herbUsed')">+</button>
                  </div>
                  <span class="supply-available">库存: {{ availableHerb }}</span>
                  <span class="supply-effect">每份减少8%精神损伤，提升陷阱效率</span>
                </div>
              </div>
            </div>

            <div class="night-actions">
              <button class="btn-defend" @click="startDefense">
                ⚔️ 开始防守
              </button>
            </div>
          </div>

          <div v-else class="night-result">
            <div class="result-header">
              <span class="result-rating" :style="{ color: ratingInfo[defenseResult?.defenseRating || 'poor']?.color }">
                {{ ratingInfo[defenseResult?.defenseRating || 'poor']?.icon }}
                {{ ratingInfo[defenseResult?.defenseRating || 'poor']?.label }}
              </span>
            </div>

            <div v-if="defenseResult" class="result-details">
              <div class="result-summary">
                <div class="result-stat">
                  <span class="stat-label">❤️ 生命损伤</span>
                  <span class="stat-value damage">-{{ defenseResult.totalHpDamage }}</span>
                </div>
                <div class="result-stat">
                  <span class="stat-label">🧠 精神损伤</span>
                  <span class="stat-value damage">-{{ defenseResult.totalSanityDamage }}</span>
                </div>
                <div class="result-stat">
                  <span class="stat-label">☣️ 污染增加</span>
                  <span class="stat-value pollution">+{{ defenseResult.totalPollutionDamage }}</span>
                </div>
                <div class="result-stat">
                  <span class="stat-label">🏚️ 营地损坏</span>
                  <span class="stat-value" :class="{ damage: defenseResult.campDamage > 0, safe: defenseResult.campDamage === 0 }">
                    {{ defenseResult.campDamage > 0 ? `-${defenseResult.campDamage}` : '无' }}
                  </span>
                </div>
              </div>

              <div class="result-waves">
                <h4 class="waves-title">侵袭波次</h4>
                <div v-for="(wave, i) in defenseResult.waves" :key="i" class="wave-item">
                  <span class="wave-num">#{{ i + 1 }}</span>
                  <span class="wave-desc">{{ wave.description }}</span>
                </div>
              </div>

              <div class="result-consumed" v-if="defenseResult.trapsConsumed.length > 0">
                <h4 class="consumed-title">消耗的陷阱</h4>
                <div class="consumed-list">
                  <span v-for="trap in defenseResult.trapsConsumed" :key="trap" class="consumed-item">
                    🪤 {{ trap }}
                  </span>
                </div>
              </div>
            </div>

            <div class="night-actions">
              <button class="btn-continue" @click="finishDefense">
                🌅 迎接黎明
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.night-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(5, 5, 15, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(6px);
}

.night-panel {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  background: linear-gradient(180deg, #0d0d1a 0%, #12121c 100%);
  border: 1px solid #2a2a45;
  border-radius: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.8), 0 0 20px rgba(58, 143, 90, 0.1);
}

.night-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(90deg, rgba(58, 143, 90, 0.08) 0%, rgba(138, 90, 191, 0.08) 100%);
}

.night-title {
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-cthulhu-green-glow);
  margin: 0 0 4px 0;
}

.night-subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0;
}

.night-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.defense-actions-info {
  display: flex;
  justify-content: center;
}

.actions-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: linear-gradient(135deg, rgba(58, 143, 90, 0.2) 0%, rgba(94, 201, 138, 0.15) 100%);
  border: 1px solid var(--color-cthulhu-green);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-cthulhu-green-glow);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--color-text-primary);
  margin: 0;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.strategy-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.strategy-btn:hover {
  border-color: var(--color-cthulhu-green);
  background: var(--color-bg-hover);
}

.strategy-btn.active {
  border-color: var(--color-cthulhu-green);
  background: rgba(58, 143, 90, 0.15);
  box-shadow: 0 0 12px rgba(58, 143, 90, 0.2);
}

.strategy-icon {
  font-size: 20px;
}

.strategy-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.strategy-desc {
  font-size: 10px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.strategy-bonus {
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
}

.strategy-bonus.positive {
  color: #2ecc71;
}

.strategy-bonus.negative {
  color: #e74c3c;
}

.trap-selector {
  display: flex;
  gap: 8px;
}

.trap-select {
  flex: 1;
  padding: 8px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-body);
  outline: none;
}

.trap-select:focus {
  border-color: var(--color-cthulhu-green);
}

.no-actions-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
}

.trap-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.trap-slot {
  padding: 10px;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trap-slot.occupied {
  border-style: solid;
  border-color: var(--color-cthulhu-green);
  background: rgba(58, 143, 90, 0.08);
}

.slot-direction {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.slot-trap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.trap-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.trap-dmg {
  font-size: 10px;
  color: #e74c3c;
}

.trap-remove {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  cursor: pointer;
  transition: all 0.15s;
}

.trap-remove:hover {
  background: rgba(231, 76, 60, 0.3);
}

.slot-empty {
  display: flex;
  align-items: center;
}

.place-btn {
  padding: 4px 12px;
  font-size: 11px;
  background: rgba(58, 143, 90, 0.1);
  border: 1px solid var(--color-cthulhu-green);
  color: var(--color-cthulhu-green-glow);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.place-btn:hover:not(:disabled) {
  background: rgba(58, 143, 90, 0.2);
}

.place-btn:disabled {
  opacity: 0.3;
}

.supply-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.supply-item {
  display: grid;
  grid-template-columns: 100px auto 60px 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.supply-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.supply-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.supply-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.supply-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-cthulhu-green);
}

.supply-btn:disabled {
  opacity: 0.3;
}

.supply-count {
  font-size: 14px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  color: var(--color-cthulhu-green-glow);
}

.supply-available {
  font-size: 10px;
  color: var(--color-text-muted);
}

.supply-effect {
  font-size: 10px;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.night-actions {
  display: flex;
  justify-content: center;
  padding: 16px 0 4px;
}

.btn-defend {
  padding: 14px 40px;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  background: linear-gradient(135deg, #c44a4a 0%, #8a2020 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.05em;
}

.btn-defend:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(196, 74, 74, 0.4);
}

.btn-continue {
  padding: 14px 40px;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  background: linear-gradient(135deg, var(--color-cthulhu-green) 0%, #2a6b40 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.05em;
}

.btn-continue:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(58, 143, 90, 0.4);
}

.night-result {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.result-rating {
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-display);
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.result-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-bg-card);
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
}

.stat-value.damage {
  color: #e74c3c;
}

.stat-value.pollution {
  color: #9b59b6;
}

.stat-value.safe {
  color: #2ecc71;
}

.result-waves {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.waves-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.wave-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-bg-card);
  border-radius: 4px;
  border-left: 2px solid var(--color-border);
}

.wave-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.wave-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.result-consumed {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.consumed-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.consumed-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.consumed-item {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--color-bg-card);
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.35s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .night-panel,
.modal-leave-to .night-panel {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

@media (max-width: 600px) {
  .strategy-grid {
    grid-template-columns: 1fr;
  }

  .trap-slots {
    grid-template-columns: 1fr;
  }

  .supply-item {
    grid-template-columns: 80px auto 50px 1fr;
    font-size: 11px;
  }

  .result-summary {
    grid-template-columns: 1fr;
  }
}
</style>
