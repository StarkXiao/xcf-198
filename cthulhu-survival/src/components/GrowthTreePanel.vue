<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import type { GrowthNode, GrowthBranch } from '@game/types/growthTree'

const gameStore = useGameStore()
const { growthTree, growthProgress, availableGrowthNodes, newUnlockNotification, state } = storeToRefs(gameStore)

const selectedNode = ref<GrowthNode | null>(null)
const selectedBranch = ref<string | null>(null)

const nodesByBranch = computed(() => {
  if (!growthTree.value) return {}
  const result: Record<string, GrowthNode[]> = {}
  for (const branch of growthTree.value.branches) {
    result[branch.id] = growthTree.value.nodes.filter(n => n.branch === branch.id)
  }
  return result
})

const isNodeUnlocked = (nodeId: string) => {
  return growthProgress.value?.unlockedNodes.includes(nodeId) ?? false
}

const getNodeCooldown = (nodeId: string) => {
  return growthProgress.value?.activeNodeCooldowns[nodeId] ?? 0
}

const isNodeAvailable = (nodeId: string) => {
  return availableGrowthNodes.value.some(n => n.id === nodeId)
}

const getNodeUnlockStatus = (node: GrowthNode) => {
  return gameStore.checkGrowthNodeUnlock(node.id)
}

const getBranchColor = (branchId: string) => {
  const branch = growthTree.value?.branches.find(b => b.id === branchId)
  return branch?.color || '#888'
}

const getBranchInfo = (branchId: string): GrowthBranch | undefined => {
  return growthTree.value?.branches.find(b => b.id === branchId)
}

function selectNode(node: GrowthNode) {
  selectedNode.value = node
}

function unlockNode(node: GrowthNode) {
  if (!isNodeAvailable(node.id)) return
  gameStore.unlockGrowthNode(node.id)
}

function useActiveNode(node: GrowthNode) {
  if (node.type !== 'active') return
  if (!isNodeUnlocked(node.id)) return
  gameStore.useActiveGrowthNode(node.id)
}

function getEffectDescription(node: GrowthNode): string {
  if (node.effect) {
    const effectMap: Record<string, string> = {
      reduce_pollution_gain: `污染获取降低 ${Math.round(node.effect.value * 100)}%`,
      reduce_hunger_rate: `饥饿消耗降低 ${Math.round(node.effect.value * 100)}%`,
      increase_action_points: `行动力 +${node.effect.value}`,
      bonus_sanity_recovery: `理智恢复 +${node.effect.value}`,
      bonus_craft_success: `成功率提升 ${Math.round(node.effect.value * 100)}%`,
      reduce_damage_taken: `伤害降低 ${Math.round(node.effect.value * 100)}%`,
      start_with_item: `初始物品`,
      reveal_map_area: `揭示地图区域`,
    }
    return effectMap[node.effect.type] || node.description
  }
  return node.description
}

watch(newUnlockNotification, (val) => {
  if (val && growthTree.value) {
    const node = growthTree.value.nodes.find(n => n.id === val)
    if (node) {
      selectedNode.value = node
    }
  }
})
</script>

