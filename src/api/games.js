/* Endpoints de partidas: anfitrión y jugador. */
import { http } from './http'

export const gamesApi = {
  // --- anfitrión (Bearer del docente) ---
  start: (pin) => http.post(`/games/${pin}/start`).then((r) => r.data),
  next: (pin) => http.post(`/games/${pin}/next`).then((r) => r.data),
  end: (pin) => http.post(`/games/${pin}/end`),
  create: (quizId) => http.post('/games', { quiz_id: quizId }).then((r) => r.data),
  state: (pin) => http.get(`/games/${pin}/state`).then((r) => r.data),
  lock: (pin) => http.post(`/games/${pin}/lock`).then((r) => r.data),
  unlock: (pin) => http.post(`/games/${pin}/unlock`).then((r) => r.data),
  kick: (pin, uuid) => http.delete(`/games/${pin}/players/${uuid}`),

  // --- jugador (público / X-Player-Token) ---
  join: (pin, nickname) => http.post(`/games/${pin}/join`, { nickname }).then((r) => r.data),
  me: (pin) => http.get(`/games/${pin}/me`).then((r) => r.data),
  answer: (pin, payload) => http.post(`/games/${pin}/answers`, payload).then((r) => r.data),
}
