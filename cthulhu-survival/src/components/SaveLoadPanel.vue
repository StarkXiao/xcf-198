<script setup lang="ts">
import { ref } from 'vue'
import { useSaveStore } from '@stores/saveStore'
import { useUiStore } from '@stores/uiStore'
import { formatDate } from '@game/utils/save'

const emit = defineEmits<{
  (e: 'loaded'): void
}>()

const saveStore = useSaveStore()
const uiStore = useUiStore()
const mode = ref<'save' | 'load'>('load')
const saveName = ref('')

function doSave(id: number) {
  const name = saveName.value.trim() || undefined
  saveStore.saveGame(id, name)
}

function doLoad(id: number) {
  const ok = saveStore.loadGame(id)
  if (ok) {
    uiStore.toggleSaveLoad()
    emit('loaded')
  }
}

function doDelete(id: number) {
  if (confirm('确定删除该存档？')) {
    saveStore.removeSave(id)
  }
}

function close() {
  uiStore.toggleSaveLoad()
}

function switchMode(m: 'save' | 'load') {
  mode.value = m
  saveStore.refresh()
}

function goTimeline() {
  uiStore.toggleSaveLoad()
  uiStore.toggleTimeline()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="uiStore.showSaveLoad" class="overlay" @click.self="close">
        <div class="panel save-panel">
          <div class="header">
            <h2>💾 存档管理</h2>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <div class="tabs">
            <button class="tab" :class="{ active: mode === 'load' }" @click="switchMode('load')">读取存档</button>
            <button class="tab" :class="{ active: mode === 'save' }" @click="switchMode('save')">保存游戏</button>
          </div>

          <div class="timeline-entry">
            <button class="timeline-btn" @click="goTimeline">
              <span class="timeline-icon">📜</span>
              <span>章节时间线与回溯</span>
            </button>
          </div>

          <div v-if="mode === 'save'" class="save-name-row">
            <input v-model="saveName" type="text" class="name-input" placeholder="存档名（可选）" maxlength="30" />
          </div>

          <div class="slot-list">
            <div
              v-for="i in 5"
              :key="i"
              class="slot"
            >
              <template v-if="saveStore.slots.find(s => s.id === i)">
                <div class="slot-info">
                  <div class="slot-header">
                    <span class="slot-name">
                      {{ saveStore.slots.find(s => s.id === i)?.name || `存档 ${i}` }}
                    </span>
                    <span class="slot-date">
                      {{ formatDate(saveStore.slots.find(s => s.id === i)!.savedAt) }}
                    </span>
                  </div>
                </div>
                <div class="slot-actions">
                  <button v-if="mode === 'load'" class="btn-primary small" @click="doLoad(i)">读取</button>
                  <button v-if="mode === 'save'" class="btn-secondary small" @click="doSave(i)">覆盖</button>
                  <button class="btn-danger small" @click="doDelete(i)">删除</button>
                </div>
              </template>
              <template v-else>
                <span class="slot-empty">空存档位</span>
                <div class="slot-actions">
                  <button v-if="mode === 'save'" class="btn-primary small" @click="doSave(i)">保存</button>
                </div>
              </template>
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

.save-panel {
  max-width: 500px;
  width: 100%;
  padding: 24px;
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

.save-name-row {
  margin-bottom: 12px;
}

.name-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
}

.name-input:focus {
  border-color: var(--color-cthulhu-green);
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.slot-info {
  flex: 1;
  min-width: 0;
}

.slot-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slot-name {
  font-size: 14px;
  font-weight: 500;
}

.slot-date {
  font-size: 11px;
  color: var(--color-text-muted);
}

.slot-empty {
  font-size: 13px;
  color: var(--color-text-muted);
}

.slot-actions {
  display: flex;
  gap: 6px;
}

.btn-primary.small,
.btn-secondary.small,
.btn-danger.small {
  padding: 6px 12px !important;
  font-size: 12px !important;
}

.btn-danger {
  background: rgba(196, 74, 74, 0.2);
  color: var(--color-danger);
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid var(--color-danger);
}

.btn-danger:hover {
  background: var(--color-danger);
  color: white;
}

.timeline-entry {
  margin-bottom: 16px;
}

.timeline-btn {
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(96, 165, 250, 0.1) 100%);
  border: 1px solid var(--color-cthulhu-green);
  border-radius: var(--radius-sm);
  color: var(--color-cthulhu-green);
  font-weight: 500;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.timeline-btn:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(96, 165, 250, 0.2) 100%);
  transform: translateY(-1px);
}

.timeline-icon {
  font-size: 16px;
}
</style>
