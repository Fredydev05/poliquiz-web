/*
  Store del JUGADOR invitado (Pinia).
  --------------------------------------------------------------------------
  La pantalla del celular se DERIVA de este estado, que se mueve por los
  eventos WS de la partida. Tras cada QuestionEnded se consulta /me para
  el feedback personal (puntos, racha, posición) — 1 request por pregunta.
*/
import { defineStore } from 'pinia'
import { gamesApi } from '../api/games'
import { STORAGE_KEYS } from '../api/http'
import { getEcho, resetEcho } from '../realtime/echo'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    pin: null,
    nickname: '',
    uuid: null,
    joined: false,
    kicked: false,
    ended: false,          // partida terminada/abortada (pantalla final)
    aborted: false,
    quizTitle: '',
    gameState: 'lobby',    // espejo del estado del servidor
    joining: false,
    error: null,

    // --- pregunta en curso ---
    currentIndex: -1,
    questionsTotal: 0,
    question: null,        // {kind, options:[{id,text}], time_limit, ...} SIN correctas
    questionUuid: null,
    endsAtMs: 0,
    serverNowMs: 0,
    answered: false,
    mySelection: [],

    // --- feedback personal (viene de /me tras QuestionEnded) ---
    lastResult: null,      // {is_correct, points, streak}
    score: 0,
    streak: 0,
    rank: null,
    podium: [],
  }),

  actions: {
    async join(pin, nickname) {
      this.joining = true
      this.error = null
      this.kicked = false
      this.ended = false
      try {
        const res = await gamesApi.join(pin, nickname)
        this.pin = pin
        this.nickname = res.nickname
        this.uuid = res.player_uuid
        this.quizTitle = res.game.quiz_title
        this.gameState = res.game.state
        this.joined = true

        localStorage.setItem(STORAGE_KEYS.playerToken, res.player_token)
        localStorage.setItem(STORAGE_KEYS.playerPin, pin)
        resetEcho('player')
        this.connect()
      } catch (e) {
        this.error = e.response?.data?.message
          ?? e.response?.data?.errors?.nickname?.[0]
          ?? 'No se pudo entrar a la sala.'
        throw e
      } finally {
        this.joining = false
      }
    },

    /** Reconexión tras refresh: restaura pantalla, puntaje y suscripción. */
    async resume() {
      const token = localStorage.getItem(STORAGE_KEYS.playerToken)
      const pin = localStorage.getItem(STORAGE_KEYS.playerPin)
      if (!token || !pin) return false
      try {
        const me = await gamesApi.me(pin)
        this.pin = pin
        this.nickname = me.nickname
        this.uuid = me.player_uuid
        this.quizTitle = me.quiz_title
        this.gameState = me.state
        this.currentIndex = me.current_index
        this.questionUuid = me.question_uuid
        this.endsAtMs = me.ends_at_ms ?? 0
        this.serverNowMs = me.server_now_ms
        this.answered = me.answered
        this.score = me.score
        this.streak = me.streak
        this.rank = me.rank
        this.lastResult = me.last_result
        this.joined = true
        this.connect()
        return true
      } catch {
        this.clearSession()
        return false
      }
    },

    connect() {
      getEcho('player').join(`game.${this.pin}`)
        .listen('.PlayerKicked', (e) => {
          if (e.uuid === this.uuid) this.leaveKicked()
        })
        .listen('.GetReadyShown', (e) => {
          this.gameState = 'get_ready'
          this.currentIndex = e.index
          this.questionsTotal = e.total
          this.answered = false
          this.mySelection = []
          this.lastResult = null
        })
        .listen('.QuestionStarted', (e) => {
          this.gameState = 'question'
          this.question = e
          this.questionUuid = e.question_uuid
          this.endsAtMs = e.ends_at_ms
          this.serverNowMs = e.server_now_ms
          this.answered = false
        })
        .listen('.QuestionEnded', async () => {
          this.gameState = 'results'
          // Feedback personal: puntos, racha y posición desde el servidor.
          try {
            const me = await gamesApi.me(this.pin)
            this.lastResult = me.last_result
            this.score = me.score
            this.streak = me.streak
            this.rank = me.rank
          } catch { /* si la sala murió, el próximo evento lo resuelve */ }
        })
        .listen('.LeaderboardShown', () => {
          this.gameState = 'leaderboard'
        })
        .listen('.GameEnded', (e) => {
          this.gameState = 'podium'
          this.podium = e.podium
          this.aborted = e.aborted
          this.ended = true
        })
    },

    /** Envía la respuesta (ids de opciones). El servidor valida TODO. */
    async answer(selectedIds) {
      if (this.answered || this.gameState !== 'question') return
      this.answered = true          // feedback inmediato (optimista)
      this.mySelection = selectedIds
      try {
        await gamesApi.answer(this.pin, {
          question_index: this.currentIndex,
          question_uuid: this.questionUuid,
          selected: selectedIds,
        })
      } catch (e) {
        // TIME_EXPIRED o STALE: la revelación llegará igual por WS.
        if (e.response?.status === 401) this.leaveKicked()
      }
    },

    leaveKicked() {
      this.clearSession()
      this.kicked = true
    },

    leave() {
      this.clearSession()
    },

    clearSession() {
      if (this.pin) getEcho('player').leave(`game.${this.pin}`)
      localStorage.removeItem(STORAGE_KEYS.playerToken)
      localStorage.removeItem(STORAGE_KEYS.playerPin)
      const kicked = this.kicked
      this.$reset()
      this.kicked = kicked
    },
  },
})
