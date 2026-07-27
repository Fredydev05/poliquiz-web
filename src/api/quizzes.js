/* Endpoints de cuestionarios (CRUD del docente). */
import { http } from './http'

export const quizzesApi = {
  list: (filter = 'mine') => http.get('/quizzes', { params: { filter } }).then((r) => r.data),
  get: (id) => http.get(`/quizzes/${id}`).then((r) => r.data.data),
  create: (payload) => http.post('/quizzes', payload).then((r) => r.data.data),
  update: (id, payload) => http.put(`/quizzes/${id}`, payload).then((r) => r.data.data),
  destroy: (id) => http.delete(`/quizzes/${id}`),
  duplicate: (id) => http.post(`/quizzes/${id}/duplicate`).then((r) => r.data.data),
  uploadImage: (file) => {
    const form = new FormData()
    form.append('image', file)
    return http.post('/media', form).then((r) => r.data)
  },
}
