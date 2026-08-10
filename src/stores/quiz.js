/*
  Store de cuestionarios (Pinia) — conecta el editor y el dashboard a la API.
  --------------------------------------------------------------------------
  El editor trabaja con su formato interno (heredado de la maqueta) y este
  store TRADUCE en ambos sentidos:

    editor                         API v1
    ─────────────────────────────  ─────────────────────────
    kind 'quiz'  + multi=false  →  kind 'quiz'
    kind 'quiz'  + multi=true   →  kind 'multi'
    kind 'tf'                   →  kind 'true_false'
    timeLimit / points          →  time_limit / points_mode
    options[{text, correct}]    →  options[{text, is_correct}]
    media {type:'image', url}   →  image_path (subida vía POST /media)

  El autoguardado manda SOLO las preguntas completas (las que pasarían la
  validación del servidor); las incompletas viven en el borrador local
  hasta que el docente las termina.
*/
import { defineStore } from 'pinia'
import { quizzesApi } from '../api/quizzes'

let localId = 1
const PALETA = ['bg-coral', 'bg-azul', 'bg-dorado', 'bg-esmeralda']

/* ---------------- Mapeos API ↔ editor ---------------- */

function apiToEditor(apiQuiz) {
  return {
    id: apiQuiz.id,
    title: apiQuiz.title,
    color: PALETA[apiQuiz.id % PALETA.length],
    questions: (apiQuiz.questions ?? []).map((q) => ({
      id: localId++,
      kind: q.kind === 'true_false' ? 'tf' : 'quiz',
      multi: q.kind === 'multi',
      title: q.title,
      timeLimit: q.time_limit,
      points: q.points_mode,
      media: q.image_url ? { type: 'image', url: q.image_url, path: q.image_path } : null,
      text: '',
      // El editor usa 4 slots fijos para quiz: rellenamos los que falten.
      options: padOptions(q),
    })),
  }
}

function padOptions(apiQuestion) {
  const opts = apiQuestion.options.map((o) => ({ text: o.text, correct: o.is_correct }))
  if (apiQuestion.kind !== 'true_false') {
    while (opts.length < 4) opts.push({ text: '', correct: false })
  }
  return opts
}

/** ¿La pregunta pasaría la validación del servidor? */
export function esPreguntaCompleta(q) {
  if (!q.title?.trim()) return false
  const conTexto = q.options.filter((o) => o.text.trim())
  const correctas = conTexto.filter((o) => o.correct).length
  if (q.kind === 'tf') return q.options.length === 2 && correctas === 1
  if (conTexto.length < 2) return false
  return q.multi ? correctas >= 1 : correctas === 1
}

function editorToApi(editorQuiz) {
  return {
    title: editorQuiz.title?.trim() || 'Sin título',
    questions: editorQuiz.questions
      .filter(esPreguntaCompleta)
      .map((q) => ({
        kind: q.kind === 'tf' ? 'true_false' : q.multi ? 'multi' : 'quiz',
        title: q.title.trim(),
        time_limit: q.timeLimit,
        points_mode: q.points ?? 'standard',
        image_path: q.media?.path ?? null,
        options: q.options
          .filter((o) => o.text.trim())
          .map((o) => ({ text: o.text.trim(), is_correct: o.correct })),
      })),
  }
}

/* ---------------- Fábrica de ítems del editor ---------------- */

export function nuevoItemEditor(kind = 'quiz') {
  const base = {
    id: localId++,
    kind,
    multi: false,
    title: '',
    timeLimit: 20,
    points: 'standard',
    media: null,
    text: '',
    options: [],
  }
  base.options = kind === 'tf'
    ? [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }]
    : [
        { text: '', correct: true },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
      ]
  return base
}

/* ---------------- El store ---------------- */

