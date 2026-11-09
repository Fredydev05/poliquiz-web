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

/* Traducción de tipos entre la API y el editor.
   'multi' se representa en el editor como 'quiz' + multi=true. */
/** Respuesta libre (nube, abierta, lluvia de ideas): sin opciones ni puntos. */
export const TIPOS_LIBRES = ['wordcloud', 'open', 'brainstorm']
/** Tipos que no cargan opciones en el editor. */
export const SIN_OPCIONES = ['slide', ...TIPOS_LIBRES]
/** Tipos que no suman puntos (el editor oculta el selector de puntaje). */
export const SIN_PUNTOS = ['poll', ...SIN_OPCIONES]

/* El resto de los tipos se llaman igual en la API y en el editor. */
const MISMO_NOMBRE = ['poll', 'short', 'puzzle', ...SIN_OPCIONES]

function apiKindToEditor(kind) {
  if (kind === 'true_false') return 'tf'
  return MISMO_NOMBRE.includes(kind) ? kind : 'quiz' // quiz y multi
}
function editorKindToApi(q) {
  if (q.kind === 'tf') return 'true_false'
  if (MISMO_NOMBRE.includes(q.kind)) return q.kind
  return q.multi ? 'multi' : 'quiz'
}

function apiToEditor(apiQuiz) {
  return {
    id: apiQuiz.id,
    title: apiQuiz.title,
    color: PALETA[apiQuiz.id % PALETA.length],
    questions: (apiQuiz.questions ?? []).map((q) => ({
      id: localId++,
      kind: apiKindToEditor(q.kind),
      multi: q.kind === 'multi',
      title: q.title,
      body: q.body ?? '',        // cuerpo de la diapositiva
      timeLimit: q.time_limit ?? 20,
      points: q.points_mode ?? 'standard',
      media: q.image_url ? { type: 'image', url: q.image_url, path: q.image_path } : null,
      text: '',
      options: padOptions(q),
    })),
  }
}

function padOptions(apiQuestion) {
  if (SIN_OPCIONES.includes(apiQuestion.kind)) return [] // diapositiva y respuesta libre
  const opts = apiQuestion.options.map((o) => ({ text: o.text, correct: o.is_correct }))
  if (apiQuestion.kind !== 'true_false') {
    // quiz, multi y poll usan 4 slots fijos: rellenamos los que falten.
    while (opts.length < 4) opts.push({ text: '', correct: false })
  }
  return opts
}

/** ¿La pregunta pasaría la validación del servidor? */
export function esPreguntaCompleta(q) {
  if (q.kind === 'slide') return !!q.title?.trim() && !!q.body?.trim()
  if (!q.title?.trim()) return false
  if (TIPOS_LIBRES.includes(q.kind)) return true // solo necesitan la consigna

  const conTexto = q.options.filter((o) => o.text.trim())
  if (q.kind === 'tf') return q.options.length === 2 && conTexto.filter((o) => o.correct).length === 1
  if (q.kind === 'short') return conTexto.length >= 1 // al menos 1 respuesta aceptada
  if (conTexto.length < 2) return false
  if (q.kind === 'poll') return true // la encuesta no exige respuesta correcta
  if (q.kind === 'puzzle') return true // el orden es la respuesta (2+ piezas con texto)

  const correctas = conTexto.filter((o) => o.correct).length
  return q.multi ? correctas >= 1 : correctas === 1
}

function editorToApi(editorQuiz) {
  return {
    title: editorQuiz.title?.trim() || 'Sin título',
    questions: editorQuiz.questions
      .filter(esPreguntaCompleta)
      .map((q) => {
        // Diapositiva: sin opciones ni tiempo, con cuerpo.
        if (q.kind === 'slide') {
          return { kind: 'slide', title: q.title.trim(), body: q.body.trim(), image_path: q.media?.path ?? null }
        }

        return {
          kind: editorKindToApi(q),
          title: q.title.trim(),
          time_limit: q.timeLimit,
          points_mode: q.points ?? 'standard',
          image_path: q.media?.path ?? null,
          options: q.options
            .filter((o) => o.text.trim())
            // Encuesta y puzzle: sin correcta (el orden es la respuesta). Escribe:
            // todas son aceptadas (is_correct=true). El resto respeta el marcador.
            .map((o) => ({
              text: o.text.trim(),
              is_correct: q.kind === 'poll' || q.kind === 'puzzle' ? false : q.kind === 'short' ? true : o.correct,
            })),
        }
      }),
  }
}

