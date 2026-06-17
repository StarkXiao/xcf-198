<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IDENTITIES } from '@game/data/identities'
import { getRelicsForIdentity } from '@game/data/relics'
import type { Identity } from '@game/types/identity'
import type { Relic } from '@game/types/relic'
import { useGameStore } from '@stores/gameStore'
import { useSaveStore } from '@stores/saveStore'

const router = useRouter()
const gameStore = useGameStore()
const saveStore = useSaveStore()

type Step = 'identity' | 'relic' | 'confirm'

const currentStep = ref<Step>('identity')
const selectedIdentity = ref<Identity | null>(null)
const selectedRelic = ref<Relic | null>(null)
const showSavePanel = ref(false)
const skipRelic = ref(false)

const availableRelics = computed(() => {
  if (!selectedIdentity.value) return []
  return getRelicsForIdentity(selectedIdentity.value.id)
})

watch(selectedIdentity, (newId) => {
  if (newId) {
    selectedRelic.value = null
    skipRelic.value = false
  }
})

function selectIdentity(id: Identity) {
  selectedIdentity.value = id
}

function goToRelicSelection() {
  if (!selectedIdentity.value) return
  currentStep.value = 'relic'
}

function goBackToIdentity() {
  currentStep.value = 'identity'
  selectedRelic.value = null
  skipRelic.value = false
}

function selectRelic(relic: Relic | null) {
  selectedRelic.value = relic
  skipRelic.value = relic === null
}

function goToConfirm() {
  currentStep.value = 'confirm'
}

function goBackToRelic() {
  currentStep.value = 'relic'
}

function startGame() {
  if (!selectedIdentity.value) return
  const relicToUse = skipRelic.value ? null : selectedRelic.value
  gameStore.startGame(selectedIdentity.value, relicToUse)
  router.push('/game')
}

function loadSlot(id: number) {
  const ok = saveStore.loadGame(id)
  if (ok) {
    showSavePanel.value = false
    router.push('/game')
  }
}

function formatEffectDescription(effect: Relic['effects'][number]): string {
  switch (effect.type) {
    case 'bonus_start_items':
      const items = effect.items || (effect.itemId ? [{ itemId: effect.itemId, count: effect.itemCount || 1 }] : [])
      if (items.length === 0) return ''
      const itemNames = items.map(i => `${i.count}x ${i.itemId}`).join(', ')
      return `初始获得：${itemNames}`
    case 'modify_base_stats':
      const statTexts: string[] = []
      if (effect.stats?.maxHp) statTexts.push(`生命上限 ${effect.stats.maxHp > 0 ? '+' : ''}${effect.stats.maxHp}`)
      if (effect.stats?.maxSanity) statTexts.push(`理智上限 ${effect.stats.maxSanity > 0 ? '+' : ''}${effect.stats.maxSanity}`)
      if (effect.stats?.startPollution !== undefined) statTexts.push(`初始污染 ${effect.stats.startPollution > 0 ? '+' : ''}${effect.stats.startPollution}`)
      if (effect.stats?.startHunger !== undefined) statTexts.push(`初始饱食度 ${effect.stats.startHunger > 0 ? '+' : ''}${effect.stats.startHunger}`)
      if (effect.stats?.startEnergy !== undefined) statTexts.push(`初始精力 ${effect.stats.startEnergy > 0 ? '+' : ''}${effect.stats.startEnergy}`)
      return statTexts.join('，')
    case 'reveal_tiles':
      return `开局探索更多地图区域`
    case 'set_start_flag':
      if (effect.flag?.startsWith('relic_')) return ''
      return `获得特殊状态：${effect.flag}`
    case 'bonus_start_reputation':
      const factionNames: Record<string, string> = {
        monastery: '修道院',
        deep_ones: '深潜者',
        watchers: '守望者',
      }
      return `${factionNames[effect.factionId || ''] || effect.factionId}声望 +${effect.reputation}`
    case 'trigger_start_event':
      return `开局触发特殊剧情事件`
    case 'bonus_start_actions':
      return `初始行动力 +${effect.value}`
    case 'reduce_hunger_rate':
      return `饥饿速度降低 ${Math.round((effect.value || 0) * 100)}%`
    case 'reduce_pollution_gain':
      return `污染获取降低 ${Math.round((effect.value || 0) * 100)}%`
    case 'bonus_sanity_recovery':
      return `每阶段理智恢复 +${effect.value}`
    case 'increase_action_points':
      return `每阶段行动力 +${effect.value}`
    case 'reduce_damage_taken':
      return `受到伤害降低 ${Math.round((effect.value || 0) * 100)}%`
    case 'bonus_craft_success':
      return `合成成功率 +${Math.round((effect.value || 0) * 100)}%`
    case 'scouting_range_bonus':
      return `侦查范围 +${effect.value}`
    case 'modify_start_position':
      return `改变初始出生位置`
    case 'unlock_recipe':
      return `解锁特殊配方`
    case 'merchant_discount':
      return `商人折扣 ${Math.round((effect.value || 0) * 100)}%`
    default:
      return ''
  }
}

