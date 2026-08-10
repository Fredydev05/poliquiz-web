<script setup>
/*
  TeacherEditor.vue · EDITOR DE CUESTIONARIOS estilo Kahoot — conectado a la API.
  ---------------------------------------------------------------------------
  Layout de 3 zonas (rail izquierdo · lienzo central · panel derecho).
  El borrador vive en el store Pinia (quizStore.editing, formato editor) y un
  watcher dispara el AUTOGUARDADO real (PUT /quizzes/{id} con debounce).
  Las preguntas incompletas no viajan al servidor hasta estar terminadas.

  v1 juega con 3 tipos: Quiz (simple/múltiple) y Verdadero-Falso.
  Los demás tipos del catálogo aparecen deshabilitados como "v2".
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Plus, Check, Clock, Trash2, Copy, GripVertical, X, Eye,
  Image as ImageIcon, LayoutGrid, Scale, Type, Puzzle,
  BarChart3, Cloud, MessageSquareText, Lightbulb, Save,
  CloudUpload, ChevronDown, Sparkles, Award, AlertTriangle, Loader,
} from 'lucide-vue-next'
import BaseButton from '../../components/ui/BaseButton.vue'
import AssistantPanel from './AssistantPanel.vue'
import { useQuizApiStore, esPreguntaCompleta } from '../../stores/quiz'

const route = useRoute()
const router = useRouter()
const quizStore = useQuizApiStore()

/* ------------------- Catálogo de tipos (v1 + próximos) ------------------- */
const TIPOS = {
  quiz: { label: 'Quiz', icon: LayoutGrid, v1: true, desc: 'Hasta 4 opciones de colores; simple o selección múltiple' },
  tf: { label: 'Verdadero o falso', icon: Scale, v1: true, desc: 'Dos opciones fijas: Verdadero / Falso' },
  short: { label: 'Respuesta corta', icon: Type, v1: false, desc: 'Llega en la versión 2' },
  puzzle: { label: 'Puzzle', icon: Puzzle, v1: false, desc: 'Llega en la versión 2' },
  poll: { label: 'Encuesta', icon: BarChart3, v1: false, desc: 'Llega en la versión 2' },
  wordcloud: { label: 'Nube de palabras', icon: Cloud, v1: false, desc: 'Llega en la versión 2' },
  open: { label: 'Pregunta abierta', icon: MessageSquareText, v1: false, desc: 'Llega en la versión 2' },
  brainstorm: { label: 'Lluvia de ideas', icon: Lightbulb, v1: false, desc: 'Llega en la versión 2' },
}
const TIEMPOS = [
  { value: 5, label: '5 segundos' }, { value: 10, label: '10 segundos' },
  { value: 20, label: '20 segundos' }, { value: 30, label: '30 segundos' },
  { value: 60, label: '1 minuto' }, { value: 90, label: '1 minuto 30 s' },
  { value: 120, label: '2 minutos' }, { value: 240, label: '4 minutos' },
]
const PUNTAJES = [
  { value: 'standard', label: 'Estándar' },
  { value: 'double', label: 'Puntos dobles' },
  { value: 'none', label: 'Sin puntos' },
]
const coloresOpcion = ['bg-coral', 'bg-azul', 'bg-dorado', 'bg-esmeralda']
const formasOpcion = ['triangulo', 'rombo', 'circulo', 'cuadrado']

/* ------------------------------- Carga ------------------------------- */
const cargando = ref(true)
onMounted(async () => {
  await quizStore.openQuiz(Number(route.params.id))
  selectedId.value = quizStore.editing?.questions[0]?.id ?? null
  cargando.value = false
})

const quiz = computed(() => quizStore.editing)

/* ------------------------------ Selección ------------------------------ */
const selectedId = ref(null)
const item = computed(() =>
  quiz.value?.questions.find((it) => it.id === selectedId.value) ?? null
)

/* -------------------------- Autoguardado real -------------------------- */
// Cualquier cambio del borrador agenda un PUT (debounce en el store).
watch(quiz, () => {
  if (!cargando.value) quizStore.scheduleSave()
}, { deep: true })

// Al salir del editor, forzamos el último guardado pendiente.
onBeforeUnmount(() => quizStore.saveNow())

async function salir() {
  await quizStore.saveNow()
  router.push('/dashboard')
}

/* ------------------------- Timeline: drag & drop ------------------------- */
const dragIndex = ref(null)
const dragOver = ref(null)

function onDrop(to) {
  if (dragIndex.value !== null && dragIndex.value !== to) {
    quizStore.moveItem(dragIndex.value, to)
  }
  dragIndex.value = null
  dragOver.value = null
}

