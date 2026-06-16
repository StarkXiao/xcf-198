<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import Phaser from 'phaser'
import { BootScene } from '@phaser/scenes/BootScene'
import { GameScene } from '@phaser/scenes/GameScene'
import { useGameStore } from '@stores/gameStore'
import { storeToRefs } from 'pinia'
import type { MapTile } from '@game/types/game'

const props = defineProps<{
  width?: number
  height?: number
}>()

const gameStore = useGameStore()
const { state, identity, isNight } = storeToRefs(gameStore)

const containerRef = ref<HTMLDivElement | null>(null)
let gameInstance: Phaser.Game | null = null
let gameScene: GameScene | null = null

function onTileClick(tile: MapTile) {
  if (!state.value) return
  gameStore.moveTo({ x: tile.x, y: tile.y })
}

onMounted(() => {
  if (!containerRef.value) return

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: containerRef.value,
    width: props.width || 520,
    height: props.height || 520,
    backgroundColor: '#0a0a12',
    scene: [BootScene, GameScene],
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }

  gameInstance = new Phaser.Game(config)

  gameInstance.events.once('ready', () => {
    setTimeout(() => {
      if (!gameInstance) return
      const scene = gameInstance.scene.getScene('GameScene') as GameScene
      if (scene) {
        gameScene = scene
        scene.setCallbacks({ onTileClick })
        if (state.value) {
          scene.updateDiscoveredTiles(state.value.discoveredTiles)
          scene.updatePlayerPosition(state.value.position, identity.value?.icon || '👤')
          scene.setIsNight(isNight.value)
          scene.setPollution(state.value.stats.pollution)
        }
      }
    }, 100)
  })
})

watch(
  () => state.value?.position,
  (pos) => {
    if (gameScene && pos && identity.value) {
      gameScene.updatePlayerPosition(pos, identity.value.icon)
    }
  },
)

watch(
  () => state.value?.discoveredTiles,
  (tiles) => {
    if (gameScene && tiles) {
      gameScene.updateDiscoveredTiles(tiles)
    }
  },
  { deep: true },
)

watch(
  isNight,
  (night) => {
    if (gameScene) {
      gameScene.setIsNight(night)
    }
  },
)

watch(
  () => state.value?.stats.pollution,
  (pollution) => {
    if (gameScene && pollution !== undefined) {
      gameScene.setPollution(pollution)
    }
  },
)

onBeforeUnmount(() => {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
    gameScene = null
  }
})
</script>

<template>
  <div ref="containerRef" class="phaser-container"></div>
</template>

<style scoped>
.phaser-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a12;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.phaser-container :deep(canvas) {
  border-radius: var(--radius-md);
  image-rendering: pixelated;
}
</style>
