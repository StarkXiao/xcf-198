<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@stores/gameStore'
import { useUiStore } from '@stores/uiStore'
import { storeToRefs } from 'pinia'
import PhaserGame from '@phaser/PhaserGame.vue'
import StatusBar from '@components/StatusBar.vue'
import Inventory from '@components/Inventory.vue'
import CraftPanel from '@components/CraftPanel.vue'
import EventDialog from '@components/EventDialog.vue'
import SaveLoadPanel from '@components/SaveLoadPanel.vue'
import ReputationPanel from '@components/ReputationPanel.vue'
import GrowthTreePanel from '@components/GrowthTreePanel.vue'
import TimelinePanel from '@components/TimelinePanel.vue'
import MerchantPanel from '@components/MerchantPanel.vue'

const router = useRouter()
const gameStore = useGameStore()
const uiStore = useUiStore()
const { state, identity, currentTile, messages, currentDangerInfo, lootQualityModifier, availableGrowthNodes, newUnlockNotification, scoutingPotionActive, scoutingPotionTurns, availableScoutingActions, currentMerchant, merchantAvailableItems, merchantDialogue, merchantSuccessfulDeals, merchantPanelVisible, reputation } = storeToRefs(gameStore)
const { activePanel } = storeToRefs(uiStore)

const merchantPanelRef = ref<InstanceType<typeof MerchantPanel> | null>(null)

function handleMerchantPurchase(itemIndex: number) {
  const result = gameStore.purchaseMerchantItem(itemIndex)
  if (merchantPanelRef.value && result.messages.length > 0) {
    for (const msg of result.messages) {
      merchantPanelRef.value.addPurchaseMessage(msg)
    }
  }
}

function handleMerchantClose() {
  gameStore.closeMerchantPanel()
}

const showGrowthModal = ref(false)

const messagesRef = ref<HTMLDivElement | null>(null)

const canRest = computed(() => currentTile.value?.type === 'camp')

watch(
  () => state.value?.currentEndingId,
  (id) => {
    if (id) {
      router.push(`/ending/${id}`)
    }
  },
)

watch(
  () => state.value?.status,
  (status) => {
    if (status === 'ending' && state.value?.currentEndingId) {
      router.push(`/ending/${state.value.currentEndingId}`)
    }
  },
)

onMounted(() => {
  if (!gameStore.engine) {
    router.replace('/')
  }
})

watch(
  messages,
  () => {
    setTimeout(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    }, 50)
  },
  { deep: true },
)

function goRest() {
  gameStore.rest()
}

function checkEndings() {
  const available = gameStore.checkEndings()
  if (available.length > 0) {
    const ending = available[0]
    if (confirm(`达成结局条件：${ending.name}\n是否查看该结局？`)) {
      gameStore.triggerEnding(ending.id)
    }
  }
}

function doReconTile() {
  gameStore.reconCurrentTile()
}

function doReconArea() {
  gameStore.reconSurroundingArea()
}

function doDisarmTrap() {
  gameStore.disarmCurrentTrap()
}

function doLootHidden() {
  gameStore.lootCurrentHidden()
}

function doHarvestSpecial() {
  gameStore.harvestCurrentSpecialResource()
}
</script>

