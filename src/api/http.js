/*
  Capa HTTP única (axios).
  --------------------------------------------------------------------------
  - baseURL configurable por entorno (VITE_API_URL) → /api/v1
  - Adjunta automáticamente el Bearer del docente y el X-Player-Token
    del jugador si existen en storage.
  - 401 de docente → limpia sesión y manda a /login (se activa en F1).
*/
import axios from 'axios'

export const http = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api/v1',
  headers: { Accept: 'application/json' },
})

// Claves de storage documentadas en el plan (§6).
export const STORAGE_KEYS = {
  hostToken: 'pq.host.token',
  playerToken: 'pq.player.token',
  playerPin: 'pq.player.pin',
  hostActivePin: 'pq.host.activePin', // sessionStorage
}

http.interceptors.request.use((config) => {
  const hostToken = localStorage.getItem(STORAGE_KEYS.hostToken)
  if (hostToken) config.headers.Authorization = `Bearer ${hostToken}`

  const playerToken = localStorage.getItem(STORAGE_KEYS.playerToken)
  if (playerToken) config.headers['X-Player-Token'] = playerToken

  return config
})
