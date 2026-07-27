/*
  ============================================================================
  useQuizStore.js · STORE GLOBAL MOCKEADO (composable)
  ----------------------------------------------------------------------------
  Simula lo que en producción haría un backend + websockets.

  PATRÓN CLAVE: las variables `ref()` viven FUERA de la función exportada,
  así todos los componentes comparten EXACTAMENTE el mismo estado (singleton).
  ============================================================================
*/
import { ref, computed } from 'vue'

/* ==========================================================================
   0 · CATÁLOGOS (tipos de pregunta, tiempos y puntajes — estilo Kahoot)
   ========================================================================== */

// Cada tipo declara a qué grupo pertenece y cómo se comporta.
//  grupo 'evaluacion' → tiene respuesta correcta y otorga puntos
//  grupo 'opinion'    → recopila opiniones, nunca da puntos
//  grupo 'contenido'  → diapositiva informativa, sin interacción
export const TIPOS_PREGUNTA = {
  quiz:       { label: 'Quiz',               grupo: 'evaluacion', premium: false, desc: 'Hasta 4 opciones de colores, una o varias correctas' },
  tf:         { label: 'Verdadero o falso',  grupo: 'evaluacion', premium: false, desc: 'Dos opciones fijas: Verdadero / Falso' },
  short:      { label: 'Respuesta corta',    grupo: 'evaluacion', premium: true,  desc: 'Los estudiantes escriben la respuesta exacta' },
  puzzle:     { label: 'Puzzle',             grupo: 'evaluacion', premium: true,  desc: 'Ordenar las piezas en la secuencia correcta' },
  poll:       { label: 'Encuesta',           grupo: 'opinion',    premium: false, desc: 'Votación: no hay respuesta correcta' },
  wordcloud:  { label: 'Nube de palabras',   grupo: 'opinion',    premium: true,  desc: 'Cada uno aporta una palabra; se arma la nube' },
  open:       { label: 'Pregunta abierta',   grupo: 'opinion',    premium: true,  desc: 'Respuesta de texto libre' },
  brainstorm: { label: 'Lluvia de ideas',    grupo: 'opinion',    premium: true,  desc: 'Ideas libres para discutir en clase' },
  slide:      { label: 'Diapositiva',        grupo: 'contenido',  premium: true,  desc: 'Contenido informativo entre preguntas' },
}

export const TIEMPOS = [
  { value: 5,   label: '5 segundos' },
  { value: 10,  label: '10 segundos' },
  { value: 20,  label: '20 segundos' },
  { value: 30,  label: '30 segundos' },
  { value: 60,  label: '1 minuto' },
  { value: 90,  label: '1 minuto 30 s' },
  { value: 120, label: '2 minutos' },
  { value: 240, label: '4 minutos' },
]

export const PUNTAJES = [
  { value: 'standard', label: 'Estándar' },
  { value: 'double',   label: 'Puntos dobles' },
  { value: 'none',     label: 'Sin puntos' },
]

// ¿Este tipo tiene respuesta correcta y puede dar puntos?
export function esEvaluacion(kind) {
  return TIPOS_PREGUNTA[kind]?.grupo === 'evaluacion'
}
// ¿El estudiante responde escribiendo texto?
export function esRespuestaDeTexto(kind) {
  return ['short', 'wordcloud', 'open', 'brainstorm'].includes(kind)
}
// ¿El estudiante responde eligiendo opciones de colores?
export function esDeOpciones(kind) {
  return ['quiz', 'tf', 'poll'].includes(kind)
}