<template>
  <div class="game-view" v-if="state && identity">
    <div class="game-layout">
      <aside class="left-panel">
        <div class="identity-card panel">
          <div class="id-head">
            <span class="id-icon">{{ identity.icon }}</span>
            <div class="id-info">
              <span class="id-name">{{ identity.name }}</span>
              <span class="id-title">{{ identity.title }}</span>
            </div>
          </div>
          <div class="id-skills">
            <div v-for="s in identity.skills" :key="s.id" class="skill">
              <span class="skill-name">✨ {{ s.name }}</span>
              <span class="skill-desc">{{ s.description }}</span>
            </div>
          </div>
          <button
            class="growth-tree-entry"
            :class="{ 'has-notification': availableGrowthNodes.length > 0, 'new-unlock': newUnlockNotification }"
            @click="showGrowthModal = true"
          >
            <span class="entry-icon">🌳</span>
            <span class="entry-text">成长树</span>
            <span v-if="availableGrowthNodes.length > 0" class="entry-badge">
              {{ availableGrowthNodes.length }}
            </span>
          </button>
        </div>

        <StatusBar />

        <ReputationPanel />

        <div class="messages-panel panel" ref="messagesRef">
          <h4 class="msg-title">📜 日志</h4>
          <div class="msg-list">
            <p v-for="(m, i) in messages.slice(-40)" :key="i" class="msg-item">
              {{ m }}
            </p>
          </div>
        </div>
      </aside>

      <main class="center-panel">
        <div class="top-actions">
          <div class="tile-info panel">
            <div class="tile-header">
              <span class="tile-name">
                📍 {{ currentTile?.name || '未知之地' }}
              </span>
              <span
                v-if="currentDangerInfo"
                class="danger-indicator"
                :style="{ color: currentDangerInfo.color, borderColor: currentDangerInfo.color }"
                :title="currentDangerInfo.description"
              >
                {{ currentDangerInfo.icon }} 危险度: {{ currentDangerInfo.value }}%
              </span>
            </div>
            <span class="tile-desc">{{ currentTile?.description || '' }}</span>
            <div v-if="currentDangerInfo" class="danger-details">
              <span class="detail-item" :title="'基础危险度: ' + currentDangerInfo.tileDanger">
                🏔️ 区域: {{ currentDangerInfo.tileDanger }}
              </span>
              <span class="detail-item" :title="'昼夜修正: ' + currentDangerInfo.nightModifier.toFixed(1) + 'x'">
                {{ state?.time.phase === 'night' ? '🌙' : '☀️' }} 
                {{ state?.time.phase === 'night' ? '夜间' : '白天' }} x{{ currentDangerInfo.nightModifier.toFixed(1) }}
              </span>
              <span class="detail-item" :title="'污染修正: ' + currentDangerInfo.pollutionModifier.toFixed(1) + 'x'">
                ☣️ 污染 x{{ currentDangerInfo.pollutionModifier.toFixed(1) }}
              </span>
            </div>

            <div v-if="scoutingPotionActive" class="potion-active-badge">
              👁️ 鹰眼药剂生效中 (剩余 {{ scoutingPotionTurns }} 回合)
            </div>

            <div class="scouting-actions">
              <div class="scouting-row">
                <button
                  class="scout-btn"
                  :disabled="!availableScoutingActions.canRecon"
                  @click="doReconTile"
                  title="仔细侦查当前所在格子，可能发现隐藏物、陷阱或特殊资源"
                >
                  🔍 侦查当前格
                </button>
                <button
                  class="scout-btn"
                  :disabled="!availableScoutingActions.canRecon"
                  @click="doReconArea"
                  title="侦查周围一圈的所有格子"
                >
                  👁️ 侦查周边
                </button>
              </div>
              <div class="scouting-row">
                <button
                  v-if="availableScoutingActions.hasRevealedTrap"
                  class="scout-btn danger"
                  :disabled="!availableScoutingActions.canDisarm"
                  @click="doDisarmTrap"
                  title="尝试解除已发现的陷阱"
                >
                  ⚠️ 拆除陷阱
                </button>
                <button
                  v-if="availableScoutingActions.hasRevealedHidden"
                  class="scout-btn success"
                  :disabled="!availableScoutingActions.canLootHidden"
                  @click="doLootHidden"
                  title="搜刮已发现的隐藏物品"
                >
                  🔍 搜刮隐藏
                </button>
                <button
                  v-if="availableScoutingActions.hasRevealedSpecial"
                  class="scout-btn special"
                  :disabled="!availableScoutingActions.canHarvestSpecial"
                  @click="doHarvestSpecial"
                  title="采集已发现的特殊资源"
                >
                  ✨ 采集资源
                </button>
              </div>
            </div>

            <div v-if="currentTile?.trap?.revealed || currentTile?.hidden?.revealed || currentTile?.specialResource?.revealed" class="tile-scout-details">
              <div v-if="currentTile?.trap?.revealed" class="scout-detail trap-detail" :class="{ disarmed: currentTile.trap.disarmed, triggered: currentTile.trap.triggered }">
                <div class="scout-detail-head">
                  <span class="scout-icon">{{ currentTile.trap.disarmed ? '✅' : currentTile.trap.triggered ? '💥' : '⚠️' }}</span>
                  <span class="scout-name">{{ currentTile.trap.name }}</span>
                  <span v-if="currentTile.trap.disarmed" class="scout-tag">已解除</span>
                  <span v-else-if="currentTile.trap.triggered" class="scout-tag triggered">已触发</span>
                  <span v-else class="scout-tag active">危险!</span>
                </div>
                <p class="scout-desc">{{ currentTile.trap.description }}</p>
                <p v-if="!currentTile.trap.triggered && !currentTile.trap.disarmed" class="scout-stat">潜在伤害: ❤️ -{{ currentTile.trap.damage }}</p>
              </div>

              <div v-if="currentTile?.hidden?.revealed" class="scout-detail hidden-detail" :class="{ looted: currentTile.hidden.looted }">
                <div class="scout-detail-head">
                  <span class="scout-icon">{{ currentTile.hidden.looted ? '📦' : '🔍' }}</span>
                  <span class="scout-name">{{ currentTile.hidden.name }}</span>
                  <span v-if="currentTile.hidden.looted" class="scout-tag">已搜刮</span>
                  <span v-else class="scout-tag success">待搜刮</span>
                </div>
                <p class="scout-desc">{{ currentTile.hidden.description }}</p>
                <p v-if="!currentTile.hidden.looted && currentTile.hidden.lootItems" class="scout-stat">
                  可能包含: {{ currentTile.hidden.lootItems.map(i => i.itemId + 'x' + i.count).join(', ') }}
                </p>
              </div>

              <div v-if="currentTile?.specialResource?.revealed" class="scout-detail special-detail" :class="{ harvested: currentTile.specialResource.harvested }">
                <div class="scout-detail-head">
                  <span class="scout-icon">{{ currentTile.specialResource.harvested ? '⭐' : '✨' }}</span>
                  <span class="scout-name">{{ currentTile.specialResource.name }}</span>
                  <span v-if="currentTile.specialResource.harvested" class="scout-tag">已采集</span>
                  <span v-else class="scout-tag special">可采集</span>
                </div>
                <p class="scout-desc">{{ currentTile.specialResource.description }}</p>
                <p v-if="!currentTile.specialResource.harvested" class="scout-stat">
                  采集消耗: ⚡ {{ currentTile.specialResource.harvestCost?.energy || 0 }}
                  <span v-if="currentTile.specialResource.harvestCost?.sanity">, 🧠 {{ currentTile.specialResource.harvestCost.sanity }}</span>
                </p>
              </div>
            </div>
          </div>
          <div class="action-btns">
            <button
              class="btn-secondary"
              :disabled="!canRest"
              @click="goRest"
              :title="canRest ? '在营地休息' : '只能在营地休息'"
            >
              💤 休息
            </button>
            <button class="btn-secondary" @click="checkEndings">
              🔯 结局
            </button>
            <button class="btn-secondary" @click="uiStore.toggleSaveLoad()">
              💾 存档
            </button>
            <button class="btn-secondary" @click="uiStore.toggleTimeline()">
              📜 时间线
            </button>
          </div>
        </div>

        <div class="map-container panel">
          <PhaserGame :width="520" :height="520" />
          <div class="map-hint">
            💡 点击相邻的格子即可移动探索。危险区域会消耗额外行动力，并影响事件概率和掉落品质。
            <span v-if="lootQualityModifier" class="loot-quality-info">
              | {{ lootQualityModifier.description }} (x{{ lootQualityModifier.multiplier.toFixed(1) }})
            </span>
          </div>
        </div>
      </main>

      <aside class="right-panel">
        <div class="panel-tabs">
          <button
            class="tab"
            :class="{ active: activePanel === 'inventory' }"
            @click="uiStore.togglePanel('inventory')"
          >
            🎒 背包
          </button>
          <button
            class="tab"
            :class="{ active: activePanel === 'craft' }"
            @click="uiStore.togglePanel('craft')"
          >
            ⚒️ 合成
          </button>
          <button
            class="tab growth-tab"
            :class="{ active: activePanel === 'growth', 'notify': availableGrowthNodes.length > 0 }"
            @click="uiStore.togglePanel('growth')"
          >
            🌳 成长
            <span v-if="availableGrowthNodes.length > 0" class="tab-badge">
              {{ availableGrowthNodes.length }}
            </span>
          </button>
        </div>
        <div class="panel-content panel">
          <Transition name="fade" mode="out-in">
            <Inventory v-if="activePanel === 'inventory' || !activePanel" key="inv" />
            <CraftPanel v-else-if="activePanel === 'craft'" key="craft" />
            <GrowthTreePanel v-else-if="activePanel === 'growth'" key="growth" />
          </Transition>
        </div>
      </aside>
    </div>

    <EventDialog />
    <SaveLoadPanel />
    <TimelinePanel @rewound="() => {}" />
    <MerchantPanel
      ref="merchantPanelRef"
      :visible="merchantPanelVisible"
      :merchant="currentMerchant"
      :availableItems="merchantAvailableItems"
      :reputation="reputation"
      :successfulDeals="merchantSuccessfulDeals"
      :dialogue="merchantDialogue"
      @close="handleMerchantClose"
      @purchase="handleMerchantPurchase"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showGrowthModal" class="growth-modal-overlay" @click.self="showGrowthModal = false">
          <div class="growth-modal">
            <div class="modal-header">
              <h3 class="modal-title">🌳 成长树</h3>
              <button class="modal-close" @click="showGrowthModal = false">✕</button>
            </div>
            <div class="modal-body">
              <GrowthTreePanel />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="newUnlockNotification" class="unlock-toast">
          <span class="toast-icon">🎉</span>
          <span class="toast-text">新能力可解锁！</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.game-view {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(94, 201, 138, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 90%, rgba(138, 90, 191, 0.05) 0%, transparent 50%),
    var(--color-bg-dark);
  overflow: hidden;
}