<template>
  <div class="growth-tree-panel" v-if="growthTree">
    <div class="panel-header">
      <h3 class="panel-title">🌳 {{ growthTree.name }}</h3>
      <p class="panel-desc">{{ growthTree.description }}</p>
    </div>

    <div class="branches-tabs">
      <button
        v-for="branch in growthTree.branches"
        :key="branch.id"
        class="branch-tab"
        :class="{ active: selectedBranch === branch.id || (!selectedBranch) }"
        :style="{ borderColor: branch.color, color: selectedBranch === branch.id || (!selectedBranch) ? branch.color : '' }"
        @click="selectedBranch = selectedBranch === branch.id ? null : branch.id"
      >
        <span class="branch-icon">{{ branch.icon }}</span>
        <span class="branch-name">{{ branch.name }}</span>
      </button>
    </div>

    <div class="branches-container">
      <div
        v-for="branch in growthTree.branches"
        :key="branch.id"
        class="branch-column"
        :class="{ collapsed: selectedBranch && selectedBranch !== branch.id }"
      >
        <div class="branch-header" :style="{ borderLeftColor: branch.color }">
          <span class="branch-header-icon">{{ branch.icon }}</span>
          <span class="branch-header-name">{{ branch.name }}</span>
        </div>
        <p class="branch-description">{{ branch.description }}</p>

        <div class="nodes-tree">
          <template v-for="tier in [0, 1, 2, 3]" :key="tier">
            <div class="tier-row">
              <div class="tier-label" v-if="tier === 0">基础</div>
              <div class="tier-label" v-else-if="tier === 1">进阶</div>
              <div class="tier-label" v-else-if="tier === 2">精通</div>
              <div class="tier-label" v-else>终极</div>

              <div class="tier-nodes">
                <div
                  v-for="node in (nodesByBranch[branch.id] || []).filter(n => n.tier === tier)"
                  :key="node.id"
                  class="growth-node"
                  :class="{
                    unlocked: isNodeUnlocked(node.id),
                    available: isNodeAvailable(node.id),
                    locked: !isNodeUnlocked(node.id) && !isNodeAvailable(node.id),
                    selected: selectedNode?.id === node.id,
                    newly: newUnlockNotification === node.id,
                  }"
                  :style="{ borderColor: branch.color, boxShadow: isNodeUnlocked(node.id) ? `0 0 12px ${branch.color}40` : '' }"
                  @click="selectNode(node)"
                >
                  <div class="node-icon">{{ node.icon }}</div>
                  <div class="node-name">{{ node.name }}</div>
                  <div class="node-type-badge" :class="node.type">
                    {{ node.type === 'active' ? '主动' : '被动' }}
                  </div>
                  <div
                    v-if="node.type === 'active' && isNodeUnlocked(node.id) && getNodeCooldown(node.id) > 0"
                    class="cooldown-badge"
                  >
                    {{ getNodeCooldown(node.id) }}阶段
                  </div>
                  <div
                    v-if="isNodeAvailable(node.id) && !isNodeUnlocked(node.id)"
                    class="unlock-hint"
                  >
                    ✨ 可解锁
                  </div>
                </div>
              </div>
            </div>
            <div class="connector-line" v-if="tier < 3" :style="{ background: branch.color + '40' }"></div>
          </template>
        </div>
      </div>
    </div>

    <div class="node-detail panel" v-if="selectedNode">
      <div class="detail-header" :style="{ borderLeftColor: getBranchColor(selectedNode.branch) }">
        <div class="detail-icon">{{ selectedNode.icon }}</div>
        <div class="detail-title-group">
          <h4 class="detail-name">{{ selectedNode.name }}</h4>
          <div class="detail-meta">
            <span class="detail-type" :class="selectedNode.type">
              {{ selectedNode.type === 'active' ? '⚡ 主动能力' : '💫 被动能力' }}
            </span>
            <span class="detail-tier">
              {{ ['基础', '进阶', '精通', '终极'][selectedNode.tier] }}
            </span>
            <span class="detail-branch" :style="{ color: getBranchColor(selectedNode.branch) }">
              {{ getBranchInfo(selectedNode.branch)?.icon }} {{ getBranchInfo(selectedNode.branch)?.name }}
            </span>
          </div>
        </div>
      </div>

      <div class="detail-description">
        {{ selectedNode.description }}
      </div>

      <div class="detail-effect" v-if="selectedNode.type === 'passive'">
        <span class="effect-label">效果:</span>
        <span class="effect-value">{{ getEffectDescription(selectedNode) }}</span>
      </div>

      <div class="detail-cooldown" v-if="selectedNode.type === 'active' && selectedNode.activeCooldown">
        <span class="cooldown-label">冷却:</span>
        <span class="cooldown-value">{{ selectedNode.activeCooldown }} 阶段</span>
        <span
          v-if="isNodeUnlocked(selectedNode.id)"
          class="current-cooldown"
          :class="{ ready: getNodeCooldown(selectedNode.id) === 0 }"
        >
          当前: {{ getNodeCooldown(selectedNode.id) === 0 ? '就绪' : getNodeCooldown(selectedNode.id) + ' 阶段后' }}
        </span>
      </div>

      <div class="detail-lore" v-if="selectedNode.lore">
        <span class="lore-quote">「</span>
        <span class="lore-text">{{ selectedNode.lore }}</span>
        <span class="lore-quote">」</span>
      </div>

      <div class="unlock-conditions" v-if="!isNodeUnlocked(selectedNode.id)">
        <h5 class="conditions-title">🔓 解锁条件</h5>
        <div class="conditions-list">
          <div
            v-for="(cond, idx) in getNodeUnlockStatus(selectedNode).missingConditions.length > 0
              ? selectedNode.unlockConditions
              : selectedNode.unlockConditions"
            :key="idx"
            class="condition-item"
            :class="{
              satisfied: !getNodeUnlockStatus(selectedNode).missingConditions.includes(
                selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].eventId
                  ? `触发事件: ${selectedNode.unlockConditions[idx].eventId}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].flagKey
                  ? `设置标记: ${selectedNode.unlockConditions[idx].flagKey}${selectedNode.unlockConditions[idx].flagValue !== undefined ? ' = ' + String(selectedNode.unlockConditions[idx].flagValue) : ''}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].endingId
                  ? `解锁结局: ${selectedNode.unlockConditions[idx].endingId}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].exploreCount
                  ? `探索区域数量: ${growthProgress?.discoveredTiles?.length || 0}/${selectedNode.unlockConditions[idx].exploreCount}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].day
                  ? `存活天数: ${state?.time?.day || 0}/${selectedNode.unlockConditions[idx].day}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].factionId
                  ? `${selectedNode.unlockConditions[idx].factionId}声望: xxx`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].nodeId
                  ? `解锁前置能力: ${selectedNode.unlockConditions[idx].nodeId}`
                  : '未知条件'
              )
            }"
          >
            <span class="condition-check">
              {{ !getNodeUnlockStatus(selectedNode).missingConditions.includes(
                selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].eventId
                  ? `触发事件: ${selectedNode.unlockConditions[idx].eventId}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].flagKey
                  ? `设置标记: ${selectedNode.unlockConditions[idx].flagKey}${selectedNode.unlockConditions[idx].flagValue !== undefined ? ' = ' + String(selectedNode.unlockConditions[idx].flagValue) : ''}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].endingId
                  ? `解锁结局: ${selectedNode.unlockConditions[idx].endingId}`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].exploreCount
                  ? `探索区域数量: xxx`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].day
                  ? `存活天数: xxx`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].factionId
                  ? `${selectedNode.unlockConditions[idx].factionId}声望: xxx`
                  : selectedNode.unlockConditions[idx] && selectedNode.unlockConditions[idx].nodeId
                  ? `解锁前置能力: ${selectedNode.unlockConditions[idx].nodeId}`
                  : '未知条件'
              ) ? '✅' : '⬜' }}
            </span>
            <span class="condition-text">
              <template v-if="selectedNode.unlockConditions[idx]?.type === 'event_triggered'">
                触发事件: {{ selectedNode.unlockConditions[idx].eventId }}
              </template>
              <template v-else-if="selectedNode.unlockConditions[idx]?.type === 'flag_set'">
                设置标记: {{ selectedNode.unlockConditions[idx].flagKey }}
                <span v-if="selectedNode.unlockConditions[idx].flagValue !== undefined">
                  = {{ String(selectedNode.unlockConditions[idx].flagValue) }}
                </span>
              </template>
              <template v-else-if="selectedNode.unlockConditions[idx]?.type === 'ending_unlocked'">
                解锁结局: {{ selectedNode.unlockConditions[idx].endingId }}
              </template>
              <template v-else-if="selectedNode.unlockConditions[idx]?.type === 'explore_count'">
                探索区域数量: {{ state?.discoveredTiles?.length || 0 }} / {{ selectedNode.unlockConditions[idx].exploreCount }}
              </template>
              <template v-else-if="selectedNode.unlockConditions[idx]?.type === 'day_reach'">
                存活天数: {{ state?.time?.day || 0 }} / {{ selectedNode.unlockConditions[idx].day }}
              </template>
              <template v-else-if="selectedNode.unlockConditions[idx]?.type === 'reputation_threshold'">
                {{ selectedNode.unlockConditions[idx].factionId }}声望 ≥ {{ selectedNode.unlockConditions[idx].value }}
              </template>
              <template v-else-if="selectedNode.unlockConditions[idx]?.type === 'node_unlocked'">
                解锁前置能力: {{ growthTree.nodes.find(n => n.id === selectedNode.unlockConditions[idx]?.nodeId)?.name || selectedNode.unlockConditions[idx].nodeId }}
              </template>
            </span>
          </div>
        </div>
        <div class="conditions-progress">
          进度: {{ getNodeUnlockStatus(selectedNode).satisfiedConditions }} / {{ getNodeUnlockStatus(selectedNode).totalConditions }}
          <span v-if="selectedNode.requiresAllConditions === false">（满足任一即可）</span>
          <span v-else>（需全部满足）</span>
        </div>
      </div>

      <div class="detail-actions">
        <button
          v-if="!isNodeUnlocked(selectedNode.id)"
          class="btn-primary unlock-btn"
          :class="{ disabled: !isNodeAvailable(selectedNode.id) }"
          :disabled="!isNodeAvailable(selectedNode.id)"
          @click="unlockNode(selectedNode)"
        >
          {{ isNodeAvailable(selectedNode.id) ? '✨ 解锁能力' : '🔒 条件未满足' }}
        </button>
        <button
          v-else-if="selectedNode.type === 'active'"
          class="btn-primary use-btn"
          :class="{ disabled: getNodeCooldown(selectedNode.id) > 0 }"
          :disabled="getNodeCooldown(selectedNode.id) > 0"
          @click="useActiveNode(selectedNode)"
        >
          {{ getNodeCooldown(selectedNode.id) > 0 ? `⏳ 冷却中 (${getNodeCooldown(selectedNode.id)})` : '⚡ 使用能力' }}
        </button>
        <div v-else class="unlocked-tag">
          ✅ 已解锁
        </div>
      </div>
    </div>

    <div class="achievements-section panel" v-if="growthProgress?.completedAchievements?.length">
      <h4 class="achievements-title">🏆 成长记录</h4>
      <div class="achievements-list">
        <div
          v-for="ach in growthProgress.completedAchievements.slice().reverse().slice(0, 5)"
          :key="ach.id"
          class="achievement-item"
        >
          <span class="ach-icon">{{ ach.icon }}</span>
          <div class="ach-info">
            <span class="ach-name">{{ ach.name }}</span>
            <span class="ach-desc">{{ ach.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.growth-tree-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  padding: 4px;
}

.panel-header {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--color-cthulhu-green-glow);
  margin: 0;
}

.panel-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 4px 0 0;
}

.branches-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.branch-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-secondary);
}

.branch-tab.active {
  background: rgba(255, 255, 255, 0.05);
  border-width: 2px;
  font-weight: 600;
}

.branch-icon {
  font-size: 14px;
}

.branches-container {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.branch-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s;
  background: var(--color-bg-card);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
}

.branch-column.collapsed {
  flex: 0;
  min-width: 80px;
  opacity: 0.5;
  overflow: hidden;
}

.branch-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
  border-left: 3px solid;
}

.branch-header-icon {
  font-size: 18px;
}

.branch-header-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.branch-description {
  font-size: 10px;
  color: var(--color-text-muted);
  margin: 0;
  padding: 0 4px;
}

.nodes-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.tier-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tier-label {
  font-size: 10px;
  color: var(--color-text-muted);
  width: 28px;
  flex-shrink: 0;
  font-weight: 500;
}

.tier-nodes {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.connector-line {
  height: 12px;
  width: 2px;
  margin-left: 40px;
  border-radius: 1px;
}

.growth-node {
  position: relative;
  flex: 1;
  max-width: 140px;
  min-height: 80px;
  padding: 10px 8px;
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.growth-node:hover {
  transform: translateY(-2px);
  background: var(--color-bg-card);
}

.growth-node.unlocked {
  background: linear-gradient(135deg, rgba(74, 144, 219, 0.1) 0%, rgba(155, 89, 182, 0.1) 100%);
}

.growth-node.available {
  animation: pulse-available 2s ease-in-out infinite;
  cursor: pointer;
}

.growth-node.locked {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.growth-node.selected {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(74, 144, 219, 0.3);
}

.growth-node.newly {
  animation: unlock-flash 1.5s ease-out;
}

@keyframes pulse-available {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 219, 0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(74, 144, 219, 0.2); }
}

@keyframes unlock-flash {
  0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.8); }
  50% { box-shadow: 0 0 30px 10px rgba(255, 215, 0, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
}

.node-icon {
  font-size: 24px;
  line-height: 1;
}

.node-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.node-type-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
}

.node-type-badge.passive {
  background: rgba(46, 204, 113, 0.2);
  color: #2ECC71;
}

.node-type-badge.active {
  background: rgba(241, 196, 15, 0.2);
  color: #F1C40F;
}

.cooldown-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(231, 76, 60, 0.2);
  color: #E74C3C;
  font-weight: 600;
}

.unlock-hint {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 10px;
  background: linear-gradient(90deg, #F1C40F, #E67E22);
  color: #000;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(241, 196, 15, 0.4);
}

.node-detail {
  padding: 14px;
  border-radius: 8px;
}

.detail-header {
  display: flex;
  gap: 12px;
  padding-left: 10px;
  border-left: 3px solid;
  margin-bottom: 12px;
}

.detail-icon {
  font-size: 36px;
  line-height: 1;
  flex-shrink: 0;
}

.detail-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-name {
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-text-primary);
  margin: 0;
}

.detail-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 10px;
}

.detail-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.detail-type.passive {
  background: rgba(46, 204, 113, 0.15);
  color: #2ECC71;
}

.detail-type.active {
  background: rgba(241, 196, 15, 0.15);
  color: #F1C40F;
}

.detail-tier {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(155, 89, 182, 0.15);
  color: #9B59B6;
  font-weight: 600;
}

.detail-branch {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(74, 144, 219, 0.1);
  font-weight: 600;
}

.detail-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding: 8px 12px;
  background: var(--color-bg-panel);
  border-radius: 6px;
  margin-bottom: 10px;
}

.detail-effect,
.detail-cooldown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-bg-panel);
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}

.effect-label,
.cooldown-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.effect-value {
  color: var(--color-cthulhu-green-glow);
  font-weight: 600;
}

.cooldown-value {
  color: #F1C40F;
  font-weight: 600;
}

.current-cooldown {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(231, 76, 60, 0.15);
  color: #E74C3C;
}

.current-cooldown.ready {
  background: rgba(46, 204, 113, 0.15);
  color: #2ECC71;
}

.detail-lore {
  padding: 10px 14px;
  font-size: 11px;
  color: var(--color-cthulhu-green-glow);
  font-style: italic;
  opacity: 0.85;
  line-height: 1.6;
  border-left: 2px solid var(--color-cthulhu-green);
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.05) 0%, transparent 100%);
  border-radius: 0 6px 6px 0;
  margin-bottom: 10px;
}

.lore-quote {
  font-size: 16px;
  opacity: 0.6;
}

.unlock-conditions {
  margin-bottom: 12px;
}

.conditions-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}

.condition-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-bg-panel);
  border-radius: 5px;
  font-size: 11px;
  transition: all 0.2s;
  border-left: 2px solid var(--color-border);
}

.condition-item.satisfied {
  border-left-color: #2ECC71;
  background: rgba(46, 204, 113, 0.05);
}

.condition-check {
  font-size: 12px;
  flex-shrink: 0;
}

.condition-text {
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.conditions-progress {
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 4px 10px;
  background: var(--color-bg-panel);
  border-radius: 5px;
  text-align: center;
}

.detail-actions {
  display: flex;
  justify-content: center;
}

.unlock-btn,
.use-btn {
  width: 100%;
  padding: 10px 16px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
}

.unlock-btn.disabled,
.use-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.unlocked-tag {
  padding: 8px 16px;
  background: rgba(46, 204, 113, 0.15);
  color: #2ECC71;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.achievements-section {
  padding: 12px;
}

.achievements-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 10px;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-bg-panel);
  border-radius: 6px;
  border-left: 2px solid #F1C40F;
}

.ach-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.ach-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ach-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.ach-desc {
  font-size: 10px;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
