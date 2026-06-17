<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import { ITEMS } from '@game/data/items'
import { FACTIONS } from '@game/data/factions'
import type { CraftRecipe } from '@game/types/items'
import { getItemDurabilityInfo, getDurabilityColor } from '@game/systems/durabilitySystem'
import { calculateCraftSuccessBonus, calculateCraftYieldBonus } from '@game/systems/affixSystem'

const gameStore = useGameStore()
const { inventory, reputation } = storeToRefs(gameStore)

const recipes = computed(() => gameStore.getCraftableRecipes())

function factionName(id: string): string {
  return FACTIONS.find(f => f.id === id)?.name || id
}

function factionIcon(id: string): string {
  return FACTIONS.find(f => f.id === id)?.icon || '❓'
}

function reputationOk(r: CraftRecipe): boolean {
  if (!r.requiredReputation) return true
  const rep = reputation.value[r.requiredReputation.factionId] || 0
  return rep >= r.requiredReputation.minReputation
}

function hasIngredient(itemId: string, count: number): boolean {
  const total = inventory.value.reduce((sum, item) => {
    if (item.itemId === itemId) {
      return sum + item.count
    }
    return sum
  }, 0)
  return total >= count
}

function getAffixedIngredients(itemId: string) {
  return inventory.value.filter(item => item.itemId === itemId && item.affixes && item.affixes.length > 0)
}

function getCraftSuccessBonus(r: CraftRecipe): number {
  return calculateCraftSuccessBonus(inventory.value, r.ingredients)
}

function getCraftYieldBonus(r: CraftRecipe): number {
  return calculateCraftYieldBonus(inventory.value, r.ingredients)
}

function getAffixChance(r: CraftRecipe): number {
  let chance = 0
  for (const ing of r.ingredients) {
    const affixedItems = getAffixedIngredients(ing.itemId)
    for (const item of affixedItems) {
      if (item.affixes) {
        chance += 0.15 * item.affixes.length
      }
    }
  }
  return Math.min(chance, 0.8)
}

function toolDurabilityText(toolId: string): string {
  const info = getItemDurabilityInfo(inventory.value, toolId)
  if (!info) return ''
  return `${info.current}/${info.max}`
}

function toolDurabilityRatio(toolId: string): number {
  const info = getItemDurabilityInfo(inventory.value, toolId)
  if (!info) return 1
  return info.ratio
}

function canCraft(r: CraftRecipe) {
  return gameStore.canCraftRecipe(r)
}

function craft(r: CraftRecipe) {
  gameStore.craft(r)
}
</script>