const rarityClass: Record<string, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  legendary: 'rarity-legendary',
}

const rarityText: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说',
}

const categoryIcon: Record<string, string> = {
  resource: '📦',
  ability: '⚡',
  story: '📖',
}

const categoryText: Record<string, string> = {
  resource: '资源型',
  ability: '能力型',
  story: '剧情型',
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

      <!-- 步骤指示器 -->
      <div class="step-indicator" v-if="!showSavePanel">
        <div 
          class="step" 
          :class="{ active: currentStep === 'identity', done: currentStep !== 'identity' }"
        >
          <span class="step-num">1</span>
          <span class="step-label">选择身份</span>
        </div>
        <div class="step-line" :class="{ filled: currentStep !== 'identity' }"></div>
        <div 
          class="step" 
          :class="{ active: currentStep === 'relic', done: currentStep === 'confirm' }"
        >
          <span class="step-num">2</span>
          <span class="step-label">选择遗物</span>
        </div>
        <div class="step-line" :class="{ filled: currentStep === 'confirm' }"></div>
        <div 
          class="step" 
          :class="{ active: currentStep === 'confirm' }"
        >
          <span class="step-num">3</span>
          <span class="step-label">确认进入</span>
        </div>
      </div>

      <!-- 身份选择 -->
      <section v-if="!showSavePanel && currentStep === 'identity'" class="identity-section">
        <h2 class="section-title">第一步 · 选择你的身份</h2>
        <div class="identity-grid">
          <button
            v-for="id in IDENTITIES"
            :key="id.id"
            class="identity-card"
            :class="{ selected: selectedIdentity?.id === id.id }"
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
              <div class="relic-count-badge">
                🔮 {{ getRelicsForIdentity(id.id).length }} 件专属遗物可选
              </div>
            </div>
          </button>
        </div>

        <div class="action-row">
          <button class="btn-secondary" @click="showSavePanel = true" :disabled="!saveStore.hasAnySave">
            📂 读取存档
          </button>
          <button class="btn-primary" :disabled="!selectedIdentity" @click="goToRelicSelection">
            下一步：选择遗物 →
          </button>
        </div>
      </section>

      <!-- 遗物选择 -->
      <section v-if="!showSavePanel && currentStep === 'relic'" class="relic-section">
        <h2 class="section-title">
          第二步 · 为「{{ selectedIdentity?.name }}」选择开局遗物
          <span class="section-subtitle">从专属遗物池中选择一件，或放弃选择</span>
        </h2>

        <div class="relic-grid">
          <button
            v-for="relic in availableRelics"
            :key="relic.id"
            class="relic-card"
            :class="[
              rarityClass[relic.rarity],
              { selected: selectedRelic?.id === relic.id && !skipRelic }
            ]"
            @click="selectRelic(relic)"
          >
            <div class="relic-header">
              <div class="relic-icon">{{ relic.icon }}</div>
              <div class="relic-meta">
                <h3 class="relic-name">{{ relic.name }}</h3>
                <div class="relic-tags">
                  <span class="tag rarity" :class="rarityClass[relic.rarity]">
                    {{ rarityText[relic.rarity] }}
                  </span>
                  <span class="tag category">
                    {{ categoryIcon[relic.category] }} {{ categoryText[relic.category] }}
                  </span>
                </div>
              </div>
            </div>
            <p class="relic-desc">{{ relic.description }}</p>
            <p class="relic-lore">「{{ relic.lore }}」</p>
            <div class="relic-effects">
              <h4 class="effects-title">效果一览</h4>
              <ul class="effects-list">
                <li 
                  v-for="(eff, idx) in relic.effects.filter(e => formatEffectDescription(e))" 
                  :key="idx"
                >
                  ✦ {{ formatEffectDescription(eff) }}
                </li>
              </ul>
            </div>
          </button>

          <button
            class="relic-card no-relic"
            :class="{ selected: skipRelic }"
            @click="selectRelic(null)"
          >
            <div class="relic-header">
              <div class="relic-icon">🚫</div>
              <div class="relic-meta">
                <h3 class="relic-name">放弃遗物</h3>
                <div class="relic-tags">
                  <span class="tag category">挑战自我</span>
                </div>
              </div>
            </div>
            <p class="relic-desc">你选择不携带任何特殊物品进入这片诡秘之地。对某些真正的勇士而言，外物不过是累赘。</p>
            <p class="relic-lore">「赤条条来去无牵挂，真正的强者不需要任何护身符。」</p>
            <div class="relic-effects">
              <h4 class="effects-title">额外奖励</h4>
              <ul class="effects-list">
                <li>✦ 无任何特殊效果</li>
                <li class="warning">⚠ 适合追求高难度挑战的玩家</li>
              </ul>
            </div>
          </button>
        </div>

        <div class="action-row">
          <button class="btn-secondary" @click="goBackToIdentity">
            ← 返回身份选择
          </button>
          <button 
            class="btn-primary" 
            :disabled="!selectedRelic && !skipRelic" 
            @click="goToConfirm"
          >
            确认选择 →
          </button>
        </div>
      </section>

      <!-- 存档读取 -->
      <section v-else-if="showSavePanel" class="save-section">
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

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="currentStep === 'confirm'" class="modal-overlay" @click.self="goBackToRelic">
          <div class="modal panel confirm-modal">
            <h3>确认进入</h3>
            
            <div class="confirm-identity" v-if="selectedIdentity">
              <div class="ci-header">
                <span class="big-icon">{{ selectedIdentity.icon }}</span>
                <div class="ci-info">
                  <h4>{{ selectedIdentity.name }} · {{ selectedIdentity.title }}</h4>
                  <p class="ci-lore">「{{ selectedIdentity.lore }}」</p>
                </div>
              </div>
            </div>

            <div class="confirm-relic" v-if="selectedRelic">
              <div class="cr-header" :class="rarityClass[selectedRelic.rarity]">
                <span class="relic-big-icon">{{ selectedRelic.icon }}</span>
                <div class="cr-info">
                  <h4>
                    开局遗物：{{ selectedRelic.name }}
                    <span class="tag rarity inline" :class="rarityClass[selectedRelic.rarity]">
                      {{ rarityText[selectedRelic.rarity] }}
                    </span>
                  </h4>
                  <p class="cr-desc">{{ selectedRelic.description }}</p>
                </div>
              </div>
            </div>

            <div class="confirm-relic no-relic-box" v-else>
              <div class="cr-header no-relic-header">
                <span class="relic-big-icon">🚫</span>
                <div class="cr-info">
                  <h4>未携带任何遗物</h4>
                  <p class="cr-desc">你将以最纯粹的姿态踏入这片土地，愿勇气与你同在。</p>
                </div>
              </div>
            </div>

            <p class="confirm-text">你确定要踏入这片诡秘之地吗？</p>

            <div class="modal-actions">
              <button class="btn-secondary" @click="goBackToRelic">再想想</button>
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
  max-width: 1200px;
  margin: 0 auto;
}

