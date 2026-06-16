<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { ITEMS } from '@game/data/items'

const gameStore = useGameStore()
const { inventory } = storeToRefs(gameStore)

const itemList = computed(() => {
  return inventory.value.map(inv => {
    const data = ITEMS[inv.itemId]
    return { ...inv, data }
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
  return data.type === 'consumable'
    || !!data.hpOnUse || !!data.sanityOnUse || !!data.pollutionOnUse
    || !!data.hungerOnUse || !!data.energyOnUse
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
        :class="{ usable: canUse(item.itemId) }"
      >
        <span class="item-icon">{{ item.data.icon }}</span>
        <span v-if="item.count > 1" class="item-count">{{ item.count }}</span>
        <span
          class="rarity-border"
          :style="{ borderColor: rarityColor[item.data.rarity] }"
        ></span>
      </div>
    </div>
    <p class="hint">点击消耗品可使用</p>
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

.hint {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
