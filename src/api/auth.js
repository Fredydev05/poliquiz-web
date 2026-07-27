/* Endpoints de autenticación del docente (Sanctum · Bearer). */
import { http } from './http'

export const authApi = {
  register: (data) => http.post('/auth/register', data).then((r) => r.data),
  login: (data) => http.post('/auth/login', data).then((r) => r.data),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me').then((r) => r.data.user),
}