/* --------------------- Selector de tipo de pregunta --------------------- */
const showTypePicker = ref(false)
const pickerMode = ref('add') // 'add' | 'change'

function abrirPicker(mode) {
  pickerMode.value = mode
  showTypePicker.value = true
}
function elegirTipo(kind) {
  if (!TIPOS[kind].v1) return // los tipos v2 están deshabilitados
  showTypePicker.value = false
  if (pickerMode.value === 'add') {
    selectedId.value = quizStore.addItem(kind)
  } else if (item.value) {
    quizStore.changeKind(item.value, kind)
  }
}

/* ----------------------- Acciones sobre el ítem ----------------------- */
function duplicar() {
  if (item.value) selectedId.value = quizStore.duplicateItem(item.value.id)
}
function eliminar() {
  if (!item.value) return
  const lista = quiz.value.questions
  const idx = lista.findIndex((it) => it.id === item.value.id)
  quizStore.removeItem(item.value.id)
  selectedId.value = (lista[idx] ?? lista[idx - 1])?.id ?? null
}
function setCorrect(i) {
  item.value.options.forEach((op, j) => (op.correct = j === i))
}
function toggleCorrect(i) {
  item.value.options[i].correct = !item.value.options[i].correct
}

/* ------------------------- Imagen de la pregunta ------------------------- */
const inputImagen = ref(null)
const subiendoImagen = ref(false)

async function onImagenElegida(event) {
  const file = event.target.files?.[0]
  if (!file || !item.value) return
  subiendoImagen.value = true
  try {
    await quizStore.uploadQuestionImage(item.value, file)
  } finally {
    subiendoImagen.value = false
    event.target.value = '' // permite volver a elegir el mismo archivo
  }
}

/* ------------------------------ Vista previa ------------------------------ */
const showPreview = ref(false)
const etiquetaTiempo = (v) => TIEMPOS.find((t) => t.value === v)?.label ?? v + 's'

/* ------------------------------ Asistente IA ------------------------------ */
const showAssistant = ref(false)
</script>

