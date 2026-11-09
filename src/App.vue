<script setup>
/*
  App.vue · Raíz de la SPA.
  La navegación entre "apps" (jugador /play · docente /dashboard) la maneja
  Vue Router. El sistema ocupa el 100% de la pantalla.
*/
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()

// La key fuerza la animación de entrada en cada pantalla. Excepción: el editor
// conserva su instancia cuando el borrador /editor/nuevo pasa a /editor/:id al
// guardarse (remontarlo perdería lo que no viajó todavía al servidor).
const pantallaKey = computed(() => (route.name === 'editor' ? 'editor' : route.fullPath))
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-100">
    <!-- Cada cambio de ruta entra con la animación de pantalla.
         flex-1 min-h-0 + overflow-y-auto: el scroll de página queda contenido
         acá en vez de en el <body>, y TeacherEditor puede usar h-full. -->
    <div :key="pantallaKey" class="animar-pantalla flex-1 min-h-0 overflow-y-auto">
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
