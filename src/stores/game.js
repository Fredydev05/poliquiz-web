/*
  Store de partida del ANFITRIÓN (Pinia).
  --------------------------------------------------------------------------
  Reducer de eventos WS: cada evento trae state_version y se DESCARTA si es
  viejo (elimina razas de red). Las acciones (start/next/lock/kick) van por
  REST; el estado siempre vuelve por eventos o por /state al rehidratar.
*/
import { defineStore } from 'pinia'
import { gamesApi } from '../api/games'
import { getEcho } from '../realtime/echo'

export const useGameStore = defineStore('game', {
  state: () => ({
    pin: null,
    quizTitle: '',
    questionsTotal: 0,
    state: 'lobby',          // lobby | get_ready | question | results | leaderboard | podium
    stateVersion: 0,
    locked: false,
    players: [],             // [{uuid, nickname, connected}]
    channel: null,

    // --- pregunta en curso ---
    currentIndex: -1,
    question: null,          // payload de QuestionStarted, o del /state al rehidratar
    questionUuid: null,
    endsAtMs: 0,
    serverNowMs: 0,
    answeredCount: 0,

    // --- revelación / ranking ---
    correctOptionIds: [],
    distribution: [],        // [{option_id, count}]
    top: [],                 // [{uuid, nickname, score, delta}]
    podium: [],
    aborted: false,
  }),

  getters: {
    joinUrl: (s) => (s.pin ? `${window.location.origin}/play?pin=${s.pin}` : ''),
    isLastQuestion: (s) => s.currentIndex >= s.questionsTotal - 1,
  },

  actions: {
    /** ¿El evento es más nuevo que lo ya visto? (descarta viejos/duplicados) */
    _fresh(version) {
      if (version <= this.stateVersion) return false
      this.stateVersion = version
      return true
    },

    async create(quizId) {
      const { pin } = await gamesApi.create(quizId)
      await this.hydrate(pin)
      return pin
    },

    /** Rehidratación completa desde /state (URL directa o F5 del host). */
    async hydrate(pin) {
      const st = await gamesApi.state(pin)
      this.pin = pin
      this.state = st.state
      this.stateVersion = st.state_version
      this.locked = st.locked
      this.quizTitle = st.quiz_title
      this.questionsTotal = st.questions_total
      this.currentIndex = st.current_index
      this.question = st.question          // con is_correct (es el host)
      this.questionUuid = st.question_uuid
      this.endsAtMs = st.ends_at_ms ?? 0
      this.serverNowMs = st.server_now_ms
      this.answeredCount = st.answered_count
      this.top = st.top ?? []
      this.players = st.players.map((p) => ({ ...p, connected: true }))
      // Si volvió en plena revelación, las correctas salen de la pregunta.
      if (st.state === 'results' && st.question) {
        this.correctOptionIds = st.question.options.filter((o) => o.is_correct).map((o) => o.id)
      }
      this.connect()
    },

    connect() {
      if (this.channel) return
      const echo = getEcho('host')

      // Canal de presencia: roster + eventos de juego.
      this.channel = echo.join(`game.${this.pin}`)
        .here((members) => {
          const conectados = new Set(members.filter((m) => m.role === 'player').map((m) => m.uuid))
          this.players.forEach((p) => (p.connected = conectados.has(p.uuid)))
          members
            .filter((m) => m.role === 'player' && !this.players.some((p) => p.uuid === m.uuid))
            .forEach((m) => this.players.push({ uuid: m.uuid, nickname: m.nickname, connected: true }))
        })
        .joining((m) => {
          if (m.role !== 'player') return
          const existente = this.players.find((p) => p.uuid === m.uuid)
          if (existente) existente.connected = true
          else this.players.push({ uuid: m.uuid, nickname: m.nickname, connected: true })
        })
        .leaving((m) => {
          const p = this.players.find((pl) => pl.uuid === m.uuid)
          if (p) p.connected = false
        })
        .listen('.PlayerKicked', (e) => {
          this.players = this.players.filter((p) => p.uuid !== e.uuid)
        })
        .listen('.GameLocked', (e) => { this.locked = e.locked })
        .listen('.GetReadyShown', (e) => {
          if (!this._fresh(e.state_version)) return
          this.state = 'get_ready'
          this.currentIndex = e.index
          this.answeredCount = 0
          this.correctOptionIds = []
          this.distribution = []
        })
        .listen('.QuestionStarted', (e) => {
          if (!this._fresh(e.state_version)) return
          this.state = 'question'
          this.question = e            // título, opciones (sin correctas), etc.
          this.questionUuid = e.question_uuid
          this.endsAtMs = e.ends_at_ms
          this.serverNowMs = e.server_now_ms
        })
        .listen('.QuestionEnded', (e) => {
          if (!this._fresh(e.state_version)) return
          this.state = 'results'
          this.correctOptionIds = e.correct_option_ids
          this.distribution = e.distribution
        })
        .listen('.LeaderboardShown', (e) => {
          if (!this._fresh(e.state_version)) return
          this.state = 'leaderboard'
          this.top = e.top
        })
        .listen('.GameEnded', (e) => {
          if (!this._fresh(e.state_version)) return
          this.state = 'podium'
          this.podium = e.podium
          this.aborted = e.aborted
        })

      // Canal privado del host: progreso de respuestas ("12/28 respondieron").
      echo.private(`game.${this.pin}.host`)
        .listen('.AnswerReceived', (e) => {
          this.answeredCount = e.answered_count
        })
    },

    /** Avanza la máquina de estados (lobby→juego, results→leaderboard, …). */
    async start() { await gamesApi.start(this.pin) },
    async next() { await gamesApi.next(this.pin) },

    /** Aborta la partida y desarma la sala (X del host). */
    async end() {
      try { await gamesApi.end(this.pin) } catch { /* ya estaba cerrada */ }
      this.reset()
    },

    async toggleLock() {
      this.locked ? await gamesApi.unlock(this.pin) : await gamesApi.lock(this.pin)
    },

    async kick(uuid) { await gamesApi.kick(this.pin, uuid) },

    reset() {
      if (this.channel) {
        getEcho('host').leave(`game.${this.pin}`)
        getEcho('host').leave(`game.${this.pin}.host`)
      }
      this.$reset()
    },
  },
})