export const useQuizApiStore = defineStore('quiz', {
  state: () => ({
    quizzes: [],          // listado del dashboard (formato API resumido)
    editing: null,        // quiz abierto en el editor (formato editor)
    loading: false,
    saveState: 'saved',   // 'saved' | 'saving' | 'error'
    _saveTimer: null,
  }),

  actions: {
    async fetchQuizzes() {
      this.loading = true
      try {
        this.quizzes = (await quizzesApi.list()).data
      } finally {
        this.loading = false
      }
    },

    /** Crea un quiz vacío en el servidor y lo abre en el editor. */
    async createQuiz() {
      const created = await quizzesApi.create({ title: 'Nuevo cuestionario', questions: [] })
      this.editing = apiToEditor(created)
      this.editing.questions.push(nuevoItemEditor('quiz'))
      return created.id
    },

    async openQuiz(id) {
      this.editing = apiToEditor(await quizzesApi.get(id))
      if (this.editing.questions.length === 0) {
        this.editing.questions.push(nuevoItemEditor('quiz'))
      }
      this.saveState = 'saved'
    },

    /** Autoguardado con debounce (lo dispara un watcher del editor). */
    scheduleSave() {
      if (!this.editing) return
      this.saveState = 'saving'
      clearTimeout(this._saveTimer)
      this._saveTimer = setTimeout(() => this.saveNow(), 800)
    },

    async saveNow() {
      if (!this.editing) return
      try {
        await quizzesApi.update(this.editing.id, editorToApi(this.editing))
        this.saveState = 'saved'
      } catch (e) {
        this.saveState = 'error'
        console.error('Autoguardado falló', e.response?.data ?? e)
      }
    },

    async duplicateQuiz(id) {
      await quizzesApi.duplicate(id)
      await this.fetchQuizzes()
    },

    async deleteQuiz(id) {
      await quizzesApi.destroy(id)
      this.quizzes = this.quizzes.filter((q) => q.id !== id)
    },

    /** Sube la imagen de una pregunta y la asocia (media del editor). */
    async uploadQuestionImage(item, file) {
      const { path, url } = await quizzesApi.uploadImage(file)
      item.media = { type: 'image', url, path }
    },

    /** Trae un quiz completo en formato editor (lo usa el host para jugar). */
    async loadForHosting(id) {
      return apiToEditor(await quizzesApi.get(id))
    },

    /* ------- Operaciones del editor sobre el borrador (this.editing) ------- */

    addItem(kind) {
      const item = nuevoItemEditor(kind)
      this.editing.questions.push(item)
      return item.id
    },

    /**
     * Inserta las preguntas que generó la IA (formato API) al final del
     * borrador, traduciéndolas al formato del editor. Devuelve cuántas insertó.
     */
    insertGeneratedQuestions(apiQuestions) {
      const nuevas = (apiQuestions ?? []).map((q) => ({
        id: localId++,
        kind: q.kind === 'true_false' ? 'tf' : 'quiz',
        multi: q.kind === 'multi',
        title: q.title,
        timeLimit: q.time_limit,
        points: q.points_mode ?? 'standard',
        media: null,
        text: '',
        options: padOptions(q),
      }))
      this.editing.questions.push(...nuevas)
      return nuevas.length
    },

    duplicateItem(itemId) {
      const list = this.editing.questions
      const idx = list.findIndex((it) => it.id === itemId)
      if (idx < 0) return null
      const copia = JSON.parse(JSON.stringify(list[idx]))
      copia.id = localId++
      list.splice(idx + 1, 0, copia)
      return copia.id
    },

    removeItem(itemId) {
      const list = this.editing.questions
      const idx = list.findIndex((it) => it.id === itemId)
      if (idx >= 0) list.splice(idx, 1)
    },

    moveItem(from, to) {
      const list = this.editing.questions
      if (from === to || from < 0 || to < 0) return
      const [item] = list.splice(from, 1)
      list.splice(to, 0, item)
    },

    /** Cambia el tipo adaptando opciones; conserva título, tiempo y media. */
    changeKind(item, kind) {
      const plantilla = nuevoItemEditor(kind)
      item.kind = kind
      item.multi = false
      item.options = plantilla.options
    },
  },
})
