<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEndingById } from '@game/systems/endingSystem'
import { useGameStore } from '@stores/gameStore'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const ending = computed(() => {
  const idFromStore = gameStore.state?.currentEndingId
  const idFromRoute = route.params.id as string
  return getEndingById(idFromStore || idFromRoute) || null
})

const typeInfo: Record<string, { label: string; color: string; icon: string }> = {
  good: { label: '善终', color: '#5ec98a', icon: '🌿' },
  neutral: { label: '普通', color: '#d9a54c', icon: '⚖️' },
  bad: { label: '悲剧', color: '#c44a4a', icon: '💀' },
  secret: { label: '隐藏', color: '#8a5abf', icon: '🔮' },
}

function backToTitle() {
  gameStore.reset()
  router.push('/')
}

onMounted(() => {
  if (!ending.value) {
    router.replace('/')
  }
})
</script>

<template>
  <div v-if="ending" class="ending-view">
    <div class="ending-bg"></div>
    <div class="ending-content">
      <div class="ending-type" :style="{ color: typeInfo[ending.type].color }">
        <span class="icon">{{ typeInfo[ending.type].icon }}</span>
        <span class="label">{{ typeInfo[ending.type].label }}结局</span>
      </div>

      <h1 class="ending-name cthulhu-glow">{{ ending.name }}</h1>
      <p class="ending-desc">{{ ending.description }}</p>

      <div class="ending-epilogue panel">
        <p v-for="(line, i) in ending.epilogue.split('\n')" :key="i" class="epi-line">
          {{ line }}
        </p>
      </div>

      <button class="btn-primary big-btn" @click="backToTitle">
        回到标题
      </button>
    </div>
  </div>
</template>

<style scoped>
.ending-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
}

.ending-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(94, 201, 138, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 80%, rgba(138, 90, 191, 0.06) 0%, transparent 60%),
    var(--color-bg-dark);
  z-index: -1;
}

.ending-content {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.ending-type {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2em;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.ending-name {
  font-size: 44px;
  color: var(--color-cthulhu-green-glow);
  letter-spacing: 0.2em;
  margin-bottom: 8px;
}

.ending-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

.ending-epilogue {
  padding: 28px 32px;
  text-align: left;
  margin-bottom: 32px;
  background: linear-gradient(180deg, rgba(94, 201, 138, 0.04), var(--color-bg-panel));
}

.epi-line {
  font-size: 14px;
  line-height: 2;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}

.big-btn {
  padding: 14px 40px !important;
  font-size: 15px !important;
  letter-spacing: 0.1em;
}
</style>
