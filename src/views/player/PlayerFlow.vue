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
import { Presentation } from 'lucide-vue-next'
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
  if (player.gameState === 'get_ready') return { key: 'ready-' + player.currentIndex, screen: 'reveal' }
  if (player.gameState === 'slide') return { key: 'slide-' + player.currentIndex, screen: 'slide' }
  if (player.gameState === 'question') return { key: 'answer-' + player.currentIndex, comp: StudentAnswer }
  if (['results', 'leaderboard', 'podium'].includes(player.gameState))
    return { key: 'feedback-' + player.currentIndex + '-' + player.gameState, comp: StudentFeedback }
  return { key: 'lobby', comp: StudentLobby }
})
</script>

<template>
  <div v-if="!reanudando" :key="vista.key" class="animar-pantalla">
    <!-- Reveal (~5 s): el jugador LEE el enunciado antes de que aparezcan las opciones -->
    <div
      v-if="vista.screen === 'reveal'"
      class="min-h-[calc(100vh-52px)] bg-marino flex flex-col items-center justify-center gap-5 text-white max-w-md mx-auto px-6 text-center"
    >
      <p class="text-white/50 uppercase tracking-widest text-sm">
        Pregunta {{ player.currentIndex + 1 }}<template v-if="player.questionsTotal"> / {{ player.questionsTotal }}</template>
      </p>
      <p class="text-2xl font-extrabold leading-snug anim-reveal-title">{{ player.revealTitle }}</p>
      <p class="text-white/40 text-xs uppercase tracking-[0.3em] anim-preparate">¡Preparate!</p>
    </div>

    <!-- Diapositiva: pantalla pasiva (el contenido está en la proyección del aula) -->
    <div
      v-else-if="vista.screen === 'slide'"
      class="min-h-[calc(100vh-52px)] bg-marino flex flex-col items-center justify-center gap-4 text-white max-w-md mx-auto px-6 text-center"
    >
      <Presentation :size="44" class="text-white/40" />
      <p class="text-xl font-bold">{{ player.slide?.title }}</p>
      <p class="text-white/50 text-sm">Mirá la pantalla 👀</p>
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

@keyframes reveal-title-entra { from { opacity: 0; transform: scale(0.94); } }
.anim-reveal-title { animation: reveal-title-entra 400ms cubic-bezier(0.23, 1, 0.32, 1) both; }

@media (prefers-reduced-motion: reduce) {
  .anim-preparate, .anim-reveal-title { animation: none; }
}
</style>
