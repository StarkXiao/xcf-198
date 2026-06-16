<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IDENTITIES } from '@game/data/identities'
import type { Identity } from '@game/types/identity'
import { useGameStore } from '@stores/gameStore'
import { useSaveStore } from '@stores/saveStore'

const router = useRouter()
const gameStore = useGameStore()
const saveStore = useSaveStore()

const selected = ref<Identity | null>(null)
const showConfirm = ref(false)
const showSavePanel = ref(false)

function selectIdentity(id: Identity) {
  selected.value = id
}

function confirmStart() {
  if (!selected.value) return
  showConfirm.value = true
}

function startGame() {
  if (!selected.value) return
  gameStore.startGame(selected.value)
  router.push('/game')
}

function loadSlot(id: number) {
  const ok = saveStore.loadGame(id)
  if (ok) {
    showSavePanel.value = false
    router.push('/game')
  }
}
</script>

<template>
  <div class="identity-view">
    <div class="bg-ambient"></div>
    <div class="content">
      <header class="title-block">
        <h1 class="title cthulhu-glow">旧日迷踪</h1>
        <p class="subtitle">Cthulhu Survival</p>
        <p class="tagline">你于噩梦中苏醒，发现自己身处不该存在之地...</p>
      </header>

      <section v-if="!showSavePanel" class="identity-section">
        <h2 class="section-title">选择你的身份</h2>
        <div class="identity-grid">
          <button
            v-for="id in IDENTITIES"
            :key="id.id"
            class="identity-card"
            :class="{ selected: selected?.id === id.id }"
            @click="selectIdentity(id)"
          >
            <div class="identity-icon">{{ id.icon }}</div>
            <div class="identity-info">
              <h3 class="identity-name">{{ id.name }}</h3>
              <p class="identity-title">{{ id.title }}</p>
              <p class="identity-desc">{{ id.description }}</p>
              <div class="identity-stats">
                <span class="stat hp">❤️ {{ id.baseStats.maxHp }}</span>
                <span class="stat sanity">🧠 {{ id.baseStats.maxSanity }}</span>
                <span class="stat pollution">☠️ {{ id.baseStats.startPollution }}</span>
              </div>
            </div>
          </button>
        </div>

        <div class="action-row">
          <button class="btn-secondary" @click="showSavePanel = true" :disabled="!saveStore.hasAnySave">
            📂 读取存档
          </button>
          <button class="btn-primary" :disabled="!selected" @click="confirmStart">
            开始游戏
          </button>
        </div>
      </section>

      <section v-else class="save-section">
        <h2 class="section-title">读取存档</h2>
        <div class="save-list">
          <div v-if="saveStore.slots.length === 0" class="empty-saves">
            暂无存档
          </div>
          <button
            v-for="slot in saveStore.slots"
            :key="slot.id"
            class="save-slot"
            @click="loadSlot(slot.id)"
          >
            <div class="slot-info">
              <span class="slot-name">{{ slot.name }}</span>
              <span class="slot-date">{{ new Date(slot.savedAt).toLocaleString() }}</span>
            </div>
            <span class="slot-action">读取 →</span>
          </button>
        </div>
        <div class="action-row">
          <button class="btn-secondary" @click="showSavePanel = false">返回</button>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
          <div class="modal panel">
            <h3>确认进入</h3>
            <p v-if="selected" class="modal-identity">
              <span class="big-icon">{{ selected.icon }}</span>
              <span>{{ selected.name }} · {{ selected.title }}</span>
            </p>
            <p class="modal-lore" v-if="selected">「{{ selected.lore }}」</p>
            <p class="confirm-text">你确定要踏入这片诡秘之地吗？</p>
            <div class="modal-actions">
              <button class="btn-secondary" @click="showConfirm = false">再想想</button>
              <button class="btn-primary" @click="startGame">进入</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.identity-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 32px 24px;
}

.bg-ambient {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(94, 201, 138, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(138, 90, 191, 0.08) 0%, transparent 50%),
    var(--color-bg-dark);
  pointer-events: none;
  z-index: -1;
}

.content {
  max-width: 1100px;
  margin: 0 auto;
}

.title-block {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-cthulhu-green-glow);
  letter-spacing: 0.3em;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-muted);
  letter-spacing: 0.4em;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.tagline {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-style: italic;
}

.section-title {
  font-size: 20px;
  color: var(--color-text-primary);
  margin-bottom: 20px;
  text-align: center;
  letter-spacing: 0.1em;
}

.identity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.identity-card {
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  text-align: left;
  transition: all 0.25s ease;
  cursor: pointer;
  display: flex;
  gap: 16px;
}

.identity-card:hover {
  border-color: var(--color-cthulhu-green);
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-green);
}

.identity-card.selected {
  border-color: var(--color-cthulhu-green-glow);
  background: linear-gradient(135deg, var(--color-bg-panel), rgba(58, 143, 90, 0.12));
  box-shadow: var(--shadow-glow-green);
}

.identity-icon {
  font-size: 48px;
  flex-shrink: 0;
  line-height: 1;
}

.identity-info {
  flex: 1;
  min-width: 0;
}

.identity-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--color-text-primary);
}

.identity-title {
  font-size: 12px;
  color: var(--color-cthulhu-green-glow);
  margin-bottom: 8px;
}

.identity-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.identity-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
}

.stat.hp { color: #e07a7a; }
.stat.sanity { color: #7aa3e0; }
.stat.pollution { color: #c98a5e; }

.action-row {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.save-section {
  max-width: 500px;
  margin: 0 auto;
}

.save-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.save-slot {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  color: var(--color-text-primary);
  cursor: pointer;
}

.save-slot:hover {
  border-color: var(--color-cthulhu-green);
  background: var(--color-bg-card);
}

.slot-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.slot-name {
  font-size: 14px;
  font-weight: 500;
}

.slot-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.slot-action {
  font-size: 13px;
  color: var(--color-cthulhu-green-glow);
}

.empty-saves {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal {
  max-width: 480px;
  width: 100%;
  padding: 28px;
}

.modal h3 {
  font-size: 20px;
  text-align: center;
  margin-bottom: 20px;
  color: var(--color-cthulhu-green-glow);
}

.modal-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.big-icon {
  font-size: 36px;
}

.modal-lore {
  font-size: 13px;
  font-style: italic;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-cthulhu-green);
}

.confirm-text {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
}
</style>
