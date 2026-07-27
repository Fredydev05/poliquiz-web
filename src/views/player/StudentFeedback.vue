<script setup>
/*
  StudentFeedback.vue · Resultado REAL del jugador (Mobile).
  Cubre las fases post-pregunta según el estado del servidor:
   - results/leaderboard → correcto/incorrecto + puntos + racha + posición
   - podium              → resultado final (posición y puntaje totales)
  Los datos vienen de /me (los trae el store tras QuestionEnded).
*/
import { computed } from 'vue'
import {
  PartyPopper, Frown, AlarmClockOff, Trophy, LogOut, Hourglass, Zap, XCircle,
} from 'lucide-vue-next'
import BaseButton from '../../components/ui/BaseButton.vue'
import { usePlayerStore } from '../../stores/player'

const player = usePlayerStore()

const finished = computed(() => player.gameState === 'podium')
const r = computed(() => player.lastResult)
// Sin respuesta registrada: no llegó a contestar.
const sinRespuesta = computed(() => r.value === null || player.mySelection.length === 0 && !r.value)
</script>

<template>
  <div
    class="min-h-[calc(100vh-52px)] flex items-center justify-center p-4 max-w-md mx-auto text-white transition-colors"
    :class="finished ? 'bg-marino' : r?.is_correct ? 'bg-esmeralda' : 'bg-coral'"
  >
    <div class="text-center space-y-5">

      <!-- ═══════ PARTIDA TERMINADA ═══════ -->
      <template v-if="finished">
        <template v-if="player.aborted">
          <XCircle :size="56" class="mx-auto anim-celebracion text-white/70" />
          <div class="anim-detalle">
            <h1 class="text-2xl font-extrabold">El docente terminó la partida</h1>
          </div>
        </template>
        <template v-else>
          <Trophy :size="56" class="mx-auto text-dorado anim-celebracion" />
          <div class="anim-detalle">
            <h1 class="text-3xl font-extrabold">¡Juego terminado!</h1>
            <p class="text-white/70 mt-1" v-if="player.rank">
              Quedaste en el puesto <strong>{{ player.rank }}º</strong>
            </p>
          </div>
          <p class="text-5xl font-extrabold tabular-nums text-dorado anim-detalle">{{ player.score }} pts</p>
        </template>
        <BaseButton variant="ghost" @click="player.leave()">
          <LogOut :size="16" /> Salir
        </BaseButton>
      </template>

      <!-- ═══════ RESULTADO DE LA PREGUNTA ═══════ -->
      <template v-else>
        <PartyPopper v-if="r?.is_correct" :size="56" class="mx-auto anim-celebracion" />
        <Frown v-else-if="r" :size="56" class="mx-auto anim-celebracion" />
        <AlarmClockOff v-else :size="56" class="mx-auto anim-celebracion" />

        <div class="anim-detalle">
          <h1 class="text-3xl font-extrabold">
            {{ r?.is_correct ? '¡Correcto!' : r ? 'Incorrecto' : '¡Tiempo agotado!' }}
          </h1>
          <p v-if="r?.is_correct && r.points" class="text-white/90 text-xl font-bold mt-2">
            +{{ r.points }} puntos
          </p>
          <!-- Racha estilo Kahoot -->
          <p v-if="r?.streak >= 2" class="text-white/90 text-sm mt-1 font-semibold flex items-center justify-center gap-1">
            <Zap :size="15" /> ¡Racha de {{ r.streak }}!
          </p>
          <p class="text-white/70 text-sm mt-2">
            Total: <strong class="tabular-nums">{{ player.score }} pts</strong>
            <span v-if="player.rank"> · puesto {{ player.rank }}º</span>
          </p>
        </div>

        <p class="text-sm text-white/60 flex items-center justify-center gap-2">
          <Hourglass :size="15" class="animate-pulse" />
          Esperando la siguiente pregunta…
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
@keyframes pop-celebracion {
  0%   { transform: scale(0.5); opacity: 0; }
  70%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes sube-detalle {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.anim-celebracion {
  animation: pop-celebracion 450ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.anim-detalle {
  animation: sube-detalle 250ms cubic-bezier(0.23, 1, 0.32, 1) 80ms both;
}
@media (prefers-reduced-motion: reduce) {
  .anim-celebracion,
  .anim-detalle {
    animation: sube-detalle 200ms ease both;
    transform: none;
  }
  @keyframes sube-detalle {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
}
</style>
