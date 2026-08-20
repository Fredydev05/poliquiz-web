<script setup>
/*
  StudentAnswer.vue · Control de respuesta REAL (Mobile).
  Solo colores y formas (el texto se lee en la proyección):
   · quiz simple / V-F → tocás un botón y se envía
   · quiz múltiple     → marcás varias y enviás
  Tras responder: pantalla de espera hasta la revelación.
*/
import { ref, computed, watch } from 'vue'
import { User, Timer, Send, Hourglass, Zap, GripVertical, ChevronUp, ChevronDown } from 'lucide-vue-next'
import BaseButton from '../../components/ui/BaseButton.vue'
import { usePlayerStore } from '../../stores/player'
import { useServerTimer } from '../../composables/useServerTimer'

const player = usePlayerStore()
const timer = useServerTimer()

const botones = [
  { color: 'bg-coral', forma: 'triangulo' },
  { color: 'bg-azul', forma: 'rombo' },
  { color: 'bg-dorado', forma: 'circulo' },
  { color: 'bg-esmeralda', forma: 'cuadrado' },
]

const esVF = computed(() => player.question?.kind === 'true_false')
const esMulti = computed(() => player.question?.kind === 'multi')
const esPoll = computed(() => player.question?.kind === 'poll')
const esShort = computed(() => player.question?.kind === 'short')
const esPuzzle = computed(() => player.question?.kind === 'puzzle')
const seleccionadas = ref([])
const textoRespuesta = ref('')
const piezas = ref([])           // piezas del rompecabezas en el orden ACTUAL
const arrastrando = ref(null)    // id de la pieza que se está arrastrando
const contenedor = ref(null)

// Sincronizar el timer cuando cambia la pregunta (o al montar tras refresh).
watch(
  () => player.questionUuid,
  () => {
    seleccionadas.value = []
    textoRespuesta.value = ''
    piezas.value = (player.question?.options ?? []).map((o) => ({ ...o }))
    if (player.question) {
      timer.sync(player.endsAtMs, player.serverNowMs, player.question.time_limit)
    }
  },
  { immediate: true },
)

function toggle(id) {
  const i = seleccionadas.value.indexOf(id)
  i >= 0 ? seleccionadas.value.splice(i, 1) : seleccionadas.value.push(id)
}

function enviarTexto() {
  const t = textoRespuesta.value.trim()
  if (t) player.answerText(t)
}