// Fábrica: crea un ítem nuevo (pregunta o diapositiva) con valores por defecto.
let nextItemId = 1000
export function nuevoItem(kind = 'quiz') {
  const base = {
    id: nextItemId++,
    kind,
    title: '',
    timeLimit: 20,
    points: 'standard',   // 'standard' | 'double' | 'none'
    multi: false,         // selección múltiple (solo quiz)
    media: null,          // { type: 'image'|'gif'|'video'|'audio', url }
    text: '',             // cuerpo (solo diapositiva)
    // `options` se reutiliza según el tipo:
    //  quiz/poll → 4 opciones · tf → V/F fijas
    //  short     → respuestas aceptadas · puzzle → piezas en orden CORRECTO
    options: [],
  }
  if (kind === 'quiz' || kind === 'poll') {
    base.options = [
      { text: '', correct: kind === 'quiz' },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ]
  } else if (kind === 'tf') {
    base.options = [
      { text: 'Verdadero', correct: true },
      { text: 'Falso', correct: false },
    ]
  } else if (kind === 'short') {
    base.options = [
      { text: '', correct: true },
      { text: '', correct: true },
      { text: '', correct: true },
      { text: '', correct: true },
    ]
  } else if (kind === 'puzzle') {
    base.options = [
      { text: '', correct: true },
      { text: '', correct: true },
      { text: '', correct: true },
      { text: '', correct: true },
    ]
  }
  return base
}

/* ==========================================================================
   1 · DATOS MOCKEADOS
   ========================================================================== */

const MOCK_PLAYER_NAMES = ['Vale', 'Nico', 'Caro', 'Lu', 'Damy', 'Marce']

// Helper para armar los cuestionarios de ejemplo sin repetir tanto código.
function q(kind, props) {
  return { ...nuevoItem(kind), ...props }
}
function opts(textos, correctas = []) {
  return textos.map((t, i) => ({ text: t, correct: correctas.includes(i) }))
}

