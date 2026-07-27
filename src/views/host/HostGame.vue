<script setup>
/*
  HostGame.vue · Proyección REAL del docente — todas las fases del juego.
  --------------------------------------------------------------------------
  lobby → get_ready → question → results → leaderboard → … → podium
  El estado llega por eventos WS (store game); el temporizador se dibuja
  con el reloj del servidor (useServerTimer). El cierre siempre lo decide
  el backend: esta pantalla solo refleja.
*/
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import {
  Users, Play, X, Lock, LockOpen, UserX, Loader, Wifi, Timer,
  SkipForward, Square, Trophy, Check,
} from 'lucide-vue-next'
import BrandLogo from '../../components/ui/BrandLogo.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StickmanFestejo from '../../components/StickmanFestejo.vue'
import { useGameStore } from '../../stores/game'
import { useServerTimer } from '../../composables/useServerTimer'

const route = useRoute()
const router = useRouter()
const game = useGameStore()
const timer = useServerTimer()

const cargando = ref(true)
const qrDataUrl = ref(null)

/* Colores y formas Kahoot por índice de opción. */
const estilos = [
  { color: 'bg-coral', forma: 'triangulo' },
  { color: 'bg-azul', forma: 'rombo' },
  { color: 'bg-dorado', forma: 'circulo' },
  { color: 'bg-esmeralda', forma: 'cuadrado' },
]

onMounted(async () => {
  const pin = route.params.pin
  if (game.pin !== pin) {
    game.reset()
    await game.hydrate(pin)
  }
  qrDataUrl.value = await QRCode.toDataURL(game.joinUrl, { width: 220, margin: 1 })
  cargando.value = false
  // Si el host entró con una pregunta ya corriendo (refresh), re-sincronizar.
  if (game.state === 'question') {
    timer.sync(game.endsAtMs, game.serverNowMs, game.question.time_limit)
  }
})

onUnmounted(() => {
  detenerConfeti()
  game.reset()
})

// El temporizador arranca/re-arranca cuando el servidor lanza la pregunta.
watch(() => game.state, (estado) => {
  if (estado === 'question') {
    timer.sync(game.endsAtMs, game.serverNowMs, game.question.time_limit)
  } else {
    timer.stop()
  }
  if (estado === 'podium' && !game.aborted) lanzarConfeti()
  else detenerConfeti()
})

const conectados = computed(() => game.players.filter((p) => p.connected))
const totalVotos = computed(() =>
  game.distribution.reduce((acc, d) => acc + d.count, 0) || 1
)
const esCorrecta = (id) => game.correctOptionIds.includes(id)

async function salir() {
  await game.end()
  router.push('/dashboard')
}

/* ---------------- Confeti del podio (idéntico a la maqueta) ---------------- */
const COLORES_CONFETI = ['#e05a4d', '#2980b9', '#e6a817', '#27ae60', '#ffffff']
let confetiTimeouts = []
let confetiLluvia = null

function lanzarConfeti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const t = (ms, fn) => confetiTimeouts.push(setTimeout(fn, ms))
  t(350, () => confetti({ particleCount: 40, spread: 55, origin: { x: 0.7, y: 0.65 }, colors: COLORES_CONFETI }))
  t(500, () => confetti({ particleCount: 40, spread: 55, origin: { x: 0.3, y: 0.65 }, colors: COLORES_CONFETI }))
  t(700, () => confetti({ particleCount: 130, spread: 100, startVelocity: 40, origin: { x: 0.5, y: 0.55 }, colors: COLORES_CONFETI }))
  confetiLluvia = setInterval(() => {
    confetti({
      particleCount: 16, spread: 80, startVelocity: 22, gravity: 0.9, scalar: 0.9,
      origin: { x: 0.2 + Math.random() * 0.6, y: 0.05 }, colors: COLORES_CONFETI,
    })
  }, 2500)
}