.title-block {
  text-align: center;
  margin-bottom: 32px;
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

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
}

.step.active {
  border-color: var(--color-cthulhu-green-glow);
  background: rgba(58, 143, 90, 0.12);
  box-shadow: var(--shadow-glow-green);
}

.step.done {
  border-color: var(--color-cthulhu-green);
  opacity: 0.8;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
}

.step.active .step-num {
  background: var(--color-cthulhu-green);
  color: #000;
}

.step.done .step-num {
  background: var(--color-cthulhu-green-glow);
  color: #000;
}

.step-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.step.active .step-label {
  color: var(--color-cthulhu-green-glow);
  font-weight: 500;
}

.step-line {
  width: 40px;
  height: 2px;
  background: var(--color-border);
  transition: background 0.3s ease;
}

.step-line.filled {
  background: var(--color-cthulhu-green);
}

.section-title {
  font-size: 20px;
  color: var(--color-text-primary);
  margin-bottom: 8px;
  text-align: center;
  letter-spacing: 0.1em;
}

.section-subtitle {
  display: block;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 6px;
  letter-spacing: 0.05em;
  font-weight: 400;
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
  margin-bottom: 10px;
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

.relic-count-badge {
  font-size: 11px;
  color: var(--color-cthulhu-green);
  padding: 4px 8px;
  background: rgba(58, 143, 90, 0.1);
  border-radius: 4px;
  display: inline-block;
}

/* 遗物选择样式 */
.relic-section {
  max-width: 1100px;
  margin: 0 auto;
}

.relic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
  margin-bottom: 32px;
}

.relic-card {
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 22px;
  text-align: left;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.relic-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-border);
  transition: background 0.3s ease;
}

