<template>
  <div v-if="visible" class="merchant-overlay" @click.self="handleClose">
    <div class="merchant-panel" :class="merchantClass">
      <div class="merchant-header">
        <div class="merchant-identity">
          <span class="merchant-icon">{{ merchant?.icon }}</span>
          <div class="merchant-titles">
            <h2 class="merchant-name">{{ merchant?.name }}</h2>
            <p class="merchant-title">{{ merchant?.title }}</p>
          </div>
        </div>
        <div class="merchant-reputation" v-if="repInfo">
          <span class="rep-badge" :style="{ color: repInfo.color }">{{ repInfo.level }}</span>
        </div>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <div class="merchant-dialogue">
        <p class="dialogue-text">"{{ dialogue }}"</p>
      </div>

      <div class="merchant-body">
        <div class="inventory-section">
          <h3 class="section-title">商品列表</h3>
          <div class="item-grid">
            <div
              v-for="(available, index) in availableItems"
              :key="index"
              class="item-card"
              :class="{ 
                disabled: !available.canBuy, 
                selected: selectedIndex === index 
              }"
              @click="selectItem(index)"
            >
              <div class="item-header">
                <span class="item-icon">{{ getItemData(available.item.itemId)?.icon }}</span>
                <div class="item-info">
                  <span class="item-name">{{ getItemData(available.item.itemId)?.name }}</span>
                  <span class="item-category" :class="available.item.category">
                    {{ getCategoryLabel(available.item.category) }}
                  </span>
                </div>
                <span class="stock-badge" :class="{ low: available.currentStock <= 1 }">
                  库存 {{ available.currentStock }}
                </span>
              </div>

              <p class="item-description">
                {{ available.item.description || getItemData(available.item.itemId)?.description }}
              </p>

              <div class="price-section">
                <div class="price-label">价格:</div>
                <div class="price-tags">
                  <span
                    v-for="(part, pIdx) in getPriceDisplay(available.adjustedPrice.adjustedPrice)"
                    :key="pIdx"
                    class="price-tag"
                  >
                    {{ part }}
                  </span>
                  <span v-if="available.adjustedPrice.discountMultiplier < 1" class="discount-tag">
                    -{{ Math.round((1 - available.adjustedPrice.discountMultiplier) * 100) }}%
                  </span>
                </div>
              </div>

              <div v-if="!available.canBuy" class="unavailable-reason">
                {{ available.reason }}
              </div>

              <div v-if="available.item.minReputation" class="rep-requirement">
                需要 {{ getFactionName(available.item.minReputation.factionId) }} 声望 {{ available.item.minReputation.value }}+
              </div>

              <div v-if="available.item.triggersEventOnBuy" class="event-hint">
                🔮 购买后触发特殊事件
              </div>
            </div>
          </div>
        </div>

        <div class="purchase-section" v-if="selectedIndex !== null">
          <h3 class="section-title">购买确认</h3>
          <div class="selected-item-preview">
            <span class="selected-icon">{{ getItemData(currentSelected?.item.itemId)?.icon }}</span>
            <div class="selected-details">
              <span class="selected-name">{{ getItemData(currentSelected?.item.itemId)?.name }}</span>
              <span class="selected-rarity">{{ getRarityLabel(getItemData(currentSelected?.item.itemId)?.rarity) }}</span>
            </div>
          </div>
          <button
            class="buy-btn"
            :disabled="!currentSelected?.canBuy"
            @click="handlePurchase"
          >
            {{ currentSelected?.canBuy ? '确认购买' : '无法购买' }}
          </button>
          <div class="purchase-messages" v-if="purchaseMessages.length > 0">
            <p v-for="(msg, idx) in purchaseMessages" :key="idx" class="purchase-msg">{{ msg }}</p>
          </div>
        </div>
      </div>

      <div class="merchant-footer">
        <div class="deals-info">
          <span>与该商人交易次数: {{ successfulDeals }}</span>
        </div>
        <button class="leave-btn" @click="handleClose">
          离开
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">import { ref, computed } from 'vue';
import type { Merchant } from '../game/types/merchant';
import type { AvailableItemResult } from '../game/systems/merchantSystem';
import { getPriceDisplay, getMerchantReputationBonus } from '../game/systems/merchantSystem';
import { ITEMS } from '../game/data/items';
import type { ReputationMap } from '../game/types/faction';
const props = defineProps<{
 visible: boolean;
 merchant: Merchant | null;
 availableItems: AvailableItemResult[];
 reputation: ReputationMap;
 successfulDeals: number;
 dialogue: string;
}>();
const emit = defineEmits<{
 (e: 'close'): void;
 (e: 'purchase', itemIndex: number): void;
}>();
const selectedIndex = ref<number | null>(null);
const purchaseMessages = ref<string[]>([]);
const merchantClass = computed(() => {
 if (!props.merchant)
 return {};
 return {
 'category-wanderer': props.merchant.category === 'wanderer',
 'category-abyssal': props.merchant.category === 'abyssal',
 'category-monastery': props.merchant.category === 'monastery',
 'category-watcher': props.merchant.category === 'watcher',
 'category-legendary': props.merchant.category === 'legendary',
 };
});
const repInfo = computed(() => {
 if (!props.merchant)
 return null;
 return getMerchantReputationBonus(props.merchant, props.reputation);
});
const currentSelected = computed(() => {
 if (selectedIndex.value === null)
 return null;
 return props.availableItems[selectedIndex.value];
});
function getItemData(itemId: string | undefined) {
 if (!itemId)
 return null;
 return ITEMS[itemId] || null;
}
function getCategoryLabel(category: string) {
 const labels: Record<string, string> = {
 contraband: '⚠️ 禁忌物资',
 intel: '📜 情报线索',
 rare_material: '💎 稀有材料',
 };
 return labels[category] || category;
}
function getRarityLabel(rarity: string | undefined) {
 const labels: Record<string, string> = {
 common: '普通',
 uncommon: '非凡',
 rare: '稀有',
 legendary: '传说',
 };
 return labels[rarity || 'common'] || '普通';
}
function getFactionName(factionId: string) {
 const names: Record<string, string> = {
 monastery: '修道院',
 deep_ones: '深潜者',
 watchers: '守望者',
 };
 return names[factionId] || factionId;
}
function selectItem(index: number) {
 selectedIndex.value = index;
 purchaseMessages.value = [];
}
function handlePurchase() {
 if (selectedIndex.value === null)
 return;
 emit('purchase', selectedIndex.value);
}
function addPurchaseMessage(msg: string) {
 purchaseMessages.value.push(msg);
}
function handleClose() {
 selectedIndex.value = null;
 purchaseMessages.value = [];
 emit('close');
}
defineExpose({ addPurchaseMessage });
</script>

