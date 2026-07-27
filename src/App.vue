<script setup>
/*
  App.vue · Raíz de la SPA.
  La navegación entre "apps" (jugador /play · docente /dashboard) la maneja
  Vue Router. La barra superior es temporal de desarrollo: desaparece cuando
  llegue el login real del docente (F1).
*/
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { Monitor, Smartphone } from 'lucide-vue-next'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <!-- Barra de navegación de desarrollo -->
    <nav class="bg-marino/95 backdrop-blur px-4 py-2.5 flex items-center justify-center gap-3 text-sm sticky top-0 z-10 border-b border-white/10">
      <span class="text-white/50 text-xs uppercase tracking-wider hidden sm:block">POLI Quiz · dev</span>
      <RouterLink
        to="/play"
        class="px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
        :class="route.path.startsWith('/play') ? 'bg-white text-marino' : 'bg-white/10 text-white/70 hover:bg-white/20'"
      >
        <Smartphone :size="15" /> Jugador
      </RouterLink>
      <RouterLink
        to="/dashboard"
        class="px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
        :class="!route.path.startsWith('/play') ? 'bg-white text-marino' : 'bg-white/10 text-white/70 hover:bg-white/20'"
      >
        <Monitor :size="15" /> Docente
      </RouterLink>
    </nav>

    <!-- Cada cambio de ruta entra con la animación de pantalla -->
    <div :key="route.fullPath" class="animar-pantalla">
      <RouterView />
    </div>
  </div>
</template>

<!-- Vocabulario global de animación de pantallas (lo usa también PlayerFlow). -->
<style>
@keyframes pantalla-entra {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
}
@keyframes pantalla-entra-suave {
  from { opacity: 0; }
}

.animar-pantalla {
  animation: pantalla-entra 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

@media (prefers-reduced-motion: reduce) {
  .animar-pantalla {
    animation-name: pantalla-entra-suave;
  }
}
</style>