.relic-card.rarity-common::before { background: linear-gradient(90deg, #8a8a8a, #a0a0a0); }
.relic-card.rarity-rare::before { background: linear-gradient(90deg, #4a90d9, #7ab8ff); }
.relic-card.rarity-legendary::before { background: linear-gradient(90deg, #d4a017, #ffd700, #d4a017); }

.relic-card:hover {
  transform: translateY(-3px);
}

.relic-card.rarity-common:hover {
  border-color: #a0a0a0;
  box-shadow: 0 8px 24px rgba(160, 160, 160, 0.15);
}

.relic-card.rarity-rare:hover {
  border-color: #4a90d9;
  box-shadow: 0 8px 24px rgba(74, 144, 217, 0.2);
}

.relic-card.rarity-legendary:hover {
  border-color: #d4a017;
  box-shadow: 0 8px 32px rgba(212, 160, 23, 0.25);
}

.relic-card.selected {
  border-color: var(--color-cthulhu-green-glow);
  background: linear-gradient(135deg, var(--color-bg-panel), rgba(58, 143, 90, 0.1));
  box-shadow: var(--shadow-glow-green);
}

.relic-card.no-relic:hover {
  border-color: #e07a7a;
  box-shadow: 0 8px 24px rgba(224, 122, 122, 0.15);
}

.relic-card.no-relic.selected {
  border-color: #e07a7a;
  background: linear-gradient(135deg, var(--color-bg-panel), rgba(224, 122, 122, 0.08));
  box-shadow: 0 0 20px rgba(224, 122, 122, 0.2);
}

.relic-card.no-relic::before {
  background: linear-gradient(90deg, #e07a7a, #f0a0a0);
}

.relic-header {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
  align-items: flex-start;
}

.relic-icon {
  font-size: 44px;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.relic-meta {
  flex: 1;
  min-width: 0;
}

.relic-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.relic-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
}

.tag.rarity {
  font-weight: 500;
}

.tag.rarity.rarity-common {
  background: rgba(160, 160, 160, 0.15);
  color: #c0c0c0;
}

.tag.rarity.rarity-rare {
  background: rgba(74, 144, 217, 0.15);
  color: #7ab8ff;
}

.tag.rarity.rarity-legendary {
  background: rgba(212, 160, 23, 0.15);
  color: #ffd700;
}

.tag.rarity.inline {
  margin-left: 8px;
  font-size: 10px;
  vertical-align: middle;
}

.tag.category {
  background: var(--color-bg-card);
}

.relic-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.relic-lore {
  font-size: 12px;
  font-style: italic;
  color: var(--color-text-muted);
  padding: 10px 12px;
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-border);
  margin-bottom: 14px;
  line-height: 1.5;
}

.relic-card.rarity-rare .relic-lore {
  border-left-color: #4a90d9;
}

.relic-card.rarity-legendary .relic-lore {
  border-left-color: #d4a017;
}

.relic-effects {
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
}

.effects-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-cthulhu-green);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.effects-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.effects-list li {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 3px 0;
  line-height: 1.5;
}

.effects-list li.warning {
  color: #e07a7a;
}

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
  max-width: 560px;
  width: 100%;
  padding: 28px;
}

.modal h3 {
  font-size: 20px;
  text-align: center;
  margin-bottom: 24px;
  color: var(--color-cthulhu-green-glow);
}

.confirm-modal {
  max-width: 600px;
}

.confirm-identity {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 14px;
}

.ci-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.big-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.ci-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.ci-lore {
  font-size: 12px;
  font-style: italic;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.confirm-relic {
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 14px;
}

.cr-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.cr-header.rarity-common {
  background: rgba(160, 160, 160, 0.08);
  border: 1px solid rgba(160, 160, 160, 0.2);
  border-radius: var(--radius-md);
  padding: 14px;
}

.cr-header.rarity-rare {
  background: rgba(74, 144, 217, 0.08);
  border: 1px solid rgba(74, 144, 217, 0.25);
  border-radius: var(--radius-md);
  padding: 14px;
}

.cr-header.rarity-legendary {
  background: rgba(212, 160, 23, 0.08);
  border: 1px solid rgba(212, 160, 23, 0.3);
  border-radius: var(--radius-md);
  padding: 14px;
}

.no-relic-header {
  background: rgba(224, 122, 122, 0.06);
  border: 1px solid rgba(224, 122, 122, 0.2);
  border-radius: var(--radius-md);
  padding: 14px;
}

.relic-big-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.cr-info h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.cr-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.confirm-text {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 20px 0 24px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
