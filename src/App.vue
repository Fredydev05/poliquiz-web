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
      <div class="hidden items-center gap-1.5 text-xs uppercase tracking-wider text-white/50 sm:flex">
        <span>Powered by:</span>
        <div class="slot-container font-semibold text-white/80">
          <div class="slot-list">
            <span class="slot-item">Diogo Lima</span>
            <span class="slot-item">Elías González</span>
            <span class="slot-item">Lucas Acuña</span>
            <a href="https://github.com/Fredydev05" target="_blank" class="slot-item">Fredy Céspedes</a>
            <!-- Duplicado del primero para que el loop sea perfecto -->
            <span class="slot-item">Diogo Lima</span>
          </div>
        </div>
      </div>
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

/* Altura de una línea de texto */
:root {
  --slot-height: 1.25rem; /* ~20px, equivalente a text-xs */
}

.slot-container {
  display: inline-block;
  height: var(--slot-height);
  line-height: var(--slot-height);
  overflow: hidden;
  vertical-align: middle;
}

.slot-list {
  display: flex;
  flex-direction: column;
  /* 4 nombres + 1 duplicado = 5 elementos (animación dura 8s en total) */
  animation: slot-scroll 8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

.slot-item {
  height: var(--slot-height);
  display: flex;
  align-items: center;
  white-space: nowrap;
}

/* 
  Calculo de keyframes para 4 elementos:
  - Cada elemento permanece visible 20% del tiempo.
  - El movimiento entre elementos toma 5%.
*/
@keyframes slot-scroll {
  0%, 20% {
    transform: translateY(0%);
  }
  25%, 45% {
    transform: translateY(-20%);
  }
  50%, 70% {
    transform: translateY(-40%);
  }
  75%, 95% {
    transform: translateY(-60%);
  }
  100% {
    transform: translateY(-80%); /* Llega al duplicado e inicia de nuevo instantáneamente */
  }
}
</style>
