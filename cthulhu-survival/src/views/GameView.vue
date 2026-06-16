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

const router = useRouter()
const gameStore = useGameStore()
const uiStore = useUiStore()
const { state, identity, currentTile, messages } = storeToRefs(gameStore)
const { activePanel } = storeToRefs(uiStore)

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
            <span class="tile-name">
              📍 {{ currentTile?.name || '未知之地' }}
            </span>
            <span class="tile-desc">{{ currentTile?.description || '' }}</span>
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
          </div>
        </div>

        <div class="map-container panel">
          <PhaserGame :width="520" :height="520" />
          <div class="map-hint">
            💡 点击相邻的格子即可移动探索。每次移动消耗 1 点行动力。
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
        </div>
        <div class="panel-content panel">
          <Transition name="fade" mode="out-in">
            <Inventory v-if="activePanel === 'inventory' || !activePanel" key="inv" />
            <CraftPanel v-else-if="activePanel === 'craft'" key="craft" />
          </Transition>
        </div>
      </aside>
    </div>

    <EventDialog />
    <SaveLoadPanel />
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
  gap: 4px;
  min-width: 0;
}

.tile-name {
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--color-cthulhu-green-glow);
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
}
</style>
