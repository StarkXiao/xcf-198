<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { useUiStore } from '@stores/uiStore'
import { formatSnapshotDate } from '@game/utils/snapshot'
import type { ChapterSnapshot } from '@game/types/snapshot'

const emit = defineEmits<{
  (e: 'rewound'): void
}>()

const gameStore = useGameStore()
const uiStore = useUiStore()
const activeTab = ref<'timeline' | 'records'>('timeline')
const selectedSnapshot = ref<ChapterSnapshot | null>(null)
const confirmRewind = ref(false)

const snapshots = computed(() => {
  return gameStore.getSnapshots()
})

const permanentRecords = computed(() => {
  return gameStore.getPermanentRecords()
})

const currentSnapshotId = computed(() => {
  return gameStore.getCurrentSnapshotId()
})

function close() {
  uiStore.toggleTimeline()
}

function selectSnapshot(snapshot: ChapterSnapshot) {
  selectedSnapshot.value = snapshot
  confirmRewind.value = false
}

function doRewind() {
  if (!selectedSnapshot.value) return
  const ok = gameStore.rewindToSnapshotById(selectedSnapshot.value.id)
  if (ok) {
    emit('rewound')
    close()
  }
}

function doDelete(snapshotId: string, event: Event) {
  event.stopPropagation()
  if (confirm('确定删除此时间节点？')) {
    gameStore.removeSnapshot(snapshotId)
    if (selectedSnapshot.value?.id === snapshotId) {
      selectedSnapshot.value = null
    }
  }
}

function switchTab(tab: 'timeline' | 'records') {
  activeTab.value = tab
}

function getPhaseText(phase: 'day' | 'night'): string {
  return phase === 'day' ? '☀️ 白天' : '🌙 夜晚'
}