<style scoped>
.merchant-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.merchant-panel {
  width: min(900px, 92vw);
  max-height: 88vh;
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #2d3a5c;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.category-wanderer {
  border-color: #6b5b3e;
  background: linear-gradient(145deg, #1a1a2e 0%, #2a2418 100%);
}

.category-abyssal {
  border-color: #4a3a6b;
  background: linear-gradient(145deg, #1a1a2e 0%, #1a1030 100%);
}

.category-monastery {
  border-color: #c9a227;
  background: linear-gradient(145deg, #1a1a2e 0%, #2e2a1a 100%);
}

.category-watcher {
  border-color: #2a7a9a;
  background: linear-gradient(145deg, #1a1a2e 0%, #1a2530 100%);
}

.category-legendary {
  border-color: #9b59b6;
  background: linear-gradient(145deg, #1a1a2e 0%, #2a1a3e 100%);
  animation: legendaryGlow 3s ease-in-out infinite alternate;
}

@keyframes legendaryGlow {
  from { box-shadow: 0 20px 60px rgba(155, 89, 182, 0.3); }
  to { box-shadow: 0 20px 80px rgba(155, 89, 182, 0.5); }
}

.merchant-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #2d3a5c;
  background: rgba(0, 0, 0, 0.2);
}

.merchant-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.merchant-icon {
  font-size: 42px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

.merchant-titles {
  display: flex;
  flex-direction: column;
}

.merchant-name {
  margin: 0;
  font-size: 22px;
  font-weight: bold;
  color: #f0e6d3;
}

.merchant-title {
  margin: 0;
  font-size: 13px;
  color: #8892a6;
}

.merchant-reputation {
  display: flex;
  align-items: center;
}

.rep-badge {
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 13px;
  font-weight: 500;
  border: 1px solid currentColor;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 100, 100, 0.15);
  color: #ff6b6b;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 100, 100, 0.3);
  transform: scale(1.05);
}

.merchant-dialogue {
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid #2d3a5c;
}

.dialogue-text {
  margin: 0;
  font-size: 15px;
  color: #c8b88b;
  font-style: italic;
  line-height: 1.6;
}

.merchant-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
}

.inventory-section {
  overflow-y: auto;
}

.section-title {
  margin: 0 0 14px 0;
  font-size: 16px;
  color: #a0aec0;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #2d3a5c;
}

.item-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-card {
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #2d3a5c;
  cursor: pointer;
  transition: all 0.2s;
}

.item-card:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: #4a5a8c;
  transform: translateY(-1px);
}

.item-card.selected {
  background: rgba(100, 150, 255, 0.08);
  border-color: #5a8aff;
  box-shadow: 0 0 20px rgba(90, 138, 255, 0.15);
}

.item-card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.item-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 14px;
}

.item-category {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  width: fit-content;
}

.item-category.contraband {
  background: rgba(255, 100, 100, 0.15);
  color: #ff8a8a;
}

.item-category.intel {
  background: rgba(100, 200, 255, 0.15);
  color: #8ad4ff;
}

.item-category.rare_material {
  background: rgba(200, 150, 255, 0.15);
  color: #c9a8ff;
}

.stock-badge {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(100, 200, 100, 0.15);
  color: #8aff8a;
  font-size: 11px;
  font-weight: 500;
}

.stock-badge.low {
  background: rgba(255, 150, 50, 0.15);
  color: #ffbb66;
}

.item-description {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #8892a6;
  line-height: 1.5;
}

.price-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.price-label {
  font-size: 12px;
  color: #8892a6;
}

.price-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.price-tag {
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255, 200, 100, 0.1);
  color: #e8c87a;
  font-size: 11px;
  border: 1px solid rgba(255, 200, 100, 0.2);
}