.game-layout {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 14px;
  padding: 14px;
  max-width: 1400px;
  margin: 0 auto;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.center-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
}

.identity-card {
  padding: 14px;
}

.id-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.id-icon {
  font-size: 38px;
  line-height: 1;
}

.id-info {
  display: flex;
  flex-direction: column;
}

.id-name {
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-display);
}

.id-title {
  font-size: 11px;
  color: var(--color-cthulhu-green-glow);
}

.id-skills {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.skill {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.skill-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.messages-panel {
  flex: 1;
  padding: 14px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.msg-title {
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.msg-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.msg-item {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding: 6px 8px;
  background: var(--color-bg-card);
  border-radius: 4px;
  border-left: 2px solid var(--color-border);
}

.top-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.tile-info {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.tile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.tile-name {
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--color-cthulhu-green-glow);
}

.danger-indicator {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border: 1px solid;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.tile-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.danger-details {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}

.detail-item {
  font-size: 10px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btns {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btns .btn-secondary {
  padding: 10px 14px !important;
  font-size: 12px !important;
}

.map-container {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  gap: 10px;
}

.map-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 4px 12px;
}

.loot-quality-info {
  color: var(--color-cthulhu-green-glow);
  font-weight: 500;
}

.potion-active-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(230, 126, 34, 0.2));
  border: 1px solid #f39c12;
  border-radius: 20px;
  font-size: 11px;
  color: #f39c12;
  font-weight: 600;
  width: fit-content;
}

.scouting-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.scouting-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.scout-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.scout-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-cthulhu-green);
  transform: translateY(-1px);
}

.scout-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.scout-btn.danger {
  border-color: #c0392b;
  color: #e74c3c;
}

.scout-btn.danger:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.1);
}