function getSnapshotTypeLabel(type: 'auto' | 'manual'): string {
  return type === 'auto' ? '自动' : '手动'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="uiStore.showTimeline" class="overlay" @click.self="close">
        <div class="panel timeline-panel">
          <div class="header">
            <h2>📜 时间回溯</h2>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <div class="tabs">
            <button class="tab" :class="{ active: activeTab === 'timeline' }" @click="switchTab('timeline')">
              时间线
            </button>
            <button class="tab" :class="{ active: activeTab === 'records' }" @click="switchTab('records')">
              永久记录
            </button>
          </div>

          <div v-if="activeTab === 'timeline'" class="timeline-content">
            <div class="timeline-list">
              <div v-if="snapshots.length === 0" class="empty-state">
                <p class="empty-icon">📖</p>
                <p>暂无时间节点</p>
                <p class="empty-hint">在关键事件中做出抉择后会自动记录</p>
              </div>
              <div
                v-for="snapshot in snapshots"
                :key="snapshot.id"
                class="timeline-item"
                :class="{
                  active: snapshot.id === currentSnapshotId,
                  selected: selectedSnapshot?.id === snapshot.id,
                }"
                @click="selectSnapshot(snapshot)"
              >
                <div class="timeline-dot"></div>
                <div class="timeline-info">
                  <div class="timeline-header">
                    <span class="timeline-title">{{ snapshot.eventTitle }}</span>
                    <span class="timeline-type" :class="snapshot.snapshotType">
                      {{ getSnapshotTypeLabel(snapshot.snapshotType) }}
                    </span>
                  </div>
                  <div class="timeline-meta">
                    <span>第 {{ snapshot.day }} 天</span>
                    <span>{{ getPhaseText(snapshot.phase) }}</span>
                    <span>{{ formatSnapshotDate(snapshot.timestamp) }}</span>
                  </div>
                  <div v-if="snapshot.choiceMade" class="timeline-choice">
                    <span class="choice-label">选择：</span>
                    <span class="choice-text" :class="{ failed: !snapshot.choiceMade.success }">
                      {{ snapshot.choiceMade.choiceText }}
                      <span v-if="!snapshot.choiceMade.success" class="failure-tag">失败</span>
                    </span>
                  </div>
                </div>
                <button class="delete-btn" @click="doDelete(snapshot.id, $event)" title="删除">
                  🗑️
                </button>
              </div>
            </div>

            <div v-if="selectedSnapshot" class="snapshot-detail">
              <h3>{{ selectedSnapshot.eventTitle }}</h3>
              <p class="snapshot-desc">{{ selectedSnapshot.eventDescription }}</p>
              <div class="snapshot-stats">
                <div class="stat-item">
                  <span class="stat-label">天数</span>
                  <span class="stat-value">第 {{ selectedSnapshot.day }} 天</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">时段</span>
                  <span class="stat-value">{{ getPhaseText(selectedSnapshot.phase) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">生命</span>
                  <span class="stat-value">{{ selectedSnapshot.state.stats.hp }}/{{ selectedSnapshot.state.stats.maxHp }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">理智</span>
                  <span class="stat-value">{{ selectedSnapshot.state.stats.sanity }}/{{ selectedSnapshot.state.stats.maxSanity }}</span>
                </div>
              </div>
              <div v-if="selectedSnapshot.choiceMade" class="selected-choice">
                <span class="choice-label">当时的选择：</span>
                <span class="choice-text" :class="{ failed: !selectedSnapshot.choiceMade.success }">
                  {{ selectedSnapshot.choiceMade.choiceText }}
                  <span v-if="!selectedSnapshot.choiceMade.success" class="failure-tag">失败</span>
                </span>
              </div>

              <div v-if="!confirmRewind" class="rewind-actions">
                <button class="btn-primary" @click="confirmRewind = true">
                  ⏪ 回退到此节点
                </button>
              </div>
              <div v-else class="rewind-confirm">
                <p class="warning-text">⚠️ 确定要回退到此节点吗？</p>
                <p class="warning-sub">之后的所有进度将会丢失，但永久解锁记录会保留。</p>
                <div class="confirm-buttons">
                  <button class="btn-secondary" @click="confirmRewind = false">取消</button>
                  <button class="btn-danger" @click="doRewind">确认回退</button>
                </div>
              </div>
            </div>
            <div v-else class="detail-placeholder">
              <p>选择一个时间节点查看详情</p>
            </div>
          </div>

          <div v-if="activeTab === 'records'" class="records-content">
            <div class="record-section">
              <h3>🏆 解锁的结局</h3>
              <div v-if="permanentRecords.unlockedEndings.length === 0" class="record-empty">
                尚未解锁任何结局
              </div>
              <div v-else class="record-list">
                <span v-for="ending in permanentRecords.unlockedEndings" :key="ending" class="record-item">
                  {{ ending }}
                </span>
              </div>
            </div>

            <div class="record-section">
              <h3>🗺️ 发现的区域</h3>
              <div class="record-count">
                共发现 {{ permanentRecords.discoveredTiles.length }} 个区域
              </div>
            </div>

            <div class="record-section">
              <h3>📖 经历的事件</h3>
              <div class="record-count">
                共经历 {{ permanentRecords.triggeredEvents.length }} 个事件
              </div>
            </div>

            <div class="record-section">
              <h3>⚗️ 解锁的配方</h3>
              <div v-if="permanentRecords.unlockedRecipes.length === 0" class="record-empty">
                尚未解锁特殊配方
              </div>
              <div v-else class="record-list">
                <span v-for="recipe in permanentRecords.unlockedRecipes" :key="recipe" class="record-item">
                  {{ recipe }}
                </span>
              </div>
            </div>

            <div class="record-section">
              <h3>🏅 成就</h3>
              <div v-if="permanentRecords.completedAchievements.length === 0" class="record-empty">
                尚未获得成就
              </div>
              <div v-else class="achievement-list">
                <div v-for="achievement in permanentRecords.completedAchievements" :key="achievement.id" class="achievement-item">
                  <span class="achievement-icon">{{ achievement.icon }}</span>
                  <div class="achievement-info">
                    <span class="achievement-name">{{ achievement.name }}</span>
                    <span class="achievement-desc">{{ achievement.description }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="record-note">
              💡 以上记录会永久保留，即使回退时间线也不会丢失。
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.timeline-panel {
  max-width: 800px;
  width: 100%;
  max-height: 85vh;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.header h2 {
  font-size: 20px;
  color: var(--color-cthulhu-green-glow);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 14px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-danger);
  color: white;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  padding: 4px;
}

.tab {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.tab.active {
  background: var(--color-cthulhu-green);
  color: white;
  font-weight: 600;
}

.timeline-content {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.timeline-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  position: relative;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--color-border);
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  margin-left: 0;
  margin-bottom: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.timeline-item:hover {
  border-color: var(--color-cthulhu-green);
  background: rgba(0, 255, 128, 0.05);
}

.timeline-item.selected {
  border-color: var(--color-cthulhu-green);
  background: rgba(0, 255, 128, 0.1);
}

.timeline-item.active {
  border-color: var(--color-cthulhu-green-glow);
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-cthulhu-green);
  border: 2px solid var(--color-bg-card);
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

.timeline-item.active .timeline-dot {
  background: var(--color-cthulhu-green-glow);
  box-shadow: 0 0 10px var(--color-cthulhu-green-glow);
}

.timeline-info {
  flex: 1;
  min-width: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timeline-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.timeline-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.timeline-type.auto {
  background: rgba(100, 100, 100, 0.3);
  color: var(--color-text-muted);
}

.timeline-type.manual {
  background: rgba(0, 255, 128, 0.2);
  color: var(--color-cthulhu-green);
}

.timeline-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.timeline-choice {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.choice-label {
  color: var(--color-text-muted);
}

.choice-text.failed {
  color: var(--color-danger);
}

.failure-tag {
  font-size: 10px;
  margin-left: 4px;
  color: var(--color-danger);
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 14px;
  padding: 4px;
}

.timeline-item:hover .delete-btn {
  opacity: 1;
}

.snapshot-detail {
  width: 280px;
  flex-shrink: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.snapshot-detail h3 {
  font-size: 16px;
  color: var(--color-cthulhu-green);
  margin-bottom: 8px;
}

.snapshot-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 16px;
}

.snapshot-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: var(--radius-sm);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.selected-choice {
  padding: 10px;
  background: rgba(0, 255, 128, 0.1);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 13px;
}

.rewind-actions {
  margin-top: auto;
}

.rewind-confirm {
  margin-top: auto;
  padding: 12px;
  background: rgba(196, 74, 74, 0.1);
  border: 1px solid rgba(196, 74, 74, 0.3);
  border-radius: var(--radius-sm);
}

.warning-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-danger);
  margin-bottom: 4px;
}

.warning-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.confirm-buttons {
  display: flex;
  gap: 8px;
}

.confirm-buttons button {
  flex: 1;
}

.detail-placeholder {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: 13px;
}

.records-content {
  flex: 1;
  overflow-y: auto;
}

.record-section {
  margin-bottom: 20px;
  padding: 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.record-section h3 {
  font-size: 14px;
  color: var(--color-text-primary);
  margin-bottom: 10px;
}

.record-count {
  font-size: 13px;
  color: var(--color-cthulhu-green);
  font-weight: 500;
}

.record-empty {
  font-size: 12px;
  color: var(--color-text-muted);
}

.record-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.record-item {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(0, 255, 128, 0.1);
  color: var(--color-cthulhu-green);
  border-radius: 4px;
  font-size: 12px;
}

.record-note {
  margin-top: 20px;
  padding: 12px;
  background: rgba(0, 255, 128, 0.05);
  border: 1px solid rgba(0, 255, 128, 0.2);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(241, 196, 15, 0.08);
  border: 1px solid rgba(241, 196, 15, 0.2);
  border-radius: var(--radius-sm);
}

.achievement-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.achievement-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.achievement-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-primary {
  background: var(--color-cthulhu-green);
  color: white;
}

.btn-primary:hover {
  background: var(--color-cthulhu-green-glow);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-cthulhu-green);
}

.btn-danger {
  background: rgba(196, 74, 74, 0.2);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
}

.btn-danger:hover {
  background: var(--color-danger);
  color: white;
}
</style>
