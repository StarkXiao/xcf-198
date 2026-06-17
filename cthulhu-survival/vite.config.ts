import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@phaser': path.resolve(__dirname, './src/phaser'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@components': path.resolve(__dirname, './src/components'),
      '@views': path.resolve(__dirname, './src/views'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.ts', '**/*.spec.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@phaser': path.resolve(__dirname, './src/phaser'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@components': path.resolve(__dirname, './src/components'),
      '@views': path.resolve(__dirname, './src/views'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser/')) {
            return 'phaser'
          }
          if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/') || id.includes('node_modules/pinia/')) {
            return 'vue'
          }
          if (id.includes('src/game/engine/') || id.includes('src/game/systems/')) {
            return 'game-logic'
          }
          if (id.includes('src/game/data/')) {
            return 'game-data'
          }
          if (id.includes('src/phaser/')) {
            return 'phaser-scene'
          }
        },
      },
    },
  },
})
