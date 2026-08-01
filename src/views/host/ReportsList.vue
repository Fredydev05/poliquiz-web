<script setup>
/*
  ReportsList.vue · Historial de partidas jugadas por el docente.
  Cada fila lleva al reporte detallado de esa partida.
*/
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BarChart3, Users, FileQuestion, Clock, Loader, ChevronRight, Ban } from 'lucide-vue-next'
import TeacherLayout from './TeacherLayout.vue'
import BaseCard from '../../components/ui/BaseCard.vue'
import { reportsApi } from '../../api/reports'

const router = useRouter()
const games = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    games.value = (await reportsApi.list()).data
  } finally {
    loading.value = false
  }
})

const fecha = (iso) =>
  iso ? new Date(iso).toLocaleString('es-PY', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
</script>

<template>
  <TeacherLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-extrabold text-marino flex items-center gap-2">
        <BarChart3 :size="24" /> Reportes
      </h1>
      <p class="text-sm text-slate-500">Resultados de las partidas que ya jugaste.</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Loader :size="28" class="animate-spin" />
    </div>

    <div v-else-if="games.length === 0" class="text-center py-16 text-slate-400">
      <BarChart3 :size="40" class="mx-auto mb-3" />
      <p class="font-semibold text-slate-500">Todavía no jugaste ninguna partida.</p>
      <p class="text-sm">Iniciá un juego desde “Mis cuestionarios” y acá vas a ver el reporte.</p>
    </div>

    <div v-else class="space-y-2">
      <BaseCard
        v-for="g in games"
        :key="g.id"
        padding="p-4"
        class="cursor-pointer hover:border-marino transition-colors"
        @click="router.push(`/reportes/${g.id}`)"
      >
        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <p class="font-bold text-marino truncate flex items-center gap-2">
              {{ g.quiz_title }}
              <span v-if="g.status === 'aborted'" class="text-[10px] bg-coral/10 text-coral font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                <Ban :size="11" /> Abortada
              </span>
            </p>
            <p class="text-sm text-slate-400 flex items-center gap-3 mt-1">
              <span class="flex items-center gap-1"><Users :size="14" /> {{ g.players_count }}</span>
              <span class="flex items-center gap-1"><FileQuestion :size="14" /> {{ g.questions_count }}</span>
              <span class="flex items-center gap-1"><Clock :size="14" /> {{ fecha(g.ended_at) }}</span>
            </p>
          </div>
          <ChevronRight :size="20" class="text-slate-300 shrink-0" />
        </div>
      </BaseCard>
    </div>
  </TeacherLayout>
</template>
