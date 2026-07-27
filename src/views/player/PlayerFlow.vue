<script setup>
/*
  PlayerFlow.vue · Contenedor del flujo REAL del jugador (/play).
  --------------------------------------------------------------------------
  La pantalla se DERIVA del estado que llega por WS:
    no entró               → StudentLogin
    lobby                  → StudentLobby
    get_ready              → countdown "¡Preparate!"
    question (sin resp.)   → StudentAnswer
    results / leaderboard  → StudentFeedback (correcto/incorrecto + racha)
    podium                 → StudentFeedback (resultado final)
  Al montar intenta REANUDAR la sesión guardada (refresh del celular).
*/
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../../stores/player'
import StudentLogin from './StudentLogin.vue'
import StudentLobby from './StudentLobby.vue'
import StudentAnswer from './StudentAnswer.vue'
import StudentFeedback from './StudentFeedback.vue'

const player = usePlayerStore()
const reanudando = ref(true)

onMounted(async () => {
  if (!player.joined) await player.resume()
  reanudando.value = false
})

const vista = computed(() => {
  if (!player.joined) return { key: 'login', comp: StudentLogin }
  if (player.gameState === 'get_ready') return { key: 'ready-' + player.currentIndex, comp: null }
  if (player.gameState === 'question') return { key: 'answer-' + player.currentIndex, comp: StudentAnswer }
  if (['results', 'leaderboard', 'podium'].includes(player.gameState))
    return { key: 'feedback-' + player.currentIndex + '-' + player.gameState, comp: StudentFeedback }
  return { key: 'lobby', comp: StudentLobby }
})
</script>

<template>
  <div v-if="!reanudando" :key="vista.key" class="animar-pantalla">
    <!-- Pantalla inline de "get ready" (3 s) -->
    <div
      v-if="vista.comp === null"
      class="min-h-[calc(100vh-52px)] bg-marino flex flex-col items-center justify-center gap-4 text-white max-w-md mx-auto"
    >
      <p class="text-white/50 uppercase tracking-widest text-sm">
        Pregunta {{ player.currentIndex + 1 }}<template v-if="player.questionsTotal"> / {{ player.questionsTotal }}</template>
      </p>
      <p class="text-5xl font-extrabold anim-preparate">¡Preparate!</p>
    </div>

    <component v-else :is="vista.comp" />
  </div>
</template>

<style scoped>
@keyframes late {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
.anim-preparate { animation: late 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .anim-preparate { animation: none; }
}
</style>
