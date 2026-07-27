<script setup>
/*
  TeacherDashboard.vue · Cuestionarios del docente — datos reales de la API.
  "Iniciar juego" todavía usa el flujo mock de partida (se reemplaza por el
  realtime verdadero en F2/F3): convierte el quiz de la API al formato del
  store de juego y arranca la simulación.
*/
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Play, Pencil, Plus, FileQuestion, Copy, Trash2, Loader } from 'lucide-vue-next'
import TeacherLayout from './TeacherLayout.vue'
import BaseCard from '../../components/ui/BaseCard.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import { useQuizApiStore } from '../../stores/quiz'
import { useGameStore } from '../../stores/game'

const router = useRouter()
const quizStore = useQuizApiStore()
const gameStore = useGameStore()

const creando = ref(false)
const PALETA = ['bg-coral', 'bg-azul', 'bg-dorado', 'bg-esmeralda']

onMounted(() => quizStore.fetchQuizzes())

async function crear() {
  creando.value = true
  try {
    const id = await quizStore.createQuiz()
    router.push(`/editor/${id}`)
  } finally {
    creando.value = false
  }
}

function editar(id) {
  router.push(`/editor/${id}`)
}

/** Abre una sala REAL: el servidor genera PIN, snapshot y estado en Redis. */
async function hostear(quiz) {
  const pin = await gameStore.create(quiz.id)
  router.push(`/host/${pin}`)
}

async function duplicar(quiz) {
  await quizStore.duplicateQuiz(quiz.id)
}

async function eliminar(quiz) {
  if (!confirm(`¿Eliminar "${quiz.title}"? Podés recuperarlo pidiéndoselo al administrador.`)) return
  await quizStore.deleteQuiz(quiz.id)
}
</script>

<template>
  <TeacherLayout>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-marino">Mis Cuestionarios</h1>
        <p class="text-sm text-slate-500">Gestioná tus juegos y lanzalos en clase.</p>
      </div>
      <BaseButton variant="primary" :disabled="creando" @click="crear()">
        <Loader v-if="creando" :size="18" class="animate-spin" />
        <Plus v-else :size="18" />
        Nuevo cuestionario
      </BaseButton>
    </div>

    <!-- Cargando desde la API -->
    <div v-if="quizStore.loading" class="flex justify-center py-16 text-slate-400">
      <Loader :size="28" class="animate-spin" />
    </div>

    <!-- Vacío: invitación a crear el primero -->
    <div v-else-if="quizStore.quizzes.length === 0" class="text-center py-16 text-slate-400">
      <FileQuestion :size="40" class="mx-auto mb-3" />
      <p class="font-semibold text-slate-500">Todavía no tenés cuestionarios.</p>
      <p class="text-sm">Creá el primero con el botón de arriba.</p>
    </div>

    <div v-else class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <BaseCard v-for="quiz in quizStore.quizzes" :key="quiz.id" padding="p-0">
        <div :class="PALETA[quiz.id % PALETA.length]" class="h-2 rounded-t-xl"></div>

        <div class="p-5 flex flex-col gap-4">
          <div>
            <h3 class="font-bold text-marino text-lg leading-snug">{{ quiz.title }}</h3>
            <p class="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <FileQuestion :size="15" /> {{ quiz.questions_count }} pregunta(s)
            </p>
          </div>

          <div class="flex gap-2 items-center">
            <BaseButton variant="primary" size="sm" @click="editar(quiz.id)">
              <Pencil :size="15" /> Editar
            </BaseButton>
            <BaseButton
              variant="success"
              size="sm"
              class="flex-1"
              :disabled="quiz.questions_count === 0"
              @click="hostear(quiz)"
            >
              <Play :size="15" /> Iniciar juego
            </BaseButton>
            <!-- Acciones secundarias -->
            <button @click="duplicar(quiz)" title="Duplicar" class="text-slate-400 hover:text-marino p-1.5 transition-colors">
              <Copy :size="16" />
            </button>
            <button @click="eliminar(quiz)" title="Eliminar" class="text-slate-400 hover:text-coral p-1.5 transition-colors">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </BaseCard>
    </div>
  </TeacherLayout>
</template>
