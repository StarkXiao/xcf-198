import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'identity',
      component: () => import('@views/IdentitySelectView.vue'),
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@views/GameView.vue'),
    },
    {
      path: '/ending/:id',
      name: 'ending',
      component: () => import('@components/EndingScreen.vue'),
    },
  ],
})

export default router