const quizzes = ref([
  {
    id: 1,
    title: 'Demo · Todos los tipos de pregunta',
    color: 'bg-dorado',
    questions: [
      q('slide', {
        title: '¡Bienvenidos a POLI Quiz!',
        text: 'En este demo vas a ver todos los tipos de pregunta disponibles: quiz, verdadero/falso, respuesta corta, puzzle, encuesta, nube de palabras, pregunta abierta y lluvia de ideas.',
      }),
      q('quiz', {
        title: '¿Cuál es la complejidad de la búsqueda binaria?',
        timeLimit: 20,
        options: opts(['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], [1]),
      }),
      q('tf', {
        title: 'HTML es un lenguaje de programación.',
        timeLimit: 10,
        options: opts(['Verdadero', 'Falso'], [1]),
      }),
      q('short', {
        title: '¿Qué comando de Git guarda los cambios en el repositorio local?',
        timeLimit: 30,
        options: opts(['commit', 'git commit', '', ''], [0, 1, 2, 3]),
      }),
      q('puzzle', {
        title: 'Ordená las fases del desarrollo de software',
        timeLimit: 60,
        points: 'double',
        options: opts(['Análisis', 'Diseño', 'Implementación', 'Pruebas'], [0, 1, 2, 3]),
      }),
      q('poll', {
        title: '¿Qué lenguaje preferís para empezar a programar?',
        timeLimit: 20,
        options: opts(['Python', 'JavaScript', 'C++', 'Java']),
      }),
      q('wordcloud', {
        title: 'Describí la carrera en UNA palabra',
        timeLimit: 30,
      }),
      q('open', {
        title: '¿Qué proyecto te gustaría construir este semestre?',
        timeLimit: 90,
      }),
      q('brainstorm', {
        title: 'Ideas para la semana de la Facultad 💡',
        timeLimit: 120,
      }),
    ],
  },
  {
    id: 2,
    title: 'Algoritmos y Estructuras de Datos',
    color: 'bg-azul',
    questions: [
      q('quiz', {
        title: '¿Qué estructura de datos funciona con el principio LIFO?',
        timeLimit: 15,
        options: opts(['Cola (Queue)', 'Lista enlazada', 'Pila (Stack)', 'Árbol binario'], [2]),
      }),
      q('tf', {
        title: 'Un árbol binario de búsqueda balanceado busca en O(log n).',
        timeLimit: 10,
        options: opts(['Verdadero', 'Falso'], [0]),
      }),
    ],
  },
  {
    id: 3,
    title: 'Historia de la UNE',
    color: 'bg-coral',
    questions: [
      q('quiz', {
        title: '¿En qué ciudad se encuentra la Facultad Politécnica de la UNE?',
        timeLimit: 20,
        options: opts(['Asunción', 'Ciudad del Este', 'Encarnación', 'Hernandarias'], [1]),
      }),
    ],
  },
])

/* ==========================================================================
   2 · ESTADO GLOBAL REACTIVO
   ========================================================================== */

// --- Navegación ---
const currentRole = ref('student')        // 'student' | 'teacher'
const teacherScreen = ref('dashboard')    // 'dashboard' | 'editor' | 'host'

// --- Partida (compartida entre profesor y estudiantes) ---
const gameState = ref('idle')             // 'idle' | 'lobby' | 'question' | 'reveal' | 'finished'
const activeQuiz = ref(null)
const gamePin = ref(null)
const players = ref([])
const currentQuestionIndex = ref(0)
const timeLeft = ref(0)

// Resultados simulados que el host muestra en la revelación:
//  - option-kinds → votos por opción · texto-kinds → lista de envíos
const mockResults = ref(null)

// --- Estado propio del estudiante ---
const nickname = ref('')
const hasJoined = ref(false)
const hasAnswered = ref(false)
const lastAnswer = ref(null)              // { correct: bool|null, points, kind }
const lastChoice = ref(null)              // índice/texto/orden que envió
const totalScore = ref(0)

// --- Edición ---
const editingQuizId = ref(null)

let timerId = null
let joinSimulatorId = null

/* ==========================================================================
   3 · VALORES DERIVADOS
   ========================================================================== */

const currentQuestion = computed(
  () => activeQuiz.value?.questions[currentQuestionIndex.value] ?? null
)
const isLastQuestion = computed(
  () => activeQuiz.value &&
        currentQuestionIndex.value >= activeQuiz.value.questions.length - 1
)
const ranking = computed(
  () => [...players.value].sort((a, b) => b.score - a.score)
)
const editingQuiz = computed(
  () => quizzes.value.find((qz) => qz.id === editingQuizId.value) ?? null
)

/* ==========================================================================
   4 · ACCIONES DEL PROFESOR — edición
   ========================================================================== */

function openEditor(quizId) {
  editingQuizId.value = quizId
  teacherScreen.value = 'editor'
}

function createQuiz() {
  const newId = Math.max(0, ...quizzes.value.map((qz) => qz.id)) + 1
  const colors = ['bg-coral', 'bg-azul', 'bg-dorado', 'bg-esmeralda']
  quizzes.value.push({
    id: newId,
    title: 'Nuevo cuestionario',
    color: colors[newId % colors.length],
    questions: [nuevoItem('quiz')], // arranca con una pregunta vacía
  })
  openEditor(newId)
}

// Agrega un ítem al cuestionario en edición y devuelve su id (para seleccionarlo).
function addItem(kind) {
  const item = nuevoItem(kind)
  editingQuiz.value?.questions.push(item)
  return item.id
}

function duplicateItem(itemId) {
  const list = editingQuiz.value?.questions
  const idx = list?.findIndex((it) => it.id === itemId)
  if (idx == null || idx < 0) return null
  // Copia profunda simple (los ítems son JSON plano) con id nuevo.
  const copia = JSON.parse(JSON.stringify(list[idx]))
  copia.id = nextItemId++
  list.splice(idx + 1, 0, copia)
  return copia.id
}

function removeItem(itemId) {
  const list = editingQuiz.value?.questions
  const idx = list?.findIndex((it) => it.id === itemId)
  if (idx == null || idx < 0) return
  list.splice(idx, 1)
}

// Reordena el timeline (drag & drop): mueve el ítem de `from` a `to`.
function moveItem(from, to) {
  const list = editingQuiz.value?.questions
  if (!list || from === to || from < 0 || to < 0) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
}

// Cambia el TIPO de una pregunta adaptando sus opciones al nuevo formato,
// pero conservando título, multimedia y tiempo.
function changeKind(item, kind) {
  const plantilla = nuevoItem(kind)
  item.kind = kind
  item.options = plantilla.options
  item.multi = false
  if (!esEvaluacion(kind)) item.points = 'none'
  else if (item.points === 'none') item.points = 'standard'
}

/* ==========================================================================
   5 · ACCIONES DEL PROFESOR — juego (host)
   ========================================================================== */

function startHosting(quiz) {
  activeQuiz.value = quiz
  gamePin.value = Math.floor(100000 + Math.random() * 900000)
  players.value = players.value.filter((p) => p.isYou)
  players.value.forEach((p) => (p.score = 0))
  totalScore.value = 0
  currentQuestionIndex.value = 0
  gameState.value = 'lobby'
  teacherScreen.value = 'host'

  // SIMULACIÓN: cada 1.2s "entra" un estudiante mockeado.
  let i = 0
  joinSimulatorId = setInterval(() => {
    if (i < MOCK_PLAYER_NAMES.length) {
      players.value.push({ name: MOCK_PLAYER_NAMES[i], score: 0, isYou: false })
      i++
    } else {
      clearInterval(joinSimulatorId)
    }
  }, 1200)
}

function launchQuestion() {
  hasAnswered.value = false
  lastAnswer.value = null
  lastChoice.value = null
  mockResults.value = null
  gameState.value = 'question'

  const item = currentQuestion.value
  // Las diapositivas no tienen temporizador: el docente avanza manualmente.
  if (item.kind === 'slide') {
    timeLeft.value = 0
    return
  }
  timeLeft.value = item.timeLimit
  timerId = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) endQuestion()
  }, 1000)
}

