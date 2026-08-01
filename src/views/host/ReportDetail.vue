<script setup>
/*
  ReportDetail.vue · Reporte detallado de una partida.
  Tres pestañas: Resumen (precisión, podio, pregunta difícil),
  Preguntas (distribución + % acierto) y Jugadores (ranking + detalle).
*/
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Loader, Trophy, Target, Users, FileQuestion,
  Check, X as XIcon, AlertTriangle, Medal,
} from 'lucide-vue-next'
import TeacherLayout from './TeacherLayout.vue'
import BaseCard from '../../components/ui/BaseCard.vue'
import { reportsApi } from '../../api/reports'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const tab = ref('resumen')
const loading = ref(true)
const summary = ref(null)
const questions = ref([])
const players = ref([])

onMounted(async () => {
  try {
    // Cargamos todo de una: los reportes son chicos.
    ;[summary.value, questions.value, players.value] = await Promise.all([
      reportsApi.summary(id),
      reportsApi.questions(id),
      reportsApi.players(id),
    ])
  } catch {
    router.replace('/reportes')
    return
  } finally {
    loading.value = false
  }
})

const coloresOpcion = ['bg-coral', 'bg-azul', 'bg-dorado', 'bg-esmeralda']
const medallas = ['text-dorado', 'text-slate-400', 'text-amber-700']

const maxVotos = (q) => Math.max(1, ...q.options.map((o) => o.count))
const seg = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(1) + 's')

const tabs = [
  { id: 'resumen', label: 'Resumen', icon: Target },
  { id: 'preguntas', label: 'Preguntas', icon: FileQuestion },
  { id: 'jugadores', label: 'Jugadores', icon: Users },
]
</script>

