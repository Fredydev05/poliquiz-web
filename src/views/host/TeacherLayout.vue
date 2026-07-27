<script setup>
/*
  TeacherLayout.vue · Marco común de las vistas del docente (Desktop-First).
  Sidebar institucional + slot de contenido. Muestra la sesión real del
  docente (store de auth) y permite cerrar sesión.
*/
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, FilePlus2, BarChart3, Settings, LogOut } from 'lucide-vue-next'
import BrandLogo from '../../components/ui/BrandLogo.vue'
import { useAuthStore } from '../../stores/auth'
import { useQuizApiStore } from '../../stores/quiz'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const quizStore = useQuizApiStore()

// Si recargó la página, recuperamos el usuario a partir del token guardado.
onMounted(() => {
  if (!auth.user) auth.fetchMe()
})

const menu = [
  { label: 'Mis cuestionarios', icon: LayoutDashboard, action: () => router.push('/dashboard'), path: '/dashboard' },
  { label: 'Crear cuestionario', icon: FilePlus2, action: crearYEditar, path: '/editor' },
  { label: 'Reportes', icon: BarChart3, action: null, path: null },     // llega en F6
  { label: 'Configuración', icon: Settings, action: null, path: null },
]

async function crearYEditar() {
  const id = await quizStore.createQuiz()
  router.push(`/editor/${id}`)
}

async function cerrarSesion() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] flex bg-slate-100">
    <!-- ============ SIDEBAR (color institucional) ============ -->
    <aside class="w-64 bg-marino text-white flex-col hidden md:flex shrink-0">
      <div class="p-5 border-b border-white/10">
        <BrandLogo dark />
      </div>

      <nav class="p-3 space-y-1 text-sm flex-1">
        <button
          v-for="item in menu"
          :key="item.label"
          @click="item.action?.()"
          :disabled="!item.action"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-left disabled:opacity-40"
          :class="item.path && route.path.startsWith(item.path)
            ? 'bg-white/15 font-semibold'
            : 'text-white/70 hover:bg-white/10 hover:text-white'"
        >
          <component :is="item.icon" :size="18" />
          {{ item.label }}
        </button>
      </nav>

      <!-- Sesión real del docente -->
      <div class="p-4 border-t border-white/10 flex items-center justify-between gap-2">
        <div class="text-xs min-w-0">
          <p class="font-semibold truncate">{{ auth.user?.name ?? 'Docente' }}</p>
          <p class="text-white/40 truncate">{{ auth.user?.email }}</p>
        </div>
        <button @click="cerrarSesion" title="Cerrar sesión" class="text-white/50 hover:text-coral transition-colors shrink-0">
          <LogOut :size="17" />
        </button>
      </div>
    </aside>

    <!-- ============ CONTENIDO ============ -->
    <main class="flex-1 p-6 lg:p-8 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>