// Genera los resultados simulados que el host muestra en la revelación.
function generarResultadosMock(item) {
  if (esDeOpciones(item.kind)) {
    // Votos por opción (solo opciones con texto)
    const votos = item.options.map((op) =>
      op.text.trim() ? 2 + Math.floor(Math.random() * 6) : 0
    )
    if (typeof lastChoice.value === 'number') votos[lastChoice.value]++
    mockResults.value = { votos }
  } else if (item.kind === 'wordcloud') {
    const canned = ['Desafiante', 'Innovadora', 'Exigente', 'Apasionante', 'Futuro', 'Tecnología', 'Comunidad']
    const words = canned.map((w) => ({ text: w, weight: 1 + Math.floor(Math.random() * 4) }))
    if (typeof lastChoice.value === 'string' && lastChoice.value.trim())
      words.unshift({ text: lastChoice.value, weight: 5, isYou: true })
    mockResults.value = { words }
  } else if (item.kind === 'open' || item.kind === 'brainstorm') {
    const canned = item.kind === 'open'
      ? ['Una app para gestionar horarios de clase', 'Un robot seguidor de línea', 'Mi propio portfolio web']
      : ['Torneo de programación competitiva', 'Feria de proyectos con food trucks', 'Charlas con egresados', 'Hackathon de 24 horas']
    const respuestas = canned.map((t, idx) => ({ text: t, author: MOCK_PLAYER_NAMES[idx % MOCK_PLAYER_NAMES.length] }))
    if (typeof lastChoice.value === 'string' && lastChoice.value.trim())
      respuestas.unshift({ text: lastChoice.value, author: nickname.value || 'Vos', isYou: true })
    mockResults.value = { respuestas }
  }
}

function endQuestion() {
  clearInterval(timerId)
  const item = currentQuestion.value
  gameState.value = 'reveal'
  generarResultadosMock(item)

  // Los jugadores mockeados solo ganan puntos en preguntas de evaluación.
  if (esEvaluacion(item.kind) && item.points !== 'none') {
    const mult = item.points === 'double' ? 2 : 1
    players.value.forEach((p) => {
      if (!p.isYou && Math.random() < 0.6) {
        p.score += (500 + Math.floor(Math.random() * 500)) * mult
      }
    })
  }
}

function nextQuestion() {
  // Desde una diapositiva se avanza directo (no hay fase de revelación).
  clearInterval(timerId)
  if (isLastQuestion.value) {
    gameState.value = 'finished'
  } else {
    currentQuestionIndex.value++
    launchQuestion()
  }
}

function exitGame() {
  clearInterval(timerId)
  clearInterval(joinSimulatorId)
  gameState.value = 'idle'
  activeQuiz.value = null
  gamePin.value = null
  players.value = []
  currentQuestionIndex.value = 0
  hasJoined.value = false
  hasAnswered.value = false
  lastAnswer.value = null
  lastChoice.value = null
  mockResults.value = null
  totalScore.value = 0
  teacherScreen.value = 'dashboard'
}