function detenerConfeti() {
  confetiTimeouts.forEach(clearTimeout)
  confetiTimeouts = []
  clearInterval(confetiLluvia)
  confetiLluvia = null
  confetti.reset()
}
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-marino text-white flex flex-col">

    <!-- ═════════ Barra superior de la proyección ═════════ -->
    <header class="flex items-center justify-between px-6 py-3 border-b border-white/10">
      <BrandLogo dark size="sm" />
      <div class="flex items-center gap-4">
        <span v-if="game.state !== 'lobby'" class="text-sm text-white/50">
          Pregunta {{ game.currentIndex + 1 }} / {{ game.questionsTotal }}
        </span>
        <span class="flex items-center gap-1.5 text-sm text-white/70">
          <Users :size="16" /> {{ conectados.length }}
        </span>
        <button
          v-if="game.state === 'lobby'"
          @click="game.toggleLock()"
          class="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
          :class="game.locked ? 'bg-coral text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'"
        >
          <component :is="game.locked ? Lock : LockOpen" :size="15" />
          {{ game.locked ? 'Bloqueada' : 'Abierta' }}
        </button>
        <button @click="salir" class="text-white/50 hover:text-white transition-colors" title="Terminar partida">
          <X :size="20" />
        </button>
      </div>
    </header>

    <div v-if="cargando" class="flex-1 flex items-center justify-center">
      <Loader :size="36" class="animate-spin text-white/50" />
    </div>

    <!-- ═════════ FASE: LOBBY ═════════ -->
    <div v-else-if="game.state === 'lobby'" class="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <div class="flex items-center gap-8 flex-wrap justify-center">
        <div class="text-center">
          <p class="text-white/60 text-sm uppercase tracking-widest mb-2">Uníte al juego con el PIN</p>
          <p class="text-7xl font-extrabold tracking-[0.15em] tabular-nums bg-white text-marino rounded-2xl px-8 py-4 shadow-2xl">
            {{ game.pin }}
          </p>
          <p class="text-white/50 text-sm mt-3">{{ game.quizTitle }} · {{ game.questionsTotal }} preguntas</p>
        </div>
        <div class="bg-white rounded-2xl p-3 shadow-2xl">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR para unirse" class="w-44 h-44" />
          <p class="text-marino text-[10px] text-center font-semibold -mt-1">escaneá para entrar</p>
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-2 max-w-2xl min-h-12">
        <p v-if="game.players.length === 0" class="text-white/40 text-sm flex items-center gap-2">
          <Wifi :size="16" class="animate-pulse" /> Esperando estudiantes…
        </p>
        <button
          v-for="p in game.players"
          :key="p.uuid"
          @click="game.kick(p.uuid)"
          class="group px-4 py-1.5 rounded-full font-semibold text-sm anim-pop transition-all flex items-center gap-1.5"
          :class="p.connected ? 'bg-white/15 hover:bg-coral' : 'bg-white/5 text-white/40'"
          :title="'Expulsar a ' + p.nickname"
        >
          {{ p.nickname }}
          <UserX :size="13" class="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      <BaseButton variant="success" size="lg" :disabled="conectados.length === 0" @click="game.start()">
        <Play :size="20" /> Comenzar juego
      </BaseButton>
    </div>

    <!-- ═════════ FASE: GET READY ═════════ -->
    <div v-else-if="game.state === 'get_ready'" class="flex-1 flex flex-col items-center justify-center gap-6">
      <p class="text-white/50 text-lg uppercase tracking-widest">Pregunta {{ game.currentIndex + 1 }}</p>
      <p class="text-6xl font-extrabold anim-preparate">¡Preparate!</p>
    </div>

    <!-- ═════════ FASES: QUESTION / RESULTS ═════════ -->
    <div v-else-if="game.state === 'question' || game.state === 'results'" class="flex-1 flex flex-col p-6 gap-5">

      <!-- Temporizador servidor-autoritativo + progreso de respuestas -->
      <div class="flex items-center gap-3">
        <template v-if="game.state === 'question'">
          <span class="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums shrink-0"
                :class="timer.isUrgent.value ? 'text-coral animate-pulse' : ''">
            <Timer :size="24" /> {{ timer.seconds.value }}s
          </span>
          <div class="flex-1 h-3 bg-white/15 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full timer-bar"
              :class="timer.isUrgent.value ? 'bg-coral' : 'bg-esmeralda'"
              :style="{ width: timer.percent.value + '%' }"
            ></div>
          </div>
        </template>
        <span v-else class="flex-1"></span>
        <span class="text-sm bg-white/10 rounded-full px-3 py-1 text-white/70 shrink-0 tabular-nums">
          {{ game.answeredCount }} / {{ game.players.length }} respondieron
        </span>
        <span v-if="game.question?.points_mode === 'double'" class="text-xs bg-dorado rounded-full px-2.5 py-1 font-bold shrink-0">
          ×2 Puntos dobles
        </span>
      </div>

      <!-- Enunciado + imagen -->
      <div class="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        <h2 class="text-3xl lg:text-4xl font-extrabold text-center leading-snug">
          {{ game.question?.title }}
        </h2>
        <img
          v-if="game.question?.image_url"
          :src="game.question.image_url"
          class="max-h-44 rounded-xl shadow-lg object-contain" alt=""
        />
      </div>

      <!-- Opciones (V/F usa 2 columnas grandes; quiz usa la grilla 2x2) -->
      <div class="grid gap-4" :class="game.question?.kind === 'true_false' ? 'grid-cols-2' : 'grid-cols-2'">
        <div
          v-for="(op, i) in game.question?.options ?? []"
          :key="op.id"
          class="relative overflow-hidden flex items-center gap-4 rounded-xl font-bold shadow-md transition-all"
          :class="[
            game.question.kind === 'true_false' ? (i === 0 ? 'bg-azul p-7 text-2xl justify-center' : 'bg-coral p-7 text-2xl justify-center') : estilos[i].color + ' p-5 text-xl',
            game.state === 'results' && !esCorrecta(op.id) ? 'opacity-30' : '',
            game.state === 'results' && esCorrecta(op.id) ? 'ring-4 ring-white scale-[1.02]' : '',
          ]"
        >
          <svg viewBox="0 0 100 100" class="w-8 h-8 shrink-0 fill-white">
            <template v-if="game.question.kind === 'true_false'">
              <polygon v-if="i === 0" points="50,8 92,50 50,92 8,50" />
              <polygon v-else points="50,12 88,86 12,86" />
            </template>
            <template v-else>
              <polygon v-if="estilos[i].forma === 'triangulo'" points="50,12 88,86 12,86" />
              <polygon v-else-if="estilos[i].forma === 'rombo'" points="50,8 92,50 50,92 8,50" />
              <circle v-else-if="estilos[i].forma === 'circulo'" cx="50" cy="50" r="36" />
              <rect v-else x="18" y="18" width="64" height="64" rx="6" />
            </template>
          </svg>
          <span class="flex-1" :class="game.question.kind === 'true_false' ? 'flex-none' : ''">{{ op.text }}</span>

          <!-- Revelación: check + votos + barra de distribución -->
          <template v-if="game.state === 'results'">
            <Check v-if="esCorrecta(op.id)" :size="26" stroke-width="3.5" class="shrink-0" />
            <span class="text-sm bg-white/25 rounded-full px-2.5 py-0.5 tabular-nums shrink-0">
              {{ game.distribution.find((d) => d.option_id === op.id)?.count ?? 0 }} votos
            </span>
            <div
              class="absolute bottom-0 left-0 h-1.5 bg-white/70 rounded-r transition-all duration-700"
              :style="{ width: ((game.distribution.find((d) => d.option_id === op.id)?.count ?? 0) / totalVotos) * 100 + '%' }"
            ></div>
          </template>
        </div>
      </div>

      <!-- Controles del docente -->
      <div class="flex justify-center gap-3">
        <BaseButton v-if="game.state === 'question'" variant="danger" @click="game.next()" :disabled="true" title="La pregunta cierra sola (timeout o todos respondieron)">
          <Square :size="16" /> Esperando respuestas…
        </BaseButton>
        <BaseButton v-else variant="success" @click="game.next()">
          <SkipForward :size="18" />
          {{ game.isLastQuestion ? 'Ver podio final' : 'Ver ranking' }}
        </BaseButton>
      </div>
    </div>

    <!-- ═════════ FASE: LEADERBOARD ═════════ -->
    <div v-else-if="game.state === 'leaderboard'" class="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <h2 class="text-3xl font-extrabold">Ranking</h2>
      <div class="w-full max-w-lg space-y-2">
        <div
          v-for="(p, i) in game.top"
          :key="p.uuid"
          class="flex items-center gap-4 rounded-xl px-5 py-3 anim-fila"
          :class="i === 0 ? 'bg-dorado text-white' : 'bg-white/10'"
          :style="{ animationDelay: i * 120 + 'ms' }"
        >
          <span class="text-xl font-extrabold w-8">{{ i + 1 }}º</span>
          <span class="flex-1 font-bold text-lg truncate">{{ p.nickname }}</span>
          <span v-if="p.delta > 0" class="text-sm font-semibold" :class="i === 0 ? 'text-white/80' : 'text-esmeralda'">+{{ p.delta }}</span>
          <span class="font-extrabold tabular-nums text-lg">{{ p.score }}</span>
        </div>
      </div>
      <BaseButton variant="success" @click="game.next()">
        <SkipForward :size="18" />
        {{ game.isLastQuestion ? 'Ver podio final' : 'Siguiente pregunta' }}
      </BaseButton>
    </div>

    <!-- ═════════ FASE: PODIO ═════════ -->
    <div v-else-if="game.state === 'podium'" class="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <h2 class="text-3xl font-extrabold flex items-center gap-3">
        <Trophy :size="32" class="text-dorado" /> ¡Podio final!
      </h2>

      <!-- Columnas 2º | 1º | 3º con stickmans festejando (de la maqueta) -->
      <div class="flex items-end gap-4">
        <div v-for="pos in [1, 0, 2]" :key="pos" class="text-center" v-show="game.podium[pos]">
          <StickmanFestejo
            :pose="pos === 0 ? 'campeon' : pos === 1 ? 'animo' : 'saludo'"
            :color="pos === 0 ? '#e6a817' : '#ffffff'"
            :delay="(2 - pos) * 150 + 350"
            class="mb-1"
          />
          <p class="font-bold mb-2 anim-podio-texto" :class="pos === 0 ? 'text-dorado text-xl' : 'text-white/80'"
             :style="{ animationDelay: (2 - pos) * 150 + 150 + 'ms' }">
            {{ game.podium[pos]?.nickname }}
          </p>
          <div
            class="w-24 rounded-t-xl flex items-start justify-center pt-2 font-extrabold text-2xl anim-podio-columna"
            :class="pos === 0 ? 'bg-dorado h-32' : pos === 1 ? 'bg-white/30 h-24' : 'bg-white/15 h-16'"
            :style="{ animationDelay: (2 - pos) * 150 + 'ms' }"
          >
            {{ pos + 1 }}º
          </div>
          <p class="text-white/60 text-sm mt-2 tabular-nums anim-podio-texto" :style="{ animationDelay: (2 - pos) * 150 + 150 + 'ms' }">
            {{ game.podium[pos]?.score }} pts
          </p>
        </div>
      </div>

      <BaseButton variant="ghost" @click="game.next().then(() => router.push('/dashboard'))">
        Terminar y volver al dashboard
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
/* Píldoras del lobby */
@keyframes pop-entra {
  from { opacity: 0; transform: scale(0.6) translateY(8px); }
}
.anim-pop { animation: pop-entra 350ms ease; }

/* "¡Preparate!" late al ritmo del countdown */
@keyframes late {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
.anim-preparate { animation: late 1s ease-in-out infinite; }

/* Barra de tiempo: la mueve rAF, sin transition (el ancho ya es continuo) */
.timer-bar { transition: none; }

/* Filas del ranking entran escalonadas */
@keyframes fila-entra {
  from { opacity: 0; transform: translateX(-16px); }
}
.anim-fila { animation: fila-entra 350ms cubic-bezier(0.23, 1, 0.32, 1) both; }

/* Podio (idéntico a la maqueta) */
@keyframes podio-sube { from { transform: scaleY(0); } }
@keyframes podio-aparece { from { opacity: 0; } }
.anim-podio-columna {
  transform-origin: bottom;
  animation: podio-sube 400ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.anim-podio-texto { animation: podio-aparece 250ms ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .anim-pop, .anim-preparate, .anim-fila { animation: none; }
  .anim-podio-columna { animation: podio-aparece 200ms ease both; }
}
</style>
