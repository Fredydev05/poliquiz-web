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
  PartyPopper, Frown, AlarmClockOff, Trophy, LogOut, Hourglass, Zap, XCircle, Vote, Puzzle, MessageSquareText,
} from 'lucide-vue-next'
import BaseButton from '../../components/ui/BaseButton.vue'
import { usePlayerStore } from '../../stores/player'

const player = usePlayerStore()

const finished = computed(() => player.gameState === 'podium')
const r = computed(() => player.lastResult)
// Encuesta: no hay correcta, solo se agradece el voto.
// Sin puntaje (encuesta, nube, abierta, ideas): no hay correcta, solo se agradece.
const esEncuesta = computed(() => r.value?.scored === false)
const esVoto = computed(() => player.question?.kind === 'poll')
const tituloSinPuntos = computed(() =>
  esVoto.value
    ? (r.value?.answered ? '¡Voto registrado!' : 'No votaste')
    : (r.value?.answered ? '¡Respuesta enviada!' : 'No respondiste'),
)
// Rompecabezas con algunas piezas bien: suma puntos aunque no sea perfecto.
const esParcial = computed(() => !!r.value && !r.value.is_correct && r.value.ratio > 0)
const fondo = computed(() =>
  finished.value || esEncuesta.value ? 'bg-marino'
    : r.value?.is_correct ? 'bg-esmeralda'
    : esParcial.value ? 'bg-dorado'
    : 'bg-coral',
)
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 max-w-md mx-auto text-white transition-colors"
    :class="fondo"
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

      <!-- ═══ SIN PUNTAJE (encuesta y respuesta libre): no cambia puntos ni racha ═══ -->
      <template v-else-if="esEncuesta">
        <component :is="esVoto ? Vote : MessageSquareText" :size="56" class="mx-auto anim-celebracion" />
        <div class="anim-detalle">
          <h1 class="text-3xl font-extrabold">{{ tituloSinPuntos }}</h1>
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

      <!-- ═══════ RESULTADO DE LA PREGUNTA ═══════ -->
      <template v-else>
        <PartyPopper v-if="r?.is_correct" :size="56" class="mx-auto anim-celebracion" />
        <Puzzle v-else-if="esParcial" :size="56" class="mx-auto anim-celebracion" />
        <Frown v-else-if="r?.answered !== false && r" :size="56" class="mx-auto anim-celebracion" />
        <AlarmClockOff v-else :size="56" class="mx-auto anim-celebracion" />

        <div class="anim-detalle">
          <h1 class="text-3xl font-extrabold">
            {{ r?.is_correct ? '¡Correcto!' : esParcial ? '¡Casi!' : r && r.answered !== false ? 'Incorrecto' : '¡Tiempo agotado!' }}
          </h1>
          <p v-if="esParcial" class="text-white/90 text-sm mt-1">
            {{ Math.round(r.ratio * 100) }}% de las piezas en su lugar
          </p>
          <p v-if="(r?.is_correct || esParcial) && r.points" class="text-white/90 text-xl font-bold mt-2">
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