/* ==========================================================================
   6 · ACCIONES DEL ESTUDIANTE
   ========================================================================== */

function joinGame(pin, nick) {
  nickname.value = nick
  hasJoined.value = true
  totalScore.value = 0
  players.value.push({ name: nick, score: 0, isYou: true })
  if (gameState.value === 'idle') gameState.value = 'lobby'
}

// Calcula el puntaje según tipo de pregunta, velocidad y modo de puntos.
function calcularPuntos(correcto, item) {
  if (!correcto || !esEvaluacion(item.kind) || item.points === 'none') return 0
  const base = 500 + Math.round((timeLeft.value / item.timeLimit) * 500)
  return item.points === 'double' ? base * 2 : base
}

// Registra la respuesta del estudiante y actualiza el ranking.
function registrarRespuesta(correcto, item, eleccion) {
  hasAnswered.value = true
  lastChoice.value = eleccion
  const points = calcularPuntos(correcto === true, item)
  lastAnswer.value = { correct: correcto, points, kind: item.kind }
  totalScore.value += points
  const yo = players.value.find((p) => p.isYou)
  if (yo) yo.score = totalScore.value
}

// Quiz (selección simple) / Verdadero-Falso / Encuesta → índice de opción.
function submitAnswer(optionIndex) {
  const item = currentQuestion.value
  if (gameState.value !== 'question' || hasAnswered.value) return
  const correcto = item.kind === 'poll' ? null : !!item.options[optionIndex]?.correct
  registrarRespuesta(correcto, item, optionIndex)
}

// Quiz con selección múltiple → array de índices elegidos.
function submitMulti(indices) {
  const item = currentQuestion.value
  if (gameState.value !== 'question' || hasAnswered.value) return
  const correctas = item.options
    .map((op, i) => (op.correct && op.text.trim() ? i : -1))
    .filter((i) => i >= 0)
  const elegidas = [...indices].sort()
  const correcto =
    correctas.length === elegidas.length &&
    correctas.every((c, i) => c === elegidas[i])
  registrarRespuesta(correcto, item, indices)
}

// Respuesta corta / abierta / nube de palabras / lluvia de ideas → texto.
function submitText(texto) {
  const item = currentQuestion.value
  if (gameState.value !== 'question' || hasAnswered.value) return
  let correcto = null // los tipos de opinión no tienen correcta
  if (item.kind === 'short') {
    const aceptadas = item.options.map((op) => op.text.trim().toLowerCase()).filter(Boolean)
    correcto = aceptadas.includes(texto.trim().toLowerCase())
  }
  registrarRespuesta(correcto, item, texto)
}

// Puzzle → array con el orden elegido (índices de las piezas originales).
function submitOrder(orden) {
  const item = currentQuestion.value
  if (gameState.value !== 'question' || hasAnswered.value) return
  const correcto = orden.every((pieza, i) => pieza === i)
  registrarRespuesta(correcto, item, orden)
}

function leaveGame() {
  hasJoined.value = false
  hasAnswered.value = false
  lastAnswer.value = null
  lastChoice.value = null
  totalScore.value = 0
  nickname.value = ''
  players.value = players.value.filter((p) => !p.isYou)
}

/* ==========================================================================
   7 · EL COMPOSABLE
   ========================================================================== */
export function useQuizStore() {
  return {
    // estado
    currentRole, teacherScreen, gameState, activeQuiz, gamePin, players,
    currentQuestionIndex, timeLeft, nickname, hasJoined, hasAnswered,
    lastAnswer, lastChoice, totalScore, quizzes, editingQuizId, mockResults,
    // derivados
    currentQuestion, isLastQuestion, ranking, editingQuiz,
    // edición
    openEditor, createQuiz, addItem, duplicateItem, removeItem, moveItem, changeKind,
    // juego (profesor)
    startHosting, launchQuestion, endQuestion, nextQuestion, exitGame,
    // juego (estudiante)
    joinGame, submitAnswer, submitMulti, submitText, submitOrder, leaveGame,
  }
}