<template>
  <!-- Estado de carga inicial -->
  <div v-if="cargando" class="h-full flex items-center justify-center text-slate-400">
    <Loader :size="32" class="animate-spin" />
  </div>

  <div v-else-if="quiz" class="h-full flex flex-col bg-slate-100 overflow-hidden">

    <!-- ════════════════════ BARRA SUPERIOR ════════════════════ -->
    <header class="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 shrink-0">
      <button
        @click="salir"
        class="flex items-center gap-1 text-sm text-slate-500 hover:text-marino transition-colors shrink-0"
      >
        <ArrowLeft :size="16" /> Salir
      </button>

      <input
        v-model="quiz.title"
        class="font-bold text-marino border border-transparent hover:border-slate-300 focus:border-marino
               rounded-lg px-3 py-1.5 focus:outline-none transition-colors w-64"
        placeholder="Título del cuestionario…"
      />

      <!-- Indicador de autoguardado REAL (PUT a la API con debounce) -->
      <span class="text-xs flex items-center gap-1.5 mr-auto"
            :class="quizStore.saveState === 'error' ? 'text-coral' : 'text-slate-400'">
        <template v-if="quizStore.saveState === 'saving'">
          <CloudUpload :size="14" class="animate-pulse" /> Guardando…
        </template>
        <template v-else-if="quizStore.saveState === 'error'">
          <AlertTriangle :size="14" /> Error al guardar — reintenta al próximo cambio
        </template>
        <template v-else>
          <Check :size="14" class="text-esmeralda" /> Guardado
        </template>
      </span>

      <button
        @click="showAssistant = true"
        class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 text-dorado
               bg-dorado/15 hover:bg-dorado/25 transition-colors cursor-pointer"
      >
        <img src="/icons8-ai-48.png" class="w-4 h-4" /> Mejorá tu Quiz
        <!--<Sparkles :size="15" class="text-dorado" /> Asistente IA-->
      </button>
      <BaseButton variant="ghost" size="sm" class="!text-slate-600 !bg-slate-100 hover:!bg-slate-200" @click="showPreview = true" :disabled="!item">
        <Eye :size="15" /> Vista previa
      </BaseButton>
      <BaseButton variant="primary" size="sm" @click="salir">
        <Save :size="15" /> Guardar y salir
      </BaseButton>
    </header>

    <div class="flex flex-1 min-h-0">

      <!-- ════════════════ RAIL IZQUIERDO · TIMELINE ════════════════ -->
      <aside class="w-48 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          <div
            v-for="(it, i) in quiz.questions"
            :key="it.id"
            draggable="true"
            @dragstart="dragIndex = i"
            @dragover.prevent="dragOver = i"
            @dragleave="dragOver === i && (dragOver = null)"
            @drop.prevent="onDrop(i)"
            @dragend="dragIndex = null; dragOver = null"
            @click="selectedId = it.id"
            class="group rounded-lg border-2 p-2 cursor-pointer transition-all select-none"
            :class="[
              selectedId === it.id ? 'border-marino bg-marino/5' : 'border-slate-200 hover:border-slate-300',
              dragOver === i && dragIndex !== i ? 'border-azul-intenso border-dashed' : '',
              dragIndex === i ? 'opacity-40' : '',
            ]"
          >
            <div class="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
              <GripVertical :size="12" class="text-slate-300 group-hover:text-slate-400" />
              <span class="font-bold">{{ i + 1 }}</span>
              <component :is="TIPOS[it.kind]?.icon ?? LayoutGrid" :size="12" />
              <span class="truncate">{{ TIPOS[it.kind]?.label ?? it.kind }}</span>
              <!-- Aviso: pregunta incompleta (no viaja al servidor todavía) -->
              <AlertTriangle
                v-if="!esPreguntaCompleta(it)"
                :size="12"
                class="text-dorado ml-auto shrink-0"
                title="Incompleta: no se guarda hasta completarla"
              />
            </div>

            <div class="bg-slate-50 rounded-md p-1.5 min-h-10">
              <p class="text-[10px] text-slate-600 font-medium truncate">
                {{ it.title || 'Sin título' }}
              </p>
              <div v-if="it.kind === 'quiz'" class="grid grid-cols-2 gap-0.5 mt-1">
                <span v-for="(op, k) in it.options.slice(0, 4)" :key="k" class="h-1.5 rounded-sm" :class="coloresOpcion[k]"></span>
              </div>
              <div v-else-if="it.kind === 'tf'" class="grid grid-cols-2 gap-0.5 mt-1">
                <span class="h-1.5 rounded-sm bg-azul"></span>
                <span class="h-1.5 rounded-sm bg-coral"></span>
              </div>
            </div>

            <div class="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="selectedId = quizStore.duplicateItem(it.id)" title="Duplicar" class="text-slate-400 hover:text-marino p-0.5">
                <Copy :size="13" />
              </button>
              <button
                @click.stop="quizStore.removeItem(it.id); selectedId === it.id && (selectedId = quiz.questions[0]?.id ?? null)"
                title="Eliminar" class="text-slate-400 hover:text-coral p-0.5"
              >
                <Trash2 :size="13" />
              </button>
            </div>
          </div>
        </div>

        <div class="p-2 border-t border-slate-200">
          <BaseButton variant="primary" size="sm" block @click="abrirPicker('add')">
            <Plus :size="15" /> Añadir pregunta
          </BaseButton>
        </div>
      </aside>

      <!-- ════════════════ LIENZO CENTRAL ════════════════ -->
      <main class="flex-1 overflow-y-auto p-6" v-if="item">
        <div class="max-w-5xl mx-auto h-full flex flex-col gap-5">

          <input
            v-model="item.title"
            placeholder="Escribí tu pregunta…"
            class="w-full bg-white text-xl lg:text-2xl font-extrabold text-marino text-center rounded-xl
                   shadow-sm border border-slate-200 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-marino
                   placeholder:text-slate-300 shrink-0"
          />

          <div class="flex justify-between flex-1 min-h-0 flex-col">
          <!-- ───── Imagen de la pregunta (subida real a la API) ───── -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div v-if="item.media" class="relative flex justify-center">
                <img :src="item.media.url" class="max-h-60 rounded-lg object-contain" alt="imagen de la pregunta" />
                <button @click="item.media = null" class="absolute -top-2 -right-2 bg-marino text-white rounded-full p-1 shadow-md hover:bg-coral transition-colors" title="Quitar imagen">
                  <X :size="14" />
                </button>
              </div>

              <div v-else class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <p class="text-sm text-slate-400 mb-3">Agregá una imagen a la pregunta (opcional)</p>
                <input ref="inputImagen" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="onImagenElegida" />
                <BaseButton variant="ghost" size="sm" class="!bg-slate-100 !text-slate-600 hover:!bg-slate-200"
                            :disabled="subiendoImagen" @click="inputImagen.click()">
                  <Loader v-if="subiendoImagen" :size="15" class="animate-spin" />
                  <ImageIcon v-else :size="15" />
                  {{ subiendoImagen ? 'Subiendo…' : 'Subir imagen' }}
                </BaseButton>
                <p class="text-[10px] text-slate-300 mt-2">JPG, PNG, WebP o GIF · máx 2 MB</p>
              </div>
            </div>

            <!-- ───── Opciones (según tipo) ───── -->

            <!-- QUIZ: 4 opciones de colores -->
            <div v-if="item.kind === 'quiz'" class="grid sm:grid-cols-2 gap-3">
              <div
                v-for="(op, i) in item.options" :key="i"
                class="flex items-center gap-3 rounded-xl p-4 shadow-sm"
                :class="coloresOpcion[i]"
              >
                <svg viewBox="0 0 100 100" class="w-6 h-6 shrink-0 fill-white">
                  <polygon v-if="formasOpcion[i] === 'triangulo'" points="50,12 88,86 12,86" />
                  <polygon v-else-if="formasOpcion[i] === 'rombo'" points="50,8 92,50 50,92 8,50" />
                  <circle v-else-if="formasOpcion[i] === 'circulo'" cx="50" cy="50" r="36" />
                  <rect v-else x="18" y="18" width="64" height="64" rx="6" />
                </svg>
                <input
                  v-model="op.text"
                  :placeholder="'Añadir respuesta ' + (i + 1) + (i >= 2 ? ' (opcional)' : '')"
                  class="flex-1 text-white rounded-lg px-3 py-2.5 font-bold  focus:outline-none"
                />
                <button
                  @click="item.multi ? toggleCorrect(i) : setCorrect(i)"
                  class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center transition-all shrink-0"
                  :class="op.correct ? 'bg-white' : 'bg-transparent hover:bg-white/20'"
                  :title="op.correct ? 'Respuesta correcta' : 'Marcar como correcta'"
                >
                  <Check v-if="op.correct" :size="16" class="text-esmeralda" stroke-width="3.5" />
                </button>
              </div>
            </div>

            <!-- VERDADERO / FALSO -->
            <div v-else-if="item.kind === 'tf'" class="grid sm:grid-cols-2 gap-3">
              <div
                v-for="(op, i) in item.options" :key="i"
                class="flex items-center justify-between gap-3 rounded-xl p-5 shadow-sm text-white font-bold text-lg"
                :class="i === 0 ? 'bg-azul' : 'bg-coral'"
              >
                <span class="flex items-center gap-2.5">
                  <svg viewBox="0 0 100 100" class="w-6 h-6 fill-white">
                    <polygon v-if="i === 0" points="50,8 92,50 50,92 8,50" />
                    <polygon v-else points="50,12 88,86 12,86" />
                  </svg>
                  {{ op.text }}
                </span>
                <button
                  @click="setCorrect(i)"
                  class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center transition-all"
                  :class="op.correct ? 'bg-white' : 'hover:bg-white/20'"
                >
                  <Check v-if="op.correct" :size="16" class="text-esmeralda" stroke-width="3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <main v-else class="flex-1 flex items-center justify-center text-slate-400">
        <div class="text-center">
          <Sparkles :size="40" class="mx-auto mb-2" />
          <p>Agregá tu primera pregunta desde el panel izquierdo.</p>
        </div>
      </main>

      <!-- ════════════════ PANEL DERECHO · CONFIGURACIÓN ════════════════ -->
      <aside v-if="item" class="w-72 bg-white border-l border-slate-200 p-4 space-y-5 overflow-y-auto shrink-0">

        <div>
          <label class="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            <component :is="TIPOS[item.kind].icon" :size="14" /> Tipo de pregunta
          </label>
          <button
            @click="abrirPicker('change')"
            class="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2.5
                   text-sm font-medium text-slate-700 hover:border-marino transition-colors"
          >
            <span class="flex items-center gap-2">
              <component :is="TIPOS[item.kind].icon" :size="16" class="text-marino" />
              {{ TIPOS[item.kind].label }}
            </span>
            <ChevronDown :size="15" class="text-slate-400" />
          </button>
        </div>

        <div>
          <label class="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            <Clock :size="14" /> Límite de tiempo
          </label>
          <select
            v-model="item.timeLimit"
            class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marino"
          >
            <option v-for="t in TIEMPOS" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div>
          <label class="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            <Award :size="14" /> Puntos
          </label>
          <select
            v-model="item.points"
            class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marino"
          >
            <option v-for="p in PUNTAJES" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>

        <div v-if="item.kind === 'quiz'">
          <label class="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            <LayoutGrid :size="14" /> Opciones de respuesta
          </label>
          <select
            :value="item.multi ? 'multi' : 'single'"
            @change="item.multi = $event.target.value === 'multi'"
            class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marino"
          >
            <option value="single">Selección simple</option>
            <option value="multi">Selección múltiple</option>
          </select>
        </div>

        <!-- Estado de completitud de la pregunta -->
        <p class="text-xs rounded-lg p-3"
           :class="esPreguntaCompleta(item) ? 'text-esmeralda bg-esmeralda/10' : 'text-dorado bg-dorado/10'">
          {{ esPreguntaCompleta(item)
            ? '✓ Pregunta completa: se guarda automáticamente.'
            : 'Faltan datos (título, opciones o correcta): no se guarda hasta completarla.' }}
        </p>

        <div class="flex gap-2 pt-2 border-t border-slate-200">
          <button @click="eliminar" class="flex-1 text-sm font-semibold text-coral hover:bg-coral/10 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5">
            <Trash2 :size="15" /> Eliminar
          </button>
          <button @click="duplicar" class="flex-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5">
            <Copy :size="15" /> Duplicar
          </button>
        </div>
      </aside>
    </div>

    <!-- ════════════════ MODAL · SELECTOR DE TIPO ════════════════ -->
    <div v-if="showTypePicker" class="fixed inset-0 bg-marino/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showTypePicker = false">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 anim-modal">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-extrabold text-marino">
            {{ pickerMode === 'add' ? 'Añadir pregunta' : 'Cambiar tipo de pregunta' }}
          </h2>
          <button @click="showTypePicker = false" class="text-slate-400 hover:text-marino"><X :size="20" /></button>
        </div>

        <div class="grid sm:grid-cols-2 gap-2">
          <button
            v-for="(def, kind) in TIPOS"
            :key="kind"
            @click="elegirTipo(kind)"
            :disabled="!def.v1"
            class="flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors"
            :class="def.v1
              ? 'border-slate-200 hover:border-marino cursor-pointer'
              : 'border-slate-100 opacity-50 cursor-not-allowed'"
          >
            <span class="w-9 h-9 rounded-lg bg-marino/5 text-marino flex items-center justify-center shrink-0">
              <component :is="def.icon" :size="18" />
            </span>
            <span>
              <span class="font-bold text-sm text-marino flex items-center gap-1.5">
                {{ def.label }}
                <span v-if="!def.v1" class="text-[9px] bg-slate-300 text-white font-bold px-1 rounded uppercase">v2</span>
              </span>
              <span class="block text-xs text-slate-400 leading-snug mt-0.5">{{ def.desc }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- ════════════════ MODAL · VISTA PREVIA ════════════════ -->
    <div v-if="showPreview && item" class="fixed inset-0 bg-marino/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showPreview = false">
      <div class="bg-marino text-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden anim-modal">
        <div class="flex items-center justify-between px-4 py-2 bg-white/5">
          <span class="text-xs text-white/60 flex items-center gap-1.5"><Eye :size="13" /> Vista previa · así se proyecta en clase</span>
          <button @click="showPreview = false" class="text-white/60 hover:text-white"><X :size="18" /></button>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between text-xs text-white/50">
            <span class="flex items-center gap-1"><component :is="TIPOS[item.kind].icon" :size="13" /> {{ TIPOS[item.kind].label }}</span>
            <span class="flex items-center gap-1"><Clock :size="13" /> {{ etiquetaTiempo(item.timeLimit) }}</span>
            <span v-if="item.points === 'double'" class="text-dorado font-bold">×2 puntos dobles</span>
          </div>
          <h3 class="text-xl font-extrabold text-center">{{ item.title || 'Sin título todavía…' }}</h3>
          <img v-if="item.media" :src="item.media.url" class="max-h-40 mx-auto rounded-lg" alt="" />

          <div v-if="item.kind === 'quiz'" class="grid grid-cols-2 gap-2">
            <div v-for="(op, i) in item.options.filter(o => o.text.trim())" :key="i" class="rounded-lg p-3 text-sm font-bold" :class="coloresOpcion[i]">
              {{ op.text }}
            </div>
          </div>
          <div v-else-if="item.kind === 'tf'" class="grid grid-cols-2 gap-2">
            <div class="rounded-lg p-3 text-sm font-bold bg-azul">Verdadero</div>
            <div class="rounded-lg p-3 text-sm font-bold bg-coral">Falso</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ PANEL · ASISTENTE IA ════════════════ -->
    <AssistantPanel :open="showAssistant" :quiz-id="quiz.id" @close="showAssistant = false" />
  </div>
</template>

<style scoped>
@keyframes modal-entra {
  from { opacity: 0; transform: scale(0.95); }
}
.anim-modal {
  animation: modal-entra 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .anim-modal { animation: none; }
}
</style>
