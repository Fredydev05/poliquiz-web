/*
  Store de autenticación del docente (Pinia).
  El token Bearer se persiste en localStorage (clave del plan §6) y la capa
  HTTP lo adjunta sola en cada request.
*/
import { defineStore } from 'pinia'
import { authApi } from '../api/auth'
import { STORAGE_KEYS } from '../api/http'
import { resetEcho } from '../realtime/echo'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem(STORAGE_KEYS.hostToken),
    loading: false,
    error: null,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
  },

  actions: {
    _setSession({ user, token }) {
      this.user = user
      this.token = token
      localStorage.setItem(STORAGE_KEYS.hostToken, token)
      resetEcho('host') // el próximo canal WS debe autorizar con el token nuevo
    },

    async login(email, password) {
      this.loading = true
      this.error = null
      try {
        this._setSession(await authApi.login({ email, password }))
      } catch (e) {
        this.error = e.response?.data?.message ?? 'No se pudo iniciar sesión.'
        throw e
      } finally {
        this.loading = false
      }
    },

    async register(name, email, password) {
      this.loading = true
      this.error = null
      try {
        this._setSession(await authApi.register({ name, email, password }))
      } catch (e) {
        this.error = e.response?.data?.message ?? 'No se pudo crear la cuenta.'
        throw e
      } finally {
        this.loading = false
      }
    },

    /** Rehidrata el usuario al recargar la página (token persistido). */
    async fetchMe() {
      if (!this.token) return
      try {
        this.user = await authApi.me()
      } catch {
        this.logoutLocal() // token vencido/revocado
      }
    },

    async logout() {
      try { await authApi.logout() } catch { /* el token ya no servía */ }
      this.logoutLocal()
    },

    logoutLocal() {
      this.user = null
      this.token = null
      localStorage.removeItem(STORAGE_KEYS.hostToken)
      resetEcho('host')
    },
  },
})
