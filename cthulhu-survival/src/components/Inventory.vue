<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { ITEMS } from '@game/data/items'
import { getDurabilityColor } from '@game/systems/durabilitySystem'

const gameStore = useGameStore()
const { inventory } = storeToRefs(gameStore)

const itemList = computed(() => {
  return inventory.value.map(inv => {
    const data = ITEMS[inv.itemId]
    const hasDurability = !!data?.maxDurability
    const durabilityRatio = hasDurability && inv.durability !== undefined
      ? inv.durability / data!.maxDurability!
      : null
    return { ...inv, data, hasDurability, durabilityRatio }
  }).filter(x => x.data)
})

const rarityColor: Record<string, string> = {
  common: '#9898b0',
  uncommon: '#5ec98a',
  rare: '#5a7abf',
  legendary: '#d9a54c',
}

function useItem(itemId: string) {
  gameStore.useItem(itemId)
}

function canUse(itemId: string): boolean {
  const data = ITEMS[itemId]
  if (!data) return false

  const scoutingTools = ['telescope', 'divination_rod', 'compass', 'trap_detector', 'eye_of_insight']
  if (scoutingTools.includes(itemId)) {
    return true
  }

  if (itemId === 'scouting_potion') {
    return true
  }

  return data.type === 'consumable'
    || !!data.hpOnUse || !!data.sanityOnUse || !!data.pollutionOnUse
    || !!data.hungerOnUse || !!data.energyOnUse
}

function canRepair(itemId: string): boolean {
  return gameStore.canRepairItem(itemId).canRepair
}

function repair(itemId: string) {
  gameStore.repairItem(itemId)
}
</script>

<template>
  <div class="inventory">
    <h3 class="panel-title">🎒 背包</h3>
    <div v-if="itemList.length === 0" class="empty">背包空空如也</div>
    <div v-else class="item-grid">
      <div
        v-for="item in itemList"
        :key="item.itemId"
        class="item-slot"
        :title="item.data.description"
        @click="canUse(item.itemId) && useItem(item.itemId)"
        :class="{ usable: canUse(item.itemId), broken: item.hasDurability && item.durabilityRatio === 0 }"
      >
        <span class="item-icon">{{ item.data.icon }}</span>
        <span v-if="item.count > 1" class="item-count">{{ item.count }}</span>
        <span
          class="rarity-border"
          :style="{ borderColor: rarityColor[item.data.rarity] }"
        ></span>
        <div v-if="item.hasDurability && item.durabilityRatio !== null" class="durability-bar">
          <div
            class="durability-fill"
            :style="{ width: (item.durabilityRatio * 100) + '%', backgroundColor: getDurabilityColor(item.durabilityRatio) }"
          ></div>
        </div>
        <button
          v-if="item.hasDurability && item.durabilityRatio !== null && item.durabilityRatio < 1"
          class="repair-btn"
          :disabled="!canRepair(item.itemId)"
          @click.stop="repair(item.itemId)"
          :title="canRepair(item.itemId) ? '维修' : gameStore.canRepairItem(item.itemId).reason || '无法维修'"
        >🔧</button>
      </div>
    </div>
    <p class="hint">点击消耗品和侦查道具可使用 · 工具武器会损耗耐久</p>
  </div>
</template>

<style scoped>
.inventory {
  padding: 16px;
}

.panel-title {
  font-size: 16px;
  margin-bottom: 14px;
  letter-spacing: 0.05em;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px 0;
  font-size: 13px;
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.item-slot {
  position: relative;
  aspect-ratio: 1;
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.15s ease;
}

.item-slot.usable {
  cursor: pointer;
}

.item-slot.usable:hover {
  background: var(--color-bg-hover);
  transform: translateY(-1px);
}

.item-slot.broken {
  opacity: 0.5;
  filter: grayscale(0.6);
}

.rarity-border {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  pointer-events: none;
}

.item-icon {
  font-size: 26px;
}

.item-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
  background: rgba(0, 0, 0, 0.6);
  padding: 0 4px;
  border-radius: 3px;
}

.durability-bar {
  position: absolute;
  bottom: 0;
  left: 2px;
  right: 2px;
  height: 3px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 2px;
  overflow: hidden;
}

.durability-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.repair-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  font-size: 10px;
  line-height: 1;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: 0.85;
  transition: opacity 0.15s;
}

.repair-btn:hover:not(:disabled) {
  opacity: 1;
  transform: scale(1.15);
}

.repair-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.hint {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