<template>
  <TeacherLayout>
    <button
      @click="router.push('/reportes')"
      class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-marino transition-colors mb-4"
    >
      <ArrowLeft :size="16" /> Volver a reportes
    </button>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Loader :size="28" class="animate-spin" />
    </div>

    <template v-else-if="summary">
      <h1 class="text-2xl font-extrabold text-marino">{{ summary.quiz_title }}</h1>
      <p class="text-sm text-slate-400 mb-5">
        {{ summary.players_count }} jugadores · {{ summary.questions_count }} preguntas
        <span v-if="summary.status === 'aborted'" class="text-coral font-semibold">· partida abortada</span>
      </p>

      <!-- Pestañas -->
      <div class="flex gap-1 border-b border-slate-200 mb-5">
        <button
          v-for="t in tabs"
          :key="t.id"
          @click="tab = t.id"
          class="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors"
          :class="tab === t.id ? 'border-marino text-marino' : 'border-transparent text-slate-400 hover:text-slate-600'"
        >
          <component :is="t.icon" :size="15" /> {{ t.label }}
        </button>
      </div>

      <!-- ═══════ RESUMEN ═══════ -->
      <div v-if="tab === 'resumen'" class="space-y-5">
        <div class="grid sm:grid-cols-3 gap-4">
          <BaseCard padding="p-5" class="text-center">
            <Target :size="22" class="mx-auto text-esmeralda mb-1" />
            <p class="text-3xl font-extrabold text-marino tabular-nums">{{ summary.accuracy }}%</p>
            <p class="text-xs text-slate-400 uppercase tracking-wide">Precisión global</p>
          </BaseCard>
          <BaseCard padding="p-5" class="text-center">
            <Users :size="22" class="mx-auto text-azul mb-1" />
            <p class="text-3xl font-extrabold text-marino tabular-nums">{{ summary.players_count }}</p>
            <p class="text-xs text-slate-400 uppercase tracking-wide">Participantes</p>
          </BaseCard>
          <BaseCard padding="p-5" class="text-center">
            <FileQuestion :size="22" class="mx-auto text-dorado mb-1" />
            <p class="text-3xl font-extrabold text-marino tabular-nums">{{ summary.questions_count }}</p>
            <p class="text-xs text-slate-400 uppercase tracking-wide">Preguntas</p>
          </BaseCard>
        </div>

        <!-- Podio -->
        <BaseCard>
          <h3 class="font-bold text-marino mb-3 flex items-center gap-2"><Trophy :size="18" class="text-dorado" /> Podio</h3>
          <div class="space-y-2">
            <div
              v-for="p in summary.podium"
              :key="p.rank"
              class="flex items-center gap-3 rounded-lg px-4 py-2.5"
              :class="p.rank === 1 ? 'bg-dorado/10' : 'bg-slate-50'"
            >
              <Medal :size="20" :class="medallas[p.rank - 1] ?? 'text-slate-300'" />
              <span class="font-bold text-marino w-6">{{ p.rank }}º</span>
              <span class="flex-1 font-semibold truncate">{{ p.nickname }}</span>
              <span class="font-extrabold tabular-nums text-marino">{{ p.score }}</span>
            </div>
          </div>
        </BaseCard>

        <!-- Pregunta más difícil -->
        <BaseCard v-if="summary.hardest_question" padding="p-4">
          <p class="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
            <AlertTriangle :size="14" class="text-coral" /> Pregunta más difícil
          </p>
          <p class="font-semibold text-marino">{{ summary.hardest_question.title }}</p>
          <p class="text-sm text-coral font-bold">Solo {{ summary.hardest_question.accuracy }}% acertó</p>
        </BaseCard>
      </div>

      <!-- ═══════ PREGUNTAS ═══════ -->
      <div v-else-if="tab === 'preguntas'" class="space-y-4">
        <BaseCard v-for="q in questions" :key="q.index" padding="p-5">
          <div class="flex items-start justify-between gap-3 mb-3">
            <p class="font-bold text-marino">
              <span class="text-slate-400 mr-1">{{ q.index + 1 }}.</span>{{ q.title }}
            </p>
            <span class="text-sm font-bold tabular-nums shrink-0"
                  :class="q.accuracy >= 50 ? 'text-esmeralda' : 'text-coral'">
              {{ q.accuracy }}% ✓
            </span>
          </div>

          <!-- Distribución por opción -->
          <div class="space-y-1.5">
            <div v-for="(o, i) in q.options" :key="o.id" class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded shrink-0" :class="coloresOpcion[i]"></span>
              <span class="text-sm flex-1 truncate" :class="o.is_correct ? 'font-semibold text-marino' : 'text-slate-500'">
                {{ o.text }}
                <Check v-if="o.is_correct" :size="13" class="inline text-esmeralda" />
              </span>
              <div class="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full" :class="coloresOpcion[i]" :style="{ width: (o.count / maxVotos(q)) * 100 + '%' }"></div>
              </div>
              <span class="text-xs text-slate-400 tabular-nums w-6 text-right">{{ o.count }}</span>
            </div>
          </div>
          <p class="text-xs text-slate-400 mt-3">
            {{ q.answered }} respondieron · tiempo medio {{ seg(q.avg_response_ms) }}
          </p>
        </BaseCard>
      </div>

      <!-- ═══════ JUGADORES ═══════ -->
      <div v-else class="space-y-2">
        <BaseCard v-for="p in players" :key="p.rank" padding="p-4">
          <div class="flex items-center gap-3">
            <span class="font-extrabold text-marino w-7 tabular-nums">{{ p.rank }}º</span>
            <span class="flex-1 font-semibold text-marino truncate">{{ p.nickname }}</span>
            <span class="text-sm text-slate-400">{{ p.answers_correct }} ✓</span>
            <span class="font-extrabold tabular-nums text-marino w-16 text-right">{{ p.score }}</span>
          </div>
          <!-- Mini-tira de aciertos/errores por pregunta -->
          <div class="flex gap-1 mt-2 pl-10">
            <span
              v-for="a in p.answers"
              :key="a.question_index"
              class="w-5 h-5 rounded flex items-center justify-center"
              :class="a.is_correct ? 'bg-esmeralda/15 text-esmeralda' : 'bg-coral/15 text-coral'"
              :title="`Pregunta ${a.question_index + 1}: ${a.is_correct ? '+' + a.points : '0'} pts`"
            >
              <Check v-if="a.is_correct" :size="13" />
              <XIcon v-else :size="13" />
            </span>
          </div>
        </BaseCard>
      </div>
    </template>
  </TeacherLayout>
</template>