.scout-btn.success {
  border-color: #27ae60;
  color: #2ecc71;
}

.scout-btn.success:hover:not(:disabled) {
  background: rgba(46, 204, 113, 0.1);
}

.scout-btn.special {
  border-color: #8e44ad;
  color: #9b59b6;
}

.scout-btn.special:hover:not(:disabled) {
  background: rgba(155, 89, 182, 0.1);
}

.tile-scout-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.scout-detail {
  padding: 10px 12px;
  background: var(--color-bg-card);
  border-radius: 8px;
  border-left: 3px solid var(--color-border);
}

.scout-detail.trap-detail {
  border-left-color: #e74c3c;
}

.scout-detail.trap-detail.disarmed {
  border-left-color: #2ecc71;
  opacity: 0.8;
}

.scout-detail.trap-detail.triggered {
  border-left-color: #7f8c8d;
  opacity: 0.6;
}

.scout-detail.hidden-detail {
  border-left-color: #2ecc71;
}

.scout-detail.hidden-detail.looted {
  border-left-color: #7f8c8d;
  opacity: 0.7;
}

.scout-detail.special-detail {
  border-left-color: #9b59b6;
}

.scout-detail.special-detail.harvested {
  border-left-color: #7f8c8d;
  opacity: 0.7;
}

