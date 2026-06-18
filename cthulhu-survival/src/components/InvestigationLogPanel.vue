<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { useUiStore } from '@stores/uiStore'
import { storeToRefs } from 'pinia'
import { LOG_CATEGORY_META } from '@game/types/investigationLog'
import type { LogCategory, InvestigationEntry } from '@game/types/investigationLog'

const gameStore = useGameStore()
const uiStore = useUiStore()
const { investigationLog, investigationUnreadCount } = storeToRefs(gameStore)

const activeCategory = ref<LogCategory | 'all'>('all')
const searchQuery = ref('')
const selectedEntry = ref<InvestigationEntry | null>(null)
const showLinkedClues = ref(false)

const filteredEntries = computed(() => {
  let entries = investigationLog.value.entries

  if (activeCategory.value !== 'all') {
    entries = entries.filter(e => e.category === activeCategory.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    entries = entries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  return [...entries].sort((a, b) => b.timestamp - a.timestamp)
})

const categoryCounts = computed(() => {
  const counts: Record<string, number> = { all: investigationLog.value.entries.length }
  for (const cat of ['clue', 'rumor', 'observation', 'anomaly'] as LogCategory[]) {
    counts[cat] = investigationLog.value.entries.filter(e => e.category === cat).length
  }
  return counts
})

const linkedClues = computed(() => {
  return investigationLog.value.linkedClues
})

const relatedEntries = computed(() => {
  if (!selectedEntry.value) return []
  return gameStore.getInvestigationRelatedEntries(selectedEntry.value.id)
})

function selectEntry(entry: InvestigationEntry) {
  selectedEntry.value = entry
  if (!entry.isRead) {
    gameStore.markInvestigationEntryAsRead(entry.id)
  }
}

function markAllRead() {
  gameStore.markAllInvestigationEntriesAsRead()
}

function close() {
  uiStore.toggleInvestigationLog()
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    event: '事件',
    scout: '侦查',
    merchant: '商贩',
    night: '夜间',
    craft: '合成',
    quest: '任务',
    system: '系统',
  }
  return labels[source] || source
}

function getPhaseText(phase: 'day' | 'night'): string {
  return phase === 'day' ? '☀️' : '🌙'
}

function getCategoryStyle(category: LogCategory) {
  const meta = LOG_CATEGORY_META[category]
  return {
    borderColor: meta.color,
    color: meta.color,
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="uiStore.showInvestigationLog" class="overlay" @click.self="close">
        <div class="panel log-panel">
          <div class="header">
            <h2>🔎 调查日志</h2>
            <div class="header-actions">
              <span v-if="investigationUnreadCount > 0" class="unread-badge">
                {{ investigationUnreadCount }} 条未读
              </span>
              <button v-if="investigationUnreadCount > 0" class="mark-read-btn" @click="markAllRead">
                全部已读
              </button>
              <button class="close-btn" @click="close">✕</button>
            </div>
          </div>

          <div class="toolbar">
            <div class="category-tabs">
              <button
                class="cat-tab"
                :class="{ active: activeCategory === 'all' }"
                @click="activeCategory = 'all'"
              >
                全部
                <span class="cat-count">{{ categoryCounts.all }}</span>
              </button>
              <button
                v-for="(meta, cat) in LOG_CATEGORY_META"
                :key="cat"
                class="cat-tab"
                :class="{ active: activeCategory === cat }"
                :style="activeCategory === cat ? { background: meta.color, borderColor: meta.color } : {}"
                @click="activeCategory = cat as LogCategory"
              >
                {{ meta.icon }} {{ meta.label }}
                <span class="cat-count">{{ categoryCounts[cat] || 0 }}</span>
              </button>
            </div>
            <div class="search-row">
              <input
                v-model="searchQuery"
                class="search-input"
                type="text"
                placeholder="搜索日志内容..."
              />
            </div>
          </div>

          <div class="log-content">
            <div class="entry-list">
              <div v-if="filteredEntries.length === 0" class="empty-state">
                <p class="empty-icon">📖</p>
                <p>暂无调查记录</p>
                <p class="empty-hint">在探索中遇到事件、侦查区域、与商人交易时会自动归档</p>
              </div>
              <div
                v-for="entry in filteredEntries"
                :key="entry.id"
                class="entry-item"
                :class="{ selected: selectedEntry?.id === entry.id, unread: !entry.isRead }"
                @click="selectEntry(entry)"
              >
                <div class="entry-indicator" :style="{ background: LOG_CATEGORY_META[entry.category].color }"></div>
                <div class="entry-body">
                  <div class="entry-head">
                    <span class="entry-icon">{{ LOG_CATEGORY_META[entry.category].icon }}</span>
                    <span class="entry-title">{{ entry.title }}</span>
                    <span v-if="!entry.isRead" class="unread-dot"></span>
                  </div>
                  <div class="entry-meta">
                    <span>第{{ entry.day }}天</span>
                    <span>{{ getPhaseText(entry.phase) }}</span>
                    <span class="source-tag">{{ getSourceLabel(entry.source) }}</span>
                  </div>
                  <div class="entry-tags">
                    <span v-for="tag in entry.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>
                <div class="entry-importance">
                  <span v-for="i in entry.importance" :key="i" class="importance-star">★</span>
                </div>
              </div>
            </div>

            <div class="entry-detail">
              <template v-if="selectedEntry">
                <div class="detail-header">
                  <span class="detail-icon">{{ LOG_CATEGORY_META[selectedEntry.category].icon }}</span>
                  <div class="detail-title-area">
                    <h3 class="detail-title">{{ selectedEntry.title }}</h3>
                    <span class="detail-category" :style="getCategoryStyle(selectedEntry.category)">
                      {{ LOG_CATEGORY_META[selectedEntry.category].label }}
                    </span>
                  </div>
                </div>

                <div class="detail-meta">
                  <span>第{{ selectedEntry.day }}天 {{ getPhaseText(selectedEntry.phase) }}</span>
                  <span>来源: {{ getSourceLabel(selectedEntry.source) }}</span>
                  <span v-if="selectedEntry.locationName">📍 {{ selectedEntry.locationName }}</span>
                </div>

                <div class="detail-content">
                  <p v-for="(line, i) in selectedEntry.content.split('\n')" :key="i">{{ line }}</p>
                </div>

                <div class="detail-tags">
                  <span v-for="tag in selectedEntry.tags" :key="tag" class="detail-tag">{{ tag }}</span>
                </div>

                <div v-if="relatedEntries.length > 0" class="related-section">
                  <h4>🔗 关联记录</h4>
                  <div
                    v-for="re in relatedEntries"
                    :key="re.id"
                    class="related-item"
                    @click="selectEntry(re)"
                  >
                    <span class="related-icon">{{ LOG_CATEGORY_META[re.category].icon }}</span>
                    <span class="related-title">{{ re.title }}</span>
                    <span class="related-day">第{{ re.day }}天</span>
                  </div>
                </div>

                <div v-if="selectedEntry.importance >= 2" class="importance-badge">
                  <span v-for="i in selectedEntry.importance" :key="i">★</span>
                  重要程度: {{ selectedEntry.importance }}/3
                </div>
              </template>
              <div v-else class="detail-placeholder">
                <p>🔍 选择一条记录查看详情</p>
              </div>
            </div>
          </div>

          <div v-if="linkedClues.length > 0" class="linked-clues-section">
            <button class="clues-toggle" @click="showLinkedClues = !showLinkedClues">
              🔗 关联线索 ({{ linkedClues.length }})
              <span :class="{ 'arrow-down': showLinkedClues, 'arrow-right': !showLinkedClues }">▸</span>
            </button>
            <div v-if="showLinkedClues" class="clues-list">
              <div
                v-for="clue in linkedClues"
                :key="clue.id"
                class="clue-item"
                :class="{ completed: clue.completed }"
              >
                <span class="clue-status">{{ clue.completed ? '✅' : '🔄' }}</span>
                <div class="clue-info">
                  <span class="clue-title">{{ clue.title }}</span>
                  <span class="clue-desc">{{ clue.description }}</span>
                  <span class="clue-progress">{{ clue.entryIds.length }} 条记录关联</span>
                </div>
              </div>
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

.log-panel {
  max-width: 900px;
  width: 100%;
  max-height: 88vh;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h2 {
  font-size: 20px;
  color: var(--color-cthulhu-green-glow);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unread-badge {
  font-size: 12px;
  padding: 3px 10px;
  background: rgba(196, 74, 74, 0.2);
  color: var(--color-danger);
  border-radius: 12px;
  border: 1px solid rgba(196, 74, 74, 0.3);
  font-weight: 600;
}

.mark-read-btn {
  font-size: 12px;
  padding: 4px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.mark-read-btn:hover {
  border-color: var(--color-cthulhu-green);
  color: var(--color-cthulhu-green);
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

.toolbar {
  margin-bottom: 14px;
}

.category-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  padding: 4px;
  overflow-x: auto;
}

.cat-tab {
  padding: 7px 12px;
  font-size: 12px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cat-tab.active {
  background: var(--color-cthulhu-green);
  color: white;
  font-weight: 600;
}

.cat-tab:not(.active):hover {
  background: var(--color-bg-hover);
}

.cat-count {
  font-size: 10px;
  opacity: 0.7;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 8px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-input:focus {
  border-color: var(--color-cthulhu-green);
}

.log-content {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.entry-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.entry-item:hover {
  border-color: var(--color-cthulhu-green);
  background: rgba(0, 255, 128, 0.05);
}

.entry-item.selected {
  border-color: var(--color-cthulhu-green);
  background: rgba(0, 255, 128, 0.1);
}

.entry-item.unread {
  background: rgba(94, 201, 138, 0.06);
  border-left: 2px solid var(--color-cthulhu-green);
}

.entry-indicator {
  width: 4px;
  min-height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 2px;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.entry-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.entry-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-cthulhu-green-glow);
  flex-shrink: 0;
  animation: dot-pulse 2s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.entry-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.source-tag {
  padding: 1px 6px;
  background: rgba(90, 122, 191, 0.15);
  color: var(--color-info);
  border-radius: 3px;
  font-size: 10px;
}

.entry-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(138, 90, 191, 0.12);
  color: var(--color-purple);
  border-radius: 3px;
}

.entry-importance {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
  margin-top: 2px;
}

.importance-star {
  color: var(--color-warning);
  font-size: 10px;
  line-height: 1;
}

.entry-detail {
  width: 300px;
  flex-shrink: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.detail-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.detail-title-area {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-size: 16px;
  color: var(--color-cthulhu-green);
  margin-bottom: 4px;
  line-height: 1.3;
}

.detail-category {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 4px;
  font-weight: 600;
}

.detail-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.detail-content {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.8;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-border);
  white-space: pre-wrap;
}

.detail-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-tag {
  font-size: 11px;
  padding: 3px 10px;
  background: rgba(138, 90, 191, 0.12);
  color: var(--color-purple);
  border-radius: 4px;
  border: 1px solid rgba(138, 90, 191, 0.2);
}

.related-section {
  padding: 12px;
  background: rgba(94, 201, 138, 0.05);
  border: 1px solid rgba(94, 201, 138, 0.15);
  border-radius: var(--radius-sm);
}

.related-section h4 {
  font-size: 13px;
  color: var(--color-cthulhu-green-glow);
  margin-bottom: 8px;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--color-bg-card);
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.related-item:hover {
  background: var(--color-bg-hover);
}

.related-icon {
  font-size: 14px;
}

.related-title {
  font-size: 12px;
  color: var(--color-text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-day {
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.importance-badge {
  font-size: 12px;
  color: var(--color-warning);
  padding: 8px 12px;
  background: rgba(217, 165, 76, 0.08);
  border: 1px solid rgba(217, 165, 76, 0.2);
  border-radius: var(--radius-sm);
  text-align: center;
}

.importance-badge span {
  margin-right: 2px;
}

.detail-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.linked-clues-section {
  margin-top: 12px;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.clues-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-cthulhu-green-glow);
  font-weight: 600;
  padding: 6px 0;
  transition: color 0.2s;
}

.clues-toggle:hover {
  color: var(--color-cthulhu-green);
}

.arrow-down {
  transform: rotate(90deg);
  transition: transform 0.2s;
}

.arrow-right {
  transition: transform 0.2s;
}

.clues-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.clue-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.clue-item.completed {
  border-color: rgba(94, 201, 138, 0.3);
  background: rgba(94, 201, 138, 0.05);
}

.clue-status {
  font-size: 18px;
  flex-shrink: 0;
}

.clue-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.clue-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.clue-desc {
  font-size: 11px;
  color: var(--color-text-muted);
}

.clue-progress {
  font-size: 10px;
  color: var(--color-cthulhu-green);
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
</style>
