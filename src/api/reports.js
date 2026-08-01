/* Endpoints de reportes post-partida (docente). */
import { http } from './http'

export const reportsApi = {
  list: () => http.get('/reports/games').then((r) => r.data),
  summary: (id) => http.get(`/reports/games/${id}`).then((r) => r.data),
  questions: (id) => http.get(`/reports/games/${id}/questions`).then((r) => r.data.questions),
  players: (id) => http.get(`/reports/games/${id}/players`).then((r) => r.data.players),
}