/* ---- Rompecabezas: arrastrar (pointer, funciona en touch) + flechas ---- */
function onDown(e, id) {
  arrastrando.value = id
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function onMove(e) {
  if (arrastrando.value === null) return
  const from = piezas.value.findIndex((p) => p.id === arrastrando.value)
  if (from < 0) return
  const cards = [...(contenedor.value?.querySelectorAll('[data-pieza]') ?? [])]
  let to = cards.findIndex((c) => {
    const r = c.getBoundingClientRect()
    return e.clientY < r.top + r.height / 2
  })
  if (to === -1) to = piezas.value.length - 1
  if (to !== from) {
    const [m] = piezas.value.splice(from, 1)
    piezas.value.splice(to, 0, m)
  }
}
function onUp() { arrastrando.value = null }
function mover(i, dir) {
  const j = i + dir
  if (j < 0 || j >= piezas.value.length) return
  const [m] = piezas.value.splice(i, 1)
  piezas.value.splice(j, 0, m)
}
function enviarOrden() {
  player.answerOrder(piezas.value.map((p) => p.id))
}
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-slate-100 flex flex-col max-w-md mx-auto">

    <!-- Header: apodo + tiempo + puntaje -->
    <header class="bg-marino text-white px-4 py-3 flex items-center justify-between">
      <span class="text-sm font-medium truncate flex items-center gap-1.5">
        <User :size="15" /> {{ player.nickname }}
      </span>
      <span class="font-extrabold tabular-nums flex items-center gap-1"
            :class="timer.isUrgent.value ? 'text-coral animate-pulse' : ''">
        <Timer :size="17" /> {{ timer.seconds.value }}s
      </span>
      <span class="text-sm text-dorado font-bold tabular-nums flex items-center gap-1">
        <Zap v-if="player.streak >= 2" :size="14" /> {{ player.score }} pts
      </span>
    </header>

    <!-- Barra de tiempo servidor-autoritativa -->
    <div class="h-2 bg-slate-300">
      <div
        class="h-full"
        :class="timer.isUrgent.value ? 'bg-coral' : 'bg-esmeralda'"
        :style="{ width: timer.percent.value + '%' }"
      ></div>
    </div>

    <!-- ═══ Ya respondió: esperando la revelación ═══ -->
    <div v-if="player.answered" class="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500 p-6 text-center">
      <Hourglass :size="44" class="text-marino/40 animate-pulse" />
      <p class="font-bold text-marino text-lg">¡Respuesta enviada!</p>
      <p class="text-sm">Esperando que respondan todos o que termine el tiempo…</p>
    </div>

    <!-- ═══ VERDADERO / FALSO ═══ -->
    <template v-else-if="esVF">
      <p class="text-center text-slate-500 text-sm py-4">¿Verdadero o falso?</p>
      <div class="grid grid-cols-2 gap-3 p-4 flex-1 content-stretch">
        <button
          v-for="(op, i) in player.question.options"
          :key="op.id"
          @click="player.answer([op.id])"
          class="rounded-xl shadow-md flex flex-col items-center justify-center gap-3 min-h-44
                 text-white font-extrabold text-xl transition-all hover:brightness-110 active:scale-95"
          :class="i === 0 ? 'bg-azul' : 'bg-coral'"
        >
          <svg viewBox="0 0 100 100" class="w-12 h-12 fill-white drop-shadow">
            <polygon v-if="i === 0" points="50,8 92,50 50,92 8,50" />
            <polygon v-else points="50,12 88,86 12,86" />
          </svg>
          {{ op.text }}
        </button>
      </div>
    </template>

    <!-- ═══ ESCRIBE LA RESPUESTA: input de texto ═══ -->
    <template v-else-if="esShort">
      <p class="text-center text-slate-500 text-sm py-4">Escribí tu respuesta</p>
      <form @submit.prevent="enviarTexto" class="flex-1 flex flex-col justify-center gap-4 p-4">
        <input
          v-model="textoRespuesta"
          type="text"
          maxlength="120"
          placeholder="Tu respuesta…"
          class="w-full rounded-xl border-2 border-slate-300 px-4 py-4 text-lg text-center text-marino font-semibold focus:outline-none focus:border-marino"
        />
        <BaseButton type="submit" variant="success" size="lg" block :disabled="!textoRespuesta.trim()">
          <Send :size="18" /> Enviar
        </BaseButton>
      </form>
    </template>

    <!-- ═══ ROMPECABEZAS: arrastrar piezas para ordenar ═══ -->
    <template v-else-if="esPuzzle">
      <p class="text-center text-slate-500 text-sm py-4">Arrastrá para ordenar y enviá</p>
      <div ref="contenedor" class="flex-1 flex flex-col gap-2 px-4 overflow-y-auto">
        <TransitionGroup name="pieza">
          <div
            v-for="(p, i) in piezas" :key="p.id"
            data-pieza
            @pointerdown="onDown($event, p.id)"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
            class="flex items-center gap-3 rounded-xl p-4 text-white font-bold shadow-md select-none touch-none transition duration-300 cursor-grab active:cursor-grabbing"
            :class="[botones[i % 4].color, arrastrando === p.id ? 'scale-105 shadow-xl relative z-10' : '']"
          >
            <GripVertical :size="18" class="opacity-70 shrink-0" />
            <span class="flex-1">{{ p.text }}</span>
            <div class="flex flex-col shrink-0 -my-1">
              <button @pointerdown.stop @click="mover(i, -1)" :disabled="i === 0" class="disabled:opacity-30 p-0.5" title="Subir"><ChevronUp :size="18" /></button>
              <button @pointerdown.stop @click="mover(i, 1)" :disabled="i === piezas.length - 1" class="disabled:opacity-30 p-0.5" title="Bajar"><ChevronDown :size="18" /></button>
            </div>
          </div>
        </TransitionGroup>
      </div>
      <div class="p-4">
        <BaseButton variant="success" size="lg" block @click="enviarOrden">
          <Send :size="18" /> Enviar
        </BaseButton>
      </div>
    </template>

    <!-- ═══ QUIZ MÚLTIPLE: marcar varias + enviar ═══ -->
    <template v-else-if="esMulti">
      <p class="text-center text-slate-500 text-sm py-4">Marcá TODAS las correctas y enviá</p>
      <div class="grid grid-cols-2 gap-3 px-4 flex-1 content-stretch">
        <button
          v-for="(op, i) in player.question.options"
          :key="op.id"
          @click="toggle(op.id)"
          class="rounded-xl shadow-md flex items-center justify-center min-h-28 transition-all active:scale-95"
          :class="[botones[i].color, seleccionadas.includes(op.id) ? 'ring-4 ring-marino scale-[0.97]' : 'opacity-80']"
        >
          <svg viewBox="0 0 100 100" class="w-12 h-12 fill-white drop-shadow">
            <polygon v-if="botones[i].forma === 'triangulo'" points="50,12 88,86 12,86" />
            <polygon v-else-if="botones[i].forma === 'rombo'" points="50,8 92,50 50,92 8,50" />
            <circle v-else-if="botones[i].forma === 'circulo'" cx="50" cy="50" r="36" />
            <rect v-else x="18" y="18" width="64" height="64" rx="6" />
          </svg>
        </button>
      </div>
      <div class="p-4">
        <BaseButton variant="success" size="lg" block :disabled="!seleccionadas.length" @click="player.answer(seleccionadas)">
          <Send :size="18" /> Enviar ({{ seleccionadas.length }})
        </BaseButton>
      </div>
    </template>

    <!-- ═══ QUIZ SIMPLE / ENCUESTA: cuadrícula clásica de colores ═══ -->
    <template v-else>
      <p class="text-center text-slate-500 text-sm py-4">
        {{ esPoll ? 'Elegí tu opinión' : '¡Elegí rápido, la velocidad vale puntos!' }}
      </p>
      <div class="grid grid-cols-2 gap-3 p-4 flex-1 content-stretch">
        <button
          v-for="(op, i) in player.question?.options ?? []"
          :key="op.id"
          @click="player.answer([op.id])"
          class="rounded-xl shadow-md flex items-center justify-center min-h-32
                 transition-all hover:brightness-110 active:scale-95"
          :class="botones[i].color"
        >
          <svg viewBox="0 0 100 100" class="w-14 h-14 fill-white drop-shadow">
            <polygon v-if="botones[i].forma === 'triangulo'" points="50,12 88,86 12,86" />
            <polygon v-else-if="botones[i].forma === 'rombo'" points="50,8 92,50 50,92 8,50" />
            <circle v-else-if="botones[i].forma === 'circulo'" cx="50" cy="50" r="36" />
            <rect v-else x="18" y="18" width="64" height="64" rx="6" />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Vue anima el reordenamiento (FLIP) de las piezas del rompecabezas al arrastrar. */
.pieza-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
