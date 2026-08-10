<script setup>
/*
  AssistantPanel.vue · Chat con la IA para crear/mejorar el cuestionario.
  --------------------------------------------------------------------------
  Drawer deslizable desde la derecha. La respuesta llega por streaming SSE:
  se va "tipeando" en vivo (evento token) y al final trae un payload
  estructurado (evento result) con acción generate|clarify|suggest|reject.
  Las preguntas generadas se insertan en el editor vía el store.
*/
import { ref, nextTick, watch } from 'vue'
import { Sparkles, X, Send, Loader, Plus, Check, Lightbulb, AlertTriangle } from 'lucide-vue-next'
import { streamAssistant } from '../../api/assistant'
import { useQuizApiStore } from '../../stores/quiz'

const props = defineProps({
  open: { type: Boolean, default: false },
  quizId: { type: [Number, String], required: true },
})
const emit = defineEmits(['close'])

const store = useQuizApiStore()

const messages = ref([]) // { role: 'user'|'assistant', text, result, error, inserted }
const input = ref('')
const streaming = ref(false)
const scroller = ref(null)
let controller = null

async function scrollToBottom() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}

async function send(texto) {
  const msg = (texto ?? input.value).trim()
  if (!msg || streaming.value) return

  messages.value.push({ role: 'user', text: msg })
  const idx = messages.value.push({ role: 'assistant', text: '', result: null, error: null, inserted: false }) - 1
  input.value = ''
  streaming.value = true
  scrollToBottom()

  controller = new AbortController()
  await streamAssistant(props.quizId, msg, {
    signal: controller.signal,
    onToken: (t) => { messages.value[idx].text += t; scrollToBottom() },
    onResult: (r) => { messages.value[idx].result = r; scrollToBottom() },
    onError: (m) => { messages.value[idx].error = m },
  })

  streaming.value = false
  scrollToBottom()
}

function insertar(m) {
  const n = store.insertGeneratedQuestions(m.result.questions)
  m.inserted = n
  store.scheduleSave()
}

function onEnter(e) {
  if (!e.shiftKey) { e.preventDefault(); send() }
}