.discount-tag {
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(100, 255, 150, 0.15);
  color: #6aff9e;
  font-size: 11px;
  font-weight: 600;
}

.unavailable-reason {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 100, 100, 0.1);
  color: #ff8a8a;
  font-size: 11px;
}

.rep-requirement {
  margin-top: 6px;
  font-size: 11px;
  color: #d4a757;
}

.event-hint {
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(155, 89, 182, 0.12);
  color: #c39bd3;
  font-size: 11px;
}

.purchase-section {
  position: sticky;
  top: 0;
  padding: 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid #2d3a5c;
  height: fit-content;
}

.selected-item-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.selected-icon {
  font-size: 36px;
}

.selected-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selected-name {
  font-weight: 600;
  color: #e2e8f0;
}

.selected-rarity {
  font-size: 11px;
  color: #f0c040;
}

.buy-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #4a7a9e 0%, #3a5a7e 100%);
  color: white;
}

.buy-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a8aae 0%, #4a6a8e 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(74, 122, 158, 0.3);
}

.buy-btn:disabled {
  background: #3a3a4a;
  color: #6a6a7a;
  cursor: not-allowed;
}

.purchase-messages {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.purchase-msg {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(100, 200, 100, 0.1);
  color: #8aff8a;
  font-size: 12px;
  line-height: 1.4;
}

.merchant-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-top: 1px solid #2d3a5c;
  background: rgba(0, 0, 0, 0.2);
}

.deals-info {
  font-size: 12px;
  color: #8892a6;
}

.leave-btn {
  padding: 10px 28px;
  border: 1px solid #4a5a8c;
  background: transparent;
  color: #a0aec0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.leave-btn:hover {
  background: rgba(74, 90, 140, 0.15);
  color: #e2e8f0;
  border-color: #5a6a9c;
}
</style>