.scout-detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.scout-icon {
  font-size: 16px;
}

.scout-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.scout-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(127, 140, 141, 0.3);
  color: #bdc3c7;
  font-weight: 600;
}

.scout-tag.active {
  background: rgba(231, 76, 60, 0.25);
  color: #e74c3c;
}

.scout-tag.triggered {
  background: rgba(127, 140, 141, 0.3);
  color: #95a5a6;
}

.scout-tag.success {
  background: rgba(46, 204, 113, 0.25);
  color: #2ecc71;
}

.scout-tag.special {
  background: rgba(155, 89, 182, 0.25);
  color: #9b59b6;
}

.scout-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0 0 4px 0;
}

.scout-stat {
  font-size: 10px;
  color: var(--color-text-secondary);
  margin: 0;
}

.panel-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg-panel);
  padding: 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.tab {
  flex: 1;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
  border-radius: 4px;
  transition: all 0.2s;
}

.tab.active {
  background: var(--color-cthulhu-green);
  color: white;
  font-weight: 600;
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.growth-tree-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(96, 165, 250, 0.1) 100%);
  border: 1px solid var(--color-cthulhu-green);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s;
  font-family: var(--font-display);
  color: var(--color-cthulhu-green-glow);
  font-weight: 600;
  font-size: 13px;
  position: relative;
}

.growth-tree-entry:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(96, 165, 250, 0.2) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.2);
}

.growth-tree-entry.has-notification {
  animation: entry-pulse 2s ease-in-out infinite;
}

.growth-tree-entry.new-unlock {
  animation: unlock-entry-flash 1.5s ease-out;
}

@keyframes entry-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50% { box-shadow: 0 0 12px 3px rgba(74, 222, 128, 0.2); }
}

@keyframes unlock-entry-flash {
  0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.8); }
  50% { box-shadow: 0 0 30px 8px rgba(255, 215, 0, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
}

.entry-icon {
  font-size: 18px;
}

.entry-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: linear-gradient(135deg, #E74C3C, #C0392B);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.4);
}

.growth-tab {
  position: relative;
}

.growth-tab.notify {
  animation: tab-notify 2s ease-in-out infinite;
}

@keyframes tab-notify {
  0%, 100% { background: var(--color-bg-panel); }
  50% { background: rgba(74, 222, 128, 0.15); }
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 4px;
  background: #E74C3C;
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.growth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.growth-modal {
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.08) 0%, rgba(96, 165, 250, 0.08) 100%);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-cthulhu-green-glow);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg-panel);
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(231, 76, 60, 0.2);
  color: #E74C3C;
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .growth-modal,
.modal-leave-to .growth-modal {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

.unlock-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.95) 0%, rgba(230, 126, 34, 0.95) 100%);
  color: #1a1a1a;
  border-radius: 30px;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(241, 196, 15, 0.4);
}

.toast-icon {
  font-size: 20px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-30px);
}

@media (max-width: 1100px) {
  .game-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    overflow-y: auto;
    padding: 10px;
  }

  .left-panel,
  .right-panel {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .left-panel > *,
  .right-panel > * {
    flex: 1;
    min-width: 240px;
  }

  .messages-panel {
    max-height: 200px;
  }

  .growth-modal {
    max-height: 95vh;
  }

  .modal-body {
    padding: 10px;
  }
}
</style>
