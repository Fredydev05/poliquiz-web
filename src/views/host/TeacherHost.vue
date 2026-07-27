<script setup>
/*
  TeacherHost.vue · Pantalla que el profesor PROYECTA en clase.
  No usa el TeacherLayout: ocupa todo el espacio, como una proyección real.
  Fases (según store.gameState):
    'lobby'    → PIN gigante + estudiantes entrando "en tiempo real"
    'question' → pregunta actual + opciones + temporizador compartido
    'reveal'   → respuesta correcta resaltada + ranking
    'finished' → podio final
*/
import { computed, ref, watch, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import {
  Users, Play, SkipForward, Square, Trophy, X, Timer,
  Smartphone, Check, ArrowRight,
} from 'lucide-vue-next'
import BrandLogo from '../../components/ui/BrandLogo.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StickmanFestejo from '../../components/StickmanFestejo.vue'
import { useRouter } from 'vue-router'
import {
  useQuizStore, TIPOS_PREGUNTA, esRespuestaDeTexto,
} from '../../composables/useQuizStore'

const store = useQuizStore()
const router = useRouter()

// Cierra la partida y vuelve al dashboard (estado → store, URL → router).
function salirDePartida() {
  store.exitGame()
  router.push('/dashboard')
}

/* ==========================================================================
   CONFETI DEL PODIO (canvas-confetti)
   Ráfagas sincronizadas con la subida de columnas (3º→2º→1º), un estallido
   grande para el campeón y una lluvia suave que sigue mientras el podio
   esté en pantalla. Todos los timers se guardan para poder cancelarlos.
   ========================================================================== */
const COLORES_CONFETI = ['#e05a4d', '#2980b9', '#e6a817', '#27ae60', '#ffffff']
let confetiTimeouts = []
let confetiLluvia = null

function lanzarConfeti() {
  // Accesibilidad: sin confeti si el usuario pidió menos movimiento.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const t = (ms, fn) => confetiTimeouts.push(setTimeout(fn, ms))

  // Ráfagas laterales al ritmo de las columnas 3º (0ms) y 2º (150ms)
  t(350, () => confetti({ particleCount: 40, spread: 55, origin: { x: 0.7, y: 0.65 }, colors: COLORES_CONFETI }))
  t(500, () => confetti({ particleCount: 40, spread: 55, origin: { x: 0.3, y: 0.65 }, colors: COLORES_CONFETI }))
  // Gran estallido central cuando sube la columna del campeón (300ms + margen)
  t(700, () => confetti({ particleCount: 130, spread: 100, startVelocity: 40, origin: { x: 0.5, y: 0.55 }, colors: COLORES_CONFETI }))

  // Lluvia suave recurrente desde arriba, hasta cerrar la pantalla.
  confetiLluvia = setInterval(() => {
    confetti({
      particleCount: 16,
      spread: 80,
      startVelocity: 22,
      gravity: 0.9,
      scalar: 0.9,
      origin: { x: 0.2 + Math.random() * 0.6, y: 0.05 },
      colors: COLORES_CONFETI,
    })
  }, 2500)
}

var duration = 15 * 1000;
var animationEnd = Date.now() + duration;
var skew = 1;

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function lanzarConfetiDos() {
  (function frame() {
  var timeLeft = animationEnd - Date.now();
  var ticks = Math.max(200, 500 * (timeLeft / duration));
  skew = Math.max(0.8, skew - 0.001);

  confetti({
    particleCount: 1,
    startVelocity: 0,
    ticks: ticks,
    origin: {
      x: Math.random(),
      // since particles fall down, skew start toward the top
      y: (Math.random() * skew) - 0.2
    },
    colors: ['#ffffff'],
    shapes: ['circle'],
    gravity: randomInRange(0.4, 0.6),
    scalar: randomInRange(0.4, 1),
    drift: randomInRange(-0.4, 0.4)
  });

  if (timeLeft > 0) {
    requestAnimationFrame(frame);
  }
}());

}

function detenerConfeti() {
  confetiTimeouts.forEach(clearTimeout)
  confetiTimeouts = []
  clearInterval(confetiLluvia)
  confetiLluvia = null
  confetti.reset() // barre las partículas que quedaron en el aire
}

// Cuando el juego entra en 'finished' arranca la fiesta; al salir, se corta.
watch(store.gameState, (estado) => {
  if (estado === 'finished') {
    lanzarConfetiDos()
    lanzarConfeti()
  }
  else detenerConfeti()
})
onUnmounted(detenerConfeti)

// Colores + formas de las 4 opciones (mismo orden que el control del estudiante).
const estilos = [
  { color: 'bg-coral', forma: 'triangulo' },
  { color: 'bg-azul', forma: 'rombo' },
  { color: 'bg-dorado', forma: 'circulo' },
  { color: 'bg-esmeralda', forma: 'cuadrado' },
]

// % de la barra de tiempo (derivado del estado compartido del store).
const porcentajeTiempo = computed(() => {
  const q = store.currentQuestion.value
  return q ? (store.timeLeft.value / q.timeLimit) * 100 : 0
})

// Top 3 para el podio final.
const podio = computed(() => store.ranking.value.slice(0, 3))

/* ==========================================================================
   HELPERS POR TIPO DE PREGUNTA
   ========================================================================== */

const item = computed(() => store.currentQuestion.value)
const enReveal = computed(() => store.gameState.value === 'reveal')

// Solo las opciones con texto (las opcionales vacías no se proyectan).
const opcionesVisibles = computed(() =>
  item.value?.options
    .map((op, i) => ({ ...op, i }))
    .filter((op) => op.text.trim()) ?? []
)

// Total de votos simulados (para las barras de resultados).
const totalVotos = computed(() =>
  store.mockResults.value?.votos?.reduce((a, b) => a + b, 0) || 1
)

// Puzzle: piezas mezcladas para proyectar (se re-mezclan en cada pregunta).
const piezasMezcladas = ref([])
watch([() => store.currentQuestionIndex.value, () => store.gameState.value], () => {
  if (store.gameState.value === 'question' && item.value?.kind === 'puzzle') {
    piezasMezcladas.value = opcionesVisibles.value
      .map((op) => ({ ...op, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-marino text-white flex flex-col">

    <!-- Barra superior de la proyección -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <BrandLogo dark size="sm" />
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5 text-sm text-white/70">
          <Users :size="16" /> {{ store.players.value.length }} conectados
        </span>
        <button @click="salirDePartida()" class="text-white/50 hover:text-white transition-colors" title="Terminar partida">
          <X :size="20" />
        </button>
      </div>
    </header>

    <!-- ==================== FASE: LOBBY ==================== -->
    <div v-if="store.gameState.value === 'lobby'" class="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <div class="text-center">
        <p class="text-white/60 text-sm uppercase tracking-widest mb-2">Uníte al juego con el PIN</p>
        <p class="text-7xl font-extrabold tracking-[0.15em] tabular-nums bg-white text-marino rounded-2xl px-8 py-4 shadow-2xl">
          {{ store.gamePin.value }}
        </p>
        <p class="text-white/50 text-sm mt-3">{{ store.activeQuiz.value?.title }}</p>
      </div>

      <!-- Los jugadores aparecen solos: el store simula conexiones cada 1.2s.
           La entrada ("pop") es una animación CSS que corre al insertarse el
           nodo; el transition-group queda solo para el reacomodo (.pop-move). -->
      <div class="flex flex-wrap justify-center gap-2 max-w-lg min-h-12">
        <transition-group name="pop">
          <span
            v-for="p in store.players.value"
            :key="p.name"
            class="px-4 py-1.5 rounded-full font-semibold text-sm anim-pop"
            :class="p.isYou ? 'bg-dorado text-white' : 'bg-white/15'"
          >
            {{ p.name }}
          </span>
        </transition-group>
      </div>

      <BaseButton variant="success" size="lg" :disabled="!store.players.value.length" @click="store.launchQuestion()">
        <Play :size="20" /> Comenzar juego
      </BaseButton>
    </div>

    <!-- ============ FASE: PREGUNTA / REVELACIÓN ============ -->
    <div
      v-else-if="store.gameState.value === 'question' || store.gameState.value === 'reveal'"
      class="flex-1 flex flex-col p-6 gap-6"
    >
      <!-- Temporizador compartido (oculto en diapositivas: no tienen tiempo) -->
      <div class="flex items-center gap-3">
        <template v-if="item.kind !== 'slide'">
          <span class="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums shrink-0"
                :class="store.timeLeft.value <= 5 && store.gameState.value === 'question' ? 'text-coral animate-pulse' : ''">
            <Timer :size="24" /> {{ store.timeLeft.value }}s
          </span>
          <div class="flex-1 h-3 bg-white/15 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-linear"
              :class="store.timeLeft.value <= 5 ? 'bg-coral' : 'bg-esmeralda'"
              :style="{ width: porcentajeTiempo + '%' }"
            ></div>
          </div>
        </template>
        <span v-else class="flex-1"></span>

        <!-- Chips de contexto: tipo · puntaje especial · nº de pregunta -->
        <span class="text-xs bg-white/10 rounded-full px-2.5 py-1 text-white/70 shrink-0">
          {{ TIPOS_PREGUNTA[item.kind].label }}
        </span>
        <span v-if="item.points === 'double'" class="text-xs bg-dorado rounded-full px-2.5 py-1 font-bold shrink-0">
          ×2 Puntos dobles
        </span>
        <span v-else-if="item.points === 'none' || TIPOS_PREGUNTA[item.kind].grupo === 'opinion'" class="text-xs bg-white/10 rounded-full px-2.5 py-1 text-white/50 shrink-0">
          Sin puntos
        </span>
        <span class="text-white/50 text-sm shrink-0">
          {{ store.currentQuestionIndex.value + 1 }} / {{ store.activeQuiz.value.questions.length }}
        </span>
      </div>

      <!-- Enunciado grande (para leerse desde el fondo del aula) -->
      <div class="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        <h2 class="text-3xl lg:text-4xl font-extrabold text-center leading-snug">
          {{ item.title || 'Sin título' }}
        </h2>
        <!-- Multimedia de la pregunta (si tiene) -->
        <img
          v-if="item.media && (item.media.type === 'image' || item.media.type === 'gif')"
          :src="item.media.url" class="max-h-44 rounded-xl shadow-lg object-contain" alt=""
        />
        <video v-else-if="item.media?.type === 'video'" :src="item.media.url" controls class="max-h-44 rounded-xl"></video>
        <audio v-else-if="item.media?.type === 'audio'" :src="item.media.url" controls></audio>
        <!-- Cuerpo de la diapositiva -->
        <p v-if="item.kind === 'slide'" class="text-lg text-white/80 text-center max-w-2xl leading-relaxed">
          {{ item.text }}
        </p>
      </div>

      <!-- ═══════ ZONA DE RESPUESTAS: cambia según el tipo ═══════ -->

      <!-- QUIZ · ENCUESTA: opciones de colores (+ barras de votos al revelar) -->
      <div v-if="item.kind === 'quiz' || item.kind === 'poll'" class="grid grid-cols-2 gap-4">
        <div
          v-for="op in opcionesVisibles"
          :key="op.i"
          class="relative overflow-hidden flex items-center gap-4 p-5 rounded-xl text-xl font-bold shadow-md transition-all"
          :class="[
            estilos[op.i].color,
            enReveal && item.kind === 'quiz' && !op.correct ? 'opacity-30' : '',
            enReveal && item.kind === 'quiz' && op.correct ? 'ring-4 ring-white scale-[1.02]' : '',
          ]"
        >
          <svg viewBox="0 0 100 100" class="w-8 h-8 shrink-0 fill-white">
            <polygon v-if="estilos[op.i].forma === 'triangulo'" points="50,12 88,86 12,86" />
            <rect v-else-if="estilos[op.i].forma === 'cuadrado'" x="18" y="18" width="64" height="64" rx="6" />
            <circle v-else-if="estilos[op.i].forma === 'circulo'" cx="50" cy="50" r="36" />
            <polygon v-else points="50,8 92,50 50,92 8,50" />
          </svg>
          <span class="flex-1">{{ op.text }}</span>
          <!-- Votos simulados al revelar -->
          <span v-if="enReveal && store.mockResults.value?.votos" class="text-sm bg-white/25 rounded-full px-2.5 py-0.5 tabular-nums shrink-0">
            {{ store.mockResults.value.votos[op.i] }} votos
          </span>
          <div
            v-if="enReveal && store.mockResults.value?.votos"
            class="absolute bottom-0 left-0 h-1.5 bg-white/70 rounded-r transition-all duration-700"
            :style="{ width: (store.mockResults.value.votos[op.i] / totalVotos) * 100 + '%' }"
          ></div>
        </div>
      </div>

      <!-- VERDADERO / FALSO: dos tarjetas grandes -->
      <div v-else-if="item.kind === 'tf'" class="grid grid-cols-2 gap-4">
        <div
          v-for="(op, i) in item.options"
          :key="i"
          class="flex items-center justify-center gap-4 p-7 rounded-xl text-2xl font-extrabold shadow-md transition-all"
          :class="[
            i === 0 ? 'bg-azul' : 'bg-coral',
            enReveal && !op.correct ? 'opacity-30' : '',
            enReveal && op.correct ? 'ring-4 ring-white scale-[1.02]' : '',
          ]"
        >
          <svg viewBox="0 0 100 100" class="w-8 h-8 fill-white">
            <polygon v-if="i === 0" points="50,8 92,50 50,92 8,50" />
            <polygon v-else points="50,12 88,86 12,86" />
          </svg>
          {{ op.text }}
          <span v-if="enReveal && store.mockResults.value?.votos" class="text-sm bg-white/25 rounded-full px-2.5 py-1 tabular-nums font-semibold">
            {{ store.mockResults.value.votos[i] }} votos
          </span>
        </div>
      </div>

      <!-- PUZZLE: piezas mezcladas → orden correcto al revelar -->
      <div v-else-if="item.kind === 'puzzle'" class="max-w-2xl mx-auto w-full space-y-2">
        <template v-if="!enReveal">
          <div
            v-for="pieza in piezasMezcladas"
            :key="pieza.i"
            class="flex items-center gap-3 p-4 rounded-xl text-lg font-bold shadow-md"
            :class="estilos[pieza.i].color"
          >
            <span class="w-8 h-8 rounded-lg bg-white/25 flex items-center justify-center">?</span>
            {{ pieza.text }}
          </div>
          <p class="text-center text-white/50 text-sm pt-1 flex items-center justify-center gap-2">
            <Smartphone :size="15" /> Ordenalas en tu dispositivo
          </p>
        </template>
        <template v-else>
          <div
            v-for="(op, i) in opcionesVisibles"
            :key="op.i"
            class="flex items-center gap-3 p-4 rounded-xl text-lg font-bold shadow-md ring-2 ring-white/40"
            :class="estilos[op.i].color"
          >
            <span class="w-8 h-8 rounded-lg bg-white text-marino flex items-center justify-center">{{ i + 1 }}</span>
            {{ op.text }}
            <Check :size="20" class="ml-auto" stroke-width="3" />
          </div>
        </template>
      </div>

      <!-- RESPUESTA CORTA / NUBE / ABIERTA / LLUVIA: responden por texto -->
      <div v-else-if="esRespuestaDeTexto(item.kind)" class="max-w-2xl mx-auto w-full">
        <!-- Mientras corre el tiempo: indicación de responder en el celular -->
        <p v-if="!enReveal" class="text-center text-white/60 flex items-center justify-center gap-2 text-lg">
          <Smartphone :size="20" class="animate-pulse" /> Escribí tu respuesta en tu dispositivo…
        </p>

        <!-- Revelación según el tipo -->
        <template v-else>
          <!-- Respuesta corta: las respuestas aceptadas -->
          <div v-if="item.kind === 'short'" class="text-center space-y-2">
            <p class="text-white/50 text-sm uppercase tracking-wide">Respuestas aceptadas</p>
            <div class="flex flex-wrap justify-center gap-2">
              <span
                v-for="op in opcionesVisibles" :key="op.i"
                class="bg-esmeralda rounded-full px-4 py-1.5 font-bold flex items-center gap-1.5"
              >
                <Check :size="15" stroke-width="3" /> {{ op.text }}
              </span>
            </div>
          </div>

          <!-- Nube de palabras: chips con tamaño según peso -->
          <div v-else-if="item.kind === 'wordcloud'" class="flex flex-wrap justify-center items-center gap-3">
            <span
              v-for="(w, i) in store.mockResults.value?.words" :key="i"
              class="rounded-full px-4 py-1.5 font-bold"
              :class="w.isYou ? 'bg-dorado' : 'bg-white/15'"
              :style="{ fontSize: (0.8 + w.weight * 0.22) + 'rem' }"
            >
              {{ w.text }}
            </span>
          </div>

          <!-- Abierta / lluvia de ideas: tarjetas con autor -->
          <div v-else class="grid sm:grid-cols-2 gap-3">
            <div
              v-for="(r, i) in store.mockResults.value?.respuestas" :key="i"
              class="rounded-xl p-4"
              :class="r.isYou ? 'bg-dorado text-white' : 'bg-white/10'"
            >
              <p class="font-semibold leading-snug">“{{ r.text }}”</p>
              <p class="text-xs mt-1.5" :class="r.isYou ? 'text-white/80' : 'text-white/40'">— {{ r.author }}</p>
            </div>
          </div>
        </template>
      </div>

      <!-- Controles del docente -->
      <div class="flex justify-center gap-3">
        <!-- Diapositiva: solo avanzar -->
        <BaseButton v-if="item.kind === 'slide'" variant="success" @click="store.nextQuestion()">
          {{ store.isLastQuestion.value ? 'Ver podio final' : 'Continuar' }} <ArrowRight :size="18" />
        </BaseButton>
        <BaseButton v-else-if="store.gameState.value === 'question'" variant="danger" @click="store.endQuestion()">
          <Square :size="16" /> Cerrar respuestas
        </BaseButton>
        <BaseButton v-else variant="success" @click="store.nextQuestion()">
          <SkipForward :size="18" />
          {{ store.isLastQuestion.value ? 'Ver podio final' : 'Siguiente pregunta' }}
        </BaseButton>
      </div>

      <!-- Mini ranking visible durante la revelación -->
      <div v-if="store.gameState.value === 'reveal'" class="flex justify-center gap-3 flex-wrap">
        <span
          v-for="(p, i) in store.ranking.value.slice(0, 5)"
          :key="p.name"
          class="px-3 py-1 rounded-full text-sm font-semibold"
          :class="p.isYou ? 'bg-dorado' : 'bg-white/15'"
        >
          {{ i + 1 }}º {{ p.name }} · {{ p.score }}
        </span>
      </div>
    </div>

    <!-- ==================== FASE: PODIO FINAL ==================== -->
    <div v-else-if="store.gameState.value === 'finished'" class="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <h2 class="text-3xl font-extrabold flex items-center gap-3">
        <Trophy :size="32" class="text-dorado" /> ¡Podio final!
      </h2>

      <!-- Podio: 2º | 1º | 3º.
           Las columnas suben escalonadas en orden 3º → 2º → 1º (suspenso):
           el delay se calcula como (2 - pos) * 150ms. -->
      <div class="flex items-end gap-4">
        <div v-for="(pos, i) in [1, 0, 2]" :key="pos" class="text-center" v-show="podio[pos]">
          <!-- Stickman festejando: pose distinta por puesto, aparece cuando
               su columna ya subió y sigue festejando hasta cerrar la pantalla -->
          <StickmanFestejo
            :pose="pos === 0 ? 'campeon' : pos === 1 ? 'animo' : 'saludo'"
            :color="pos === 0 ? '#e6a817' : '#ffffff'"
            :delay="(2 - pos) * 150 + 350"
            class="mb-1"
          />
          <p
            class="font-bold mb-2 anim-podio-texto"
            :class="pos === 0 ? 'text-dorado text-xl' : 'text-white/80'"
            :style="{ animationDelay: (2 - pos) * 150 + 150 + 'ms' }"
          >
            {{ podio[pos]?.name }}
          </p>
          <div
            class="w-24 rounded-t-xl flex items-start justify-center pt-2 font-extrabold text-2xl anim-podio-columna"
            :class="[
              pos === 0 ? 'bg-dorado h-32' : pos === 1 ? 'bg-white/30 h-24' : 'bg-white/15 h-16',
            ]"
            :style="{ animationDelay: (2 - pos) * 150 + 'ms' }"
          >
            {{ pos + 1 }}º
          </div>
          <p
            class="text-white/60 text-sm mt-2 tabular-nums anim-podio-texto"
            :style="{ animationDelay: (2 - pos) * 150 + 150 + 'ms' }"
          >
            {{ podio[pos]?.score }} pts
          </p>
        </div>
      </div>

      <BaseButton variant="ghost" @click="salirDePartida()">Volver al dashboard</BaseButton>
    </div>
  </div>
</template>

<style scoped>
/* Entrada de los jugadores en el lobby: animación CSS al insertarse. */
@keyframes pop-entra {
  from {
    opacity: 0;
    transform: scale(0.6) translateY(8px);
  }
}
.anim-pop {
  animation: pop-entra 350ms ease;
}
/* Cuando el flex-wrap reacomoda las píldoras al entrar alguien, las demás
   se deslizan a su nueva posición en vez de saltar (FLIP automático de Vue). */
.pop-move {
  transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* ---- Podio final: las columnas "crecen" desde la base, escalonadas ---- */
@keyframes podio-sube {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes podio-aparece {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.anim-podio-columna {
  transform-origin: bottom; /* crece desde el piso, como un edificio */
  animation: podio-sube 400ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.anim-podio-texto {
  /* el nombre y los puntos aparecen 150ms después de su columna */
  animation: podio-aparece 250ms ease-out both;
}

/* Menos movimiento: el podio solo hace fade, sin crecer ni escalonarse. */
@media (prefers-reduced-motion: reduce) {
  .anim-podio-columna {
    animation: podio-aparece 200ms ease both;
  }
  .anim-pop {
    animation: podio-aparece 200ms ease; /* solo fade, sin escala */
  }
  .pop-move {
    transition: none;
  }
}
</style>
