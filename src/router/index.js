/*
  Router de POLI Quiz.
  --------------------------------------------------------------------------
  Dos "apps" en una SPA:
   · Jugador  → /play (join + flujo de partida, sin login)
   · Docente  → /login /dashboard /editor/:id /host (protegidas por guard)
*/
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/play' },

    // ---- Jugador (mobile) ----
    {
      path: '/play',
      name: 'play',
      component: () => import('../views/player/PlayerFlow.vue'),
    },

    // ---- Docente (desktop) ----
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/host/TeacherDashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/editor/:id',
      name: 'editor',
      component: () => import('../views/host/TeacherEditor.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/host/:pin',
      name: 'host',
      component: () => import('../views/host/HostGame.vue'),
      meta: { requiresAuth: true },
    },

    { path: '/:pathMatch(.*)*', redirect: '/play' },
  ],
})

// Guard: las rutas del docente exigen sesión; guardamos a dónde iba
// para volver ahí después del login.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
