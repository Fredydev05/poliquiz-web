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
  SkipForward, Square, Trophy, Check, Maximize2,
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
const qrDataUrl = ref(null)      // chico, para la tarjeta del lobby
const qrDataUrlGrande = ref(null) // alta resolución, para el modal expandido
const showQrModal = ref(false)

/* Colores y formas Kahoot por índice de opción. */
const estilos = [
  { color: 'bg-coral', forma: 'triangulo' },
  { color: 'bg-azul', forma: 'rombo' },
  { color: 'bg-dorado', forma: 'circulo' },
  { color: 'bg-esmeralda', forma: 'cuadrado' },
]

onMounted(async () => {
  const pin = route.params.pin
  try {
    if (game.pin !== pin) {
      game.reset()
      await game.hydrate(pin)
    }
  } catch {
    // La sala ya no existe (terminó o expiró): limpiar y volver al dashboard.
    game.clearActive()
    router.replace('/dashboard')
    return
  }
  qrDataUrl.value = await QRCode.toDataURL(game.joinUrl, { width: 220, margin: 1 })
  qrDataUrlGrande.value = await QRCode.toDataURL(game.joinUrl, { width: 640, margin: 1 })
  cargando.value = false
  // Si el host entró con una pregunta ya corriendo (refresh), re-sincronizar.
  if (game.state === 'question') {
    timer.sync(game.endsAtMs, game.serverNowMs, game.question.time_limit)
  }
  window.addEventListener('keydown', cerrarModalConEscape)
})

// Al terminar normalmente (podium → ended) dejamos de ofrecer "retomar".
async function terminar() {
  await game.next()
  game.clearActive()
  router.push('/dashboard')
}

onUnmounted(() => {
  detenerConfeti()
  game.reset()
  window.removeEventListener('keydown', cerrarModalConEscape)
})