/* ---------------- Borrador: ¿el docente ya escribió algo? ---------------- */

const TITULO_NUEVO = 'Nuevo cuestionario'

/**
 * ¿El borrador tiene contenido real? Un cambio de título, cualquier texto de
 * una pregunta/opción, el cuerpo de una diapositiva o una imagen cuentan; los
 * valores por defecto (título "Nuevo cuestionario", "Verdadero"/"Falso" de V/F,
 * cambiar el tipo o el tiempo) no.
 */
function tieneContenido(editorQuiz) {
  const titulo = editorQuiz.title?.trim()
  if (titulo && titulo !== TITULO_NUEVO) return true

  return editorQuiz.questions.some((q) =>
    q.title?.trim()
    || q.body?.trim()
    || q.media
    || (q.kind !== 'tf' && q.options.some((o) => o.text.trim())),
  )
}

/* ---------------- Fábrica de ítems del editor ---------------- */

export function nuevoItemEditor(kind = 'quiz') {
  const base = {
    id: localId++,
    kind,
    multi: false,
    title: '',
    body: '',
    timeLimit: 20,
    points: 'standard',
    media: null,
    text: '',
    options: [],
  }

  if (SIN_OPCIONES.includes(kind)) return base // diapositiva y respuesta libre: sin opciones
  if (kind === 'tf') {
    base.options = [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }]
    return base
  }

  // quiz y poll arrancan con 4 slots (la encuesta sin ninguna marcada).
  base.options = [
    { text: '', correct: kind !== 'poll' },
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
    _creating: null,      // promesa de creación del borrador en vuelo
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

    /**
     * Abre un BORRADOR local (id = null): todavía no existe en la DB. Se crea
     * recién cuando el docente llena el primer campo (ver saveNow), así un
     * click accidental en "Nuevo cuestionario" no deja quizzes vacíos.
     */
    startDraft() {
      this.editing = {
        id: null,
        title: TITULO_NUEVO,
        color: PALETA[0],
        questions: [nuevoItemEditor('quiz')],
      }
      this.saveState = 'saved'
    },

    /** Crea el borrador en el servidor (una sola vez aunque se llame en paralelo). */
    async ensureCreated() {
      if (this.editing.id != null) return this.editing.id
      this._creating ??= quizzesApi.create(editorToApi(this.editing))
        .then((created) => {
          this.editing.id = created.id
          return created.id
        })
        .finally(() => { this._creating = null })
      return this._creating
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
      if (this.editing.id == null && !tieneContenido(this.editing)) return // borrador intacto
      this.saveState = 'saving'
      clearTimeout(this._saveTimer)
      this._saveTimer = setTimeout(() => this.saveNow(), 800)
    },

    async saveNow() {
      if (!this.editing) return
      clearTimeout(this._saveTimer)

      // Borrador que nadie tocó todavía: no se guarda nada en la DB.
      if (this.editing.id == null && !tieneContenido(this.editing)) {
        this.saveState = 'saved'
        return
      }

      try {
        if (this.editing.id == null) {
          // Si ya había una creación en vuelo, su payload puede ser viejo:
          // la esperamos y después actualizamos con el contenido actual.
          const enVuelo = !!this._creating
          await this.ensureCreated()
          if (!enVuelo) {
            this.saveState = 'saved'
            return
          }
        }
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
        kind: apiKindToEditor(q.kind),
        multi: q.kind === 'multi',
        title: q.title,
        body: q.body ?? '',
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