<template>
  <div class="craft-panel">
    <h3 class="panel-title">⚒️ 合成</h3>
    <div v-if="recipes.length === 0" class="empty">暂无可用配方，探索世界以解锁更多...</div>
    <div v-else class="recipe-list">
      <div
        v-for="r in recipes"
        :key="r.id"
        class="recipe-card"
        :class="{ disabled: !canCraft(r).canCraft }"
      >
        <div class="recipe-header">
          <span class="recipe-result-icon">{{ ITEMS[r.result.itemId]?.icon || '?' }}</span>
          <div class="recipe-info">
            <span class="recipe-name">{{ r.name }} x{{ r.result.count }}</span>
            <span class="recipe-desc">{{ r.description }}</span>
          </div>
        </div>

        <div class="ingredients">
          <span class="ing-label">材料：</span>
          <span
            v-for="ing in r.ingredients"
            :key="ing.itemId"
            class="ing-chip"
            :class="{ ok: hasIngredient(ing.itemId, ing.count) }"
          >
            {{ ITEMS[ing.itemId]?.icon }} {{ ITEMS[ing.itemId]?.name }} x{{ ing.count }}
            <span v-if="getAffixedIngredients(ing.itemId).length > 0" class="affix-badge">✨</span>
          </span>
          <span v-if="r.requiredTool" class="ing-chip tool-chip" :class="{ ok: hasIngredient(r.requiredTool, 1) }">
            🔧 {{ ITEMS[r.requiredTool]?.name }}
            <span
              v-if="ITEMS[r.requiredTool]?.maxDurability"
              class="tool-durability"
              :style="{ color: getDurabilityColor(toolDurabilityRatio(r.requiredTool)) }"
            >{{ toolDurabilityText(r.requiredTool) }}</span>
          </span>
        </div>

        <div v-if="getCraftSuccessBonus(r) > 0 || getCraftYieldBonus(r) > 0" class="affix-bonuses">
          <span class="bonus-label">词缀加成：</span>
          <span v-if="getCraftSuccessBonus(r) > 0" class="bonus-item ok">
            成功率 +{{ Math.round(getCraftSuccessBonus(r) * 100) }}%
          </span>
          <span v-if="getCraftYieldBonus(r) > 0" class="bonus-item ok">
            产量 +{{ Math.round(getCraftYieldBonus(r) * 100) }}%
          </span>
          <span v-if="getAffixChance(r) > 0" class="bonus-item">
            产物词缀概率 {{ Math.round(getAffixChance(r) * 100) }}%
          </span>
        </div>

        <div class="cost">
          <span v-if="r.energyCost" :class="inventory.length > 0 ? 'ok' : ''">⚡ {{ r.energyCost }}</span>
          <span v-if="r.sanityCost < 0">🧠 {{ r.sanityCost }}</span>
          <span v-if="r.pollutionCost > 0">☠️ +{{ r.pollutionCost }}</span>
        </div>

        <div v-if="r.requiredReputation" class="reputation-req" :class="{ ok: reputationOk(r) }">
          <span>{{ factionIcon(r.requiredReputation.factionId) }}</span>
          <span>需要{{ factionName(r.requiredReputation.factionId) }}声望 ≥ {{ r.requiredReputation.minReputation }}</span>
          <span class="current-rep">(当前: {{ reputation[r.requiredReputation.factionId] || 0 }})</span>
        </div>

        <button
          class="btn-primary craft-btn"
          :disabled="!canCraft(r).canCraft"
          @click="craft(r)"
        >
          {{ canCraft(r).canCraft ? '合成' : (canCraft(r).reason || '无法合成') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.craft-panel {
  padding: 16px;
  max-height: 100%;
  overflow-y: auto;
}

.panel-title {
  font-size: 16px;
  margin-bottom: 14px;
  letter-spacing: 0.05em;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px 0;
  font-size: 13px;
}

.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  transition: all 0.2s ease;
}

.recipe-card.disabled {
  opacity: 0.55;
}

.recipe-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.recipe-result-icon {
  font-size: 32px;
  line-height: 1;
}

.recipe-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recipe-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.recipe-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  align-items: center;
}

.ing-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.ing-chip {
  font-size: 11px;
  padding: 3px 8px;
  background: var(--color-bg-dark);
  border-radius: 4px;
  color: var(--color-danger);
  position: relative;
}

.ing-chip.ok {
  color: var(--color-cthulhu-green-glow);
}

.affix-badge {
  margin-left: 2px;
  font-size: 10px;
}

.tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tool-durability {
  font-size: 10px;
  font-weight: 600;
}

.affix-bonuses {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  padding: 6px 8px;
  background: rgba(90, 122, 191, 0.08);
  border: 1px solid rgba(90, 122, 191, 0.25);
  border-radius: 4px;
  font-size: 11px;
  align-items: center;
}

.bonus-label {
  color: var(--color-text-muted);
}

.bonus-item {
  padding: 2px 6px;
  background: var(--color-bg-dark);
  border-radius: 3px;
  color: var(--color-text-secondary);
}

.bonus-item.ok {
  color: var(--color-cthulhu-green-glow);
}

.cost {
  display: flex;
  gap: 10px;
  font-size: 11px;
  margin-bottom: 10px;
  color: var(--color-text-secondary);
}

.reputation-req {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  margin-bottom: 10px;
  padding: 4px 8px;
  background: rgba(196, 74, 74, 0.08);
  border: 1px solid rgba(196, 74, 74, 0.25);
  border-radius: 4px;
  color: var(--color-danger);
}

.reputation-req.ok {
  background: rgba(94, 201, 138, 0.08);
  border-color: rgba(94, 201, 138, 0.25);
  color: var(--color-cthulhu-green-glow);
}

.current-rep {
  margin-left: auto;
  color: var(--color-text-muted);
}

.craft-btn {
  width: 100%;
  padding: 8px 16px !important;
  font-size: 13px !important;
}
</style>