// Al cerrar, abortamos cualquier stream en curso.
watch(() => props.open, (abierto) => {
  if (!abierto && controller) { controller.abort(); streaming.value = false }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-marino/40 backdrop-blur-xs" @click="emit('close')" />
    </Transition>

    <Transition name="slide">
      <aside
        v-if="open"
        class="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-50 shadow-2xl flex flex-col"
      >
        <!-- Encabezado -->
        <header class="flex items-center gap-2.5 px-4 py-3 bg-marino text-white shrink-0">
          <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Sparkles :size="18" class="text-dorado" />
          </span>
          <div class="flex-1">
            <p class="font-bold leading-tight">Asistente IA</p>
            <p class="text-white/50 text-xs">Crea y mejora tus cuestionarios</p>
          </div>
          <button @click="emit('close')" class="text-white/60 hover:text-white transition-colors">
            <X :size="20" />
          </button>
        </header>

        <!-- Conversación -->
        <div ref="scroller" class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Estado inicial -->
          <div v-if="messages.length === 0" class="text-center text-slate-400 pt-10 px-4">
            <Sparkles :size="34" class="mx-auto mb-3 text-marino/30" />
            <p class="font-semibold text-slate-500">Contame qué querés crear</p>
            <p class="text-sm mt-1">Ej: "10 preguntas de Cálculo I, nivel intro" — o pedime que revise las preguntas que ya tenés.</p>
          </div>

          <template v-for="(m, i) in messages" :key="i">
            <!-- Mensaje del docente -->
            <div v-if="m.role === 'user'" class="flex justify-end">
              <div class="bg-marino text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%] text-sm">
                {{ m.text }}
              </div>
            </div>

            <!-- Respuesta de la IA -->
            <div v-else class="space-y-2">
              <div class="flex gap-2">
                <span class="w-7 h-7 rounded-lg bg-marino/5 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles :size="14" class="text-marino" />
                </span>
                <div class="flex-1 min-w-0">
                  <!-- Skeleton mientras no llegó el primer token -->
                  <div v-if="!m.text && !m.error && streaming && i === messages.length - 1" class="flex gap-1 py-2">
                    <span class="typing-dot" /><span class="typing-dot" /><span class="typing-dot" />
                  </div>

                  <!-- Prosa (tipeada) con cursor mientras streamea -->
                  <p v-else class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {{ m.text
                    }}<span v-if="streaming && i === messages.length - 1" class="cursor-blink">▋</span>
                  </p>

                  <!-- Error -->
                  <div v-if="m.error" class="mt-1 flex items-start gap-1.5 text-sm text-coral bg-coral/10 rounded-lg px-3 py-2">
                    <AlertTriangle :size="15" class="shrink-0 mt-0.5" /> {{ m.error }}
                  </div>

                  <!-- Acción: preguntas generadas -->
                  <div v-if="m.result?.action === 'generate' && m.result.questions.length" class="mt-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <p class="text-xs font-semibold text-slate-500 mb-2">
                      {{ m.result.questions.length }} pregunta(s) lista(s) para insertar
                    </p>
                    <ul class="space-y-1 mb-3">
                      <li v-for="(q, k) in m.result.questions" :key="k" class="text-xs text-slate-600 truncate flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-esmeralda shrink-0" /> {{ q.title }}
                      </li>
                    </ul>
                    <button
                      v-if="!m.inserted"
                      @click="insertar(m)"
                      class="w-full flex items-center justify-center gap-1.5 bg-esmeralda text-white text-sm font-semibold rounded-lg py-2 hover:brightness-95 transition-all"
                    >
                      <Plus :size="15" /> Insertar en el cuestionario
                    </button>
                    <p v-else class="flex items-center justify-center gap-1.5 text-sm text-esmeralda font-semibold py-1">
                      <Check :size="15" /> {{ m.inserted }} pregunta(s) insertada(s)
                    </p>
                  </div>

                  <!-- Acción: preguntas de aclaración (chips) -->
                  <div v-if="m.result?.action === 'clarify' && m.result.clarifications.length" class="mt-2 flex flex-wrap gap-1.5">
                    <button
                      v-for="(c, k) in m.result.clarifications" :key="k"
                      @click="input = c"
                      class="text-xs bg-white border border-slate-200 hover:border-marino text-slate-600 rounded-full px-3 py-1.5 transition-colors"
                    >
                      {{ c }}
                    </button>
                  </div>

                  <!-- Acción: sugerencias -->
                  <div v-if="m.result?.action === 'suggest' && m.result.suggestions.length" class="mt-2 space-y-1.5">
                    <div v-for="(s, k) in m.result.suggestions" :key="k" class="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                      <span class="inline-flex items-center gap-1 font-semibold text-dorado">
                        <Lightbulb :size="13" /> Pregunta {{ s.question_index + 1 }}
                      </span>
                      <span class="text-slate-600"> · {{ s.message }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Entrada -->
        <div class="p-3 border-t border-slate-200 bg-white shrink-0">
          <div class="flex items-end gap-2">
            <textarea
              v-model="input"
              @keydown.enter="onEnter"
              :disabled="streaming"
              rows="1"
              placeholder="Escribí tu pedido…"
              class="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm max-h-32 focus:outline-none focus:ring-2 focus:ring-marino disabled:bg-slate-50"
            />
            <button
              @click="send()"
              :disabled="streaming || !input.trim()"
              class="w-10 h-10 rounded-xl bg-marino text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40"
            >
              <Loader v-if="streaming" :size="18" class="animate-spin" />
              <Send v-else :size="18" />
            </button>
          </div>
          <p class="text-[10px] text-slate-400 mt-1.5 px-1">
            La IA puede equivocarse — revisá siempre las preguntas antes de usarlas.
          </p>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

.cursor-blink { animation: blink 1s step-end infinite; color: var(--color-marino); }
@keyframes blink { 50% { opacity: 0; } }

.typing-dot {
  width: 7px; height: 7px; border-radius: 9999px;
  background: var(--color-marino);
  opacity: 0.4;
  animation: typing 1.2s infinite ease-in-out;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .slide-enter-active, .slide-leave-active, .cursor-blink, .typing-dot { animation: none; transition: none; }
}
</style>