function cerrarModalConEscape(e) {
  if (e.key === 'Escape') showQrModal.value = false
}

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
// La encuesta no tiene correcta: en la revelación no se atenúa ni se resalta nada.
const esPoll = computed(() => game.question?.kind === 'poll')
// Escribe la respuesta: no tiene opciones; los alumnos tipean.
const esShort = computed(() => game.question?.kind === 'short')
// Rompecabezas: cada alumno ordena; al cerrar se muestra el orden correcto.
const esPuzzle = computed(() => game.question?.kind === 'puzzle')

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
        <button
          v-if="qrDataUrl"
          @click="showQrModal = true"
          class="group relative bg-white rounded-2xl p-3 shadow-2xl transition-transform hover:scale-[1.03] active:scale-95"
          title="Ampliar código QR"
        >
          <img :src="qrDataUrl" alt="QR para unirse" class="w-44 h-44" />
          <p class="text-marino text-[10px] text-center font-semibold -mt-1">escaneá para entrar</p>
          <!-- Overlay "ampliar" al pasar el mouse (gesto solo decorativo: en celular ya es táctil) -->
          <span class="absolute inset-0 rounded-2xl bg-marino/0 group-hover:bg-marino/5 flex items-center justify-center transition-colors">
            <Maximize2 :size="22" class="text-marino opacity-0 group-hover:opacity-60 transition-opacity" />
          </span>
        </button>
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

    <!-- ═════════ FASE: GET READY · reveal del enunciado (se lee antes de las opciones) ═════════ -->
    <div v-else-if="game.state === 'get_ready'" class="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <p class="text-white/50 text-lg uppercase tracking-widest anim-reveal-label">
        Pregunta {{ game.currentIndex + 1 }} / {{ game.questionsTotal }}
      </p>
      <h2 class="text-4xl lg:text-5xl font-extrabold leading-snug max-w-4xl anim-reveal-title">{{ game.revealTitle }}</h2>
      <img v-if="game.revealImage" :src="game.revealImage" class="max-h-52 rounded-xl shadow-lg object-contain anim-reveal-img" alt="" />
      <p class="text-white/40 text-sm uppercase tracking-[0.3em] anim-preparate">¡Preparate!</p>
    </div>

    <!-- ═════════ FASE: DIAPOSITIVA · el docente proyecta y explica ═════════ -->
    <div v-else-if="game.state === 'slide'" class="flex-1 flex flex-col p-6 gap-6">
      <div class="flex-1 flex flex-col items-center justify-center gap-6 text-center anim-reveal-title min-h-0 overflow-y-auto">
        <h2 class="text-4xl lg:text-5xl font-extrabold leading-snug max-w-4xl">{{ game.slide?.title }}</h2>
        <img v-if="game.slide?.image_url" :src="game.slide.image_url" class="max-h-56 rounded-xl shadow-lg object-contain" alt="" />
        <p class="text-xl lg:text-2xl text-white/80 leading-relaxed max-w-3xl whitespace-pre-wrap">{{ game.slide?.body }}</p>
      </div>
      <div class="flex justify-center shrink-0">
        <BaseButton variant="success" size="lg" @click="game.next()">
          <SkipForward :size="18" /> Siguiente
        </BaseButton>
      </div>
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
      <div v-if="!esShort && !esPuzzle" class="grid gap-4" :class="game.question?.kind === 'true_false' ? 'grid-cols-2' : 'grid-cols-2'">
        <div
          v-for="(op, i) in game.question?.options ?? []"
          :key="op.id"
          class="relative overflow-hidden flex items-center gap-4 rounded-xl font-bold shadow-md transition-all"
          :class="[
            game.question.kind === 'true_false' ? (i === 0 ? 'bg-azul p-7 text-2xl justify-center' : 'bg-coral p-7 text-2xl justify-center') : estilos[i].color + ' p-5 text-xl',
            game.state === 'results' && !esPoll && !esCorrecta(op.id) ? 'opacity-30' : '',
            game.state === 'results' && !esPoll && esCorrecta(op.id) ? 'ring-4 ring-white scale-[1.02]' : '',
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

      <!-- ESCRIBE LA RESPUESTA: sin opciones; los alumnos tipean, y al cerrar se revela -->
      <div v-if="esShort" class="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        <p v-if="game.state === 'question'" class="text-white/60 text-lg">✍️ Los estudiantes están escribiendo su respuesta…</p>
        <div v-else class="w-full max-w-2xl space-y-4">
          <div class="text-center">
            <p class="text-white/50 text-sm uppercase tracking-widest mb-2">
              Respuesta{{ (game.reveal?.accepted?.length ?? 0) > 1 ? 's' : '' }} aceptada{{ (game.reveal?.accepted?.length ?? 0) > 1 ? 's' : '' }}
            </p>
            <div class="flex flex-wrap justify-center gap-2">
              <span v-for="(a, i) in game.reveal?.accepted ?? []" :key="i" class="bg-esmeralda text-white font-bold rounded-lg px-4 py-2">{{ a }}</span>
            </div>
          </div>
          <div v-if="(game.reveal?.answers?.length ?? 0)" class="space-y-1.5">
            <p class="text-white/40 text-xs uppercase tracking-widest text-center">Lo que respondieron</p>
            <div v-for="(ans, i) in game.reveal.answers" :key="i" class="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2">
              <Check v-if="ans.correct" :size="16" class="text-esmeralda shrink-0" />
              <span v-else class="w-4 shrink-0"></span>
              <span class="flex-1 truncate" :class="ans.correct ? 'font-bold' : 'text-white/70'">{{ ans.text }}</span>
              <span class="text-sm bg-white/15 rounded-full px-2.5 py-0.5 tabular-nums shrink-0">{{ ans.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ROMPECABEZAS: cada alumno ordena; al cerrar se muestra el orden correcto -->
      <div v-if="esPuzzle" class="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        <p v-if="game.state === 'question'" class="text-white/60 text-lg">🧩 Los estudiantes están ordenando las piezas…</p>
        <div v-else class="w-full max-w-lg space-y-2">
          <p class="text-white/50 text-sm uppercase tracking-widest text-center mb-2">Orden correcto</p>
          <div v-for="(p, i) in game.reveal?.correct_order ?? []" :key="i" class="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
            <span class="w-8 h-8 rounded-lg bg-esmeralda text-white font-bold flex items-center justify-center shrink-0">{{ p.position }}</span>
            <span class="flex-1 font-semibold">{{ p.text }}</span>
          </div>
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

      <BaseButton variant="ghost" @click="terminar">
        Terminar y volver al dashboard
      </BaseButton>
    </div>

    <!-- ═════════ MODAL · QR AMPLIADO ═════════
         QR de alta resolución (640px, no un zoom CSS del chico) para que se
         pueda escanear cómodo desde el fondo del aula. Cierra con click
         afuera, la X o Escape. -->
    <div
      v-if="showQrModal"
      class="fixed inset-0 bg-marino/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 anim-qr-backdrop"
      @click.self="showQrModal = false"
    >
      <div class="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 anim-qr-modal max-w-full">
        <button
          @click="showQrModal = false"
          class="self-end -mt-4 -mr-4 text-slate-400 hover:text-marino transition-colors"
          title="Cerrar (Esc)"
        >
          <X :size="24" />
        </button>
        <img
          v-if="qrDataUrlGrande"
          :src="qrDataUrlGrande"
          alt="QR para unirse (ampliado)"
          class="w-[min(72vw,420px)] h-[min(72vw,420px)] -mt-6"
        />
        <p class="text-marino font-bold text-lg text-center">Escaneá para entrar</p>
        <p class="text-marino/60 text-sm font-semibold tabular-nums tracking-[0.2em]">PIN {{ game.pin }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal del QR ampliado: fondo con fade, tarjeta con pop sutil */
@keyframes qr-backdrop-entra { from { opacity: 0; } }
@keyframes qr-modal-entra {
  from { opacity: 0; transform: scale(0.94); }
}
.anim-qr-backdrop { animation: qr-backdrop-entra 150ms ease; }
.anim-qr-modal { animation: qr-modal-entra 200ms cubic-bezier(0.23, 1, 0.32, 1); }

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

/* Reveal del enunciado: label baja, título entra con scale, imagen sube */
@keyframes reveal-label-entra { from { opacity: 0; transform: translateY(-10px); } }
@keyframes reveal-title-entra { from { opacity: 0; transform: scale(0.94); } }
@keyframes reveal-img-entra { from { opacity: 0; transform: translateY(10px); } }
.anim-reveal-label { animation: reveal-label-entra 300ms ease-out both; }
.anim-reveal-title { animation: reveal-title-entra 400ms cubic-bezier(0.23, 1, 0.32, 1) both; }
.anim-reveal-img { animation: reveal-img-entra 400ms ease-out 120ms both; }

@media (prefers-reduced-motion: reduce) {
  .anim-pop, .anim-preparate, .anim-fila,
  .anim-reveal-label, .anim-reveal-title, .anim-reveal-img { animation: none; }
  .anim-podio-columna { animation: podio-aparece 200ms ease both; }
  .anim-qr-backdrop, .anim-qr-modal { animation: none; }
}
</style>
