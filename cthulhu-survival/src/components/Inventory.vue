<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { ITEMS } from '@game/data/items'
import { getDurabilityColor } from '@game/systems/durabilitySystem'
import { AFFIX_RARITY_COLORS } from '@game/types/affix'
import { getAffixedItemName, getItemAffixes, getHighestAffixRarity } from '@game/systems/affixSystem'

const gameStore = useGameStore()
const { inventory } = storeToRefs(gameStore)

const selectedItem = ref<number | null>(null)

const itemList = computed(() => {
  return inventory.value.map((inv, index) => {
    const data = ITEMS[inv.itemId]
    const hasDurability = !!data?.maxDurability
    const durabilityRatio = hasDurability && inv.durability !== undefined
      ? inv.durability / data!.maxDurability!
      : null
    const hasAffixes = !!inv.affixes && inv.affixes.length > 0
    const highestAffixRarity = hasAffixes ? getHighestAffixRarity(inv) : null
    const displayName = hasAffixes ? getAffixedItemName(inv) : data?.name || inv.itemId
    const affixes = hasAffixes ? getItemAffixes(inv) : []
    return { ...inv, data, hasDurability, durabilityRatio, hasAffixes, highestAffixRarity, displayName, affixes, index }
  }).filter(x => x.data)
})

const rarityColor: Record<string, string> = {
  common: '#9898b0',
  uncommon: '#5ec98a',
  rare: '#5a7abf',
  legendary: '#d9a54c',
}

function useItem(itemId: string, index: number) {
  const invItem = inventory.value[index]
  if (invItem?.affixes && invItem.affixes.length > 0) {
    gameStore.useAffixedItem(index)
  } else {
    gameStore.useItem(itemId)
  }
  selectedItem.value = null
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

function selectItem(index: number) {
  if (selectedItem.value === index) {
    selectedItem.value = null
  } else {
    selectedItem.value = index
  }
}

function handleItemClick(item: any) {
  if (item.hasAffixes) {
    selectItem(item.index)
  } else if (canUse(item.itemId)) {
    useItem(item.itemId, item.index)
  }
}

function getItemTooltip(item: any): string {
  let tooltip = item.data.description
  if (item.hasAffixes && item.affixes.length > 0) {
    tooltip += '\n\n词缀：'
    for (const affix of item.affixes) {
      tooltip += `\n  ${affix.icon} ${affix.name} - ${affix.description}`
    }
  }
  return tooltip
}
</script>

<template>
  <div class="inventory">
    <h3 class="panel-title">🎒 背包</h3>
    <div v-if="itemList.length === 0" class="empty">背包空空如也</div>
    <div v-else class="item-grid">
      <div
        v-for="item in itemList"
        :key="item.instanceId || item.itemId + '-' + item.index"
        class="item-slot"
        :title="getItemTooltip(item)"
        @click="handleItemClick(item)"
        :class="{
          usable: canUse(item.itemId) || item.hasAffixes,
          broken: item.hasDurability && item.durabilityRatio === 0,
          'has-affix': item.hasAffixes,
          selected: selectedItem === item.index,
        }"
      >
        <span class="item-icon">{{ item.data.icon }}</span>
        <span v-if="item.count > 1" class="item-count">{{ item.count }}</span>
        <span
          class="rarity-border"
          :style="{ borderColor: item.highestAffixRarity
            ? AFFIX_RARITY_COLORS[item.highestAffixRarity]
            : rarityColor[item.data.rarity]
          }"
        ></span>
        <div v-if="item.hasDurability && item.durabilityRatio !== null" class="durability-bar">
          <div
            class="durability-fill"
            :style="{ width: (item.durabilityRatio * 100) + '%', backgroundColor: getDurabilityColor(item.durabilityRatio) }"
          ></div>
        </div>
        <div v-if="item.hasAffixes" class="affix-indicator">
          <span
            v-for="(affix, idx) in item.affixes.slice(0, 2)"
            :key="idx"
            class="affix-dot"
            :style="{ backgroundColor: AFFIX_RARITY_COLORS[affix.rarity] }"
          ></span>
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

    <div v-if="selectedItem !== null && itemList[selectedItem]" class="item-detail">
      <div class="detail-header">
        <span class="detail-icon">{{ itemList[selectedItem].data.icon }}</span>
        <div class="detail-info">
          <h4>{{ itemList[selectedItem].displayName }}</h4>
          <p class="detail-type">
            {{ itemList[selectedItem].data.type === 'material' ? '材料' :
            itemList[selectedItem].data.type === 'tool' ? '工具' :
            itemList[selectedItem].data.type === 'consumable' ? '消耗品' :
            itemList[selectedItem].data.type === 'weapon' ? '武器' : '神器' }}
          </p>
        </div>
      </div>
      <p class="detail-desc">{{ itemList[selectedItem].data.description }}</p>
      <div v-if="itemList[selectedItem].hasAffixes" class="affix-list">
        <p class="affix-title">词缀效果：</p>
        <div
          v-for="(affix, idx) in itemList[selectedItem].affixes"
          :key="idx"
          class="affix-item"
          :style="{ borderLeftColor: AFFIX_RARITY_COLORS[affix.rarity] }"
        >
          <span class="affix-icon">{{ affix.icon }}</span>
          <span class="affix-name">{{ affix.name }}</span>
          <span class="affix-desc">{{ affix.description }}</span>
        </div>
      </div>
      <button
        v-if="canUse(itemList[selectedItem].itemId)"
        class="use-btn"
        @click="useItem(itemList[selectedItem].itemId, selectedItem)"
      >使用</button>
    </div>

    <p class="hint">点击消耗品和侦查道具可使用 · 带词缀物品点击查看详情</p>
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

.item-slot.has-affix {
  cursor: pointer;
}

.item-slot.has-affix:hover {
  background: var(--color-bg-hover);
  transform: translateY(-1px);
}

.item-slot.selected {
  background: var(--color-bg-hover);
  box-shadow: 0 0 0 2px var(--color-primary);
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

.affix-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  display: flex;
  gap: 2px;
}

.affix-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
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

.item-detail {
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-top: 8px;
  border: 1px solid var(--color-border);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.detail-icon {
  font-size: 32px;
}

.detail-info h4 {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-primary);
}

.detail-type {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.detail-desc {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.affix-list {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
}

.affix-title {
  margin: 0 0 6px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.affix-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-bottom: 4px;
  background: var(--color-bg-dark);
  border-left: 3px solid;
  border-radius: 0 4px 4px 0;
  font-size: 11px;
}

.affix-icon {
  font-size: 14px;
}

.affix-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.affix-desc {
  color: var(--color-text-muted);
  margin-left: auto;
}

.use-btn {
  width: 100%;
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.use-btn:hover {
  background: var(--color-primary-hover);
}

.hint {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: 8px;
}
</style>
