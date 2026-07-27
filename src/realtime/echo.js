/*
  Clientes de Laravel Echo conectados a Reverb — UNO POR ROL.
  --------------------------------------------------------------------------
  ¿Por qué dos instancias? El host y el jugador pueden convivir en el mismo
  navegador (misma localStorage). Si una sola conexión mandara ambas
  credenciales, el backend autenticaría todo como el docente y la presencia
  colapsaría a un solo miembro. Cada rol viaja SOLO con su credencial:
    'host'   → Authorization: Bearer <token sanctum>
    'player' → X-Player-Token: <psession>
*/
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { STORAGE_KEYS } from '../api/http'

window.Pusher = Pusher

const instances = { host: null, player: null }

function buildEcho(role) {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

  const headers = {}
  if (role === 'host') {
    const token = localStorage.getItem(STORAGE_KEYS.hostToken)
    if (token) headers.Authorization = `Bearer ${token}`
  } else {
    const token = localStorage.getItem(STORAGE_KEYS.playerToken)
    if (token) headers['X-Player-Token'] = token
  }

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: apiUrl + '/broadcasting/auth',
    auth: { headers },
  })
}

/** @param {'host'|'player'} role */
export function getEcho(role) {
  if (!instances[role]) instances[role] = buildEcho(role)
  return instances[role]
}

/**
 * Destruye la instancia de un rol (o ambas) para que la próxima conexión
 * tome credenciales frescas — llamar tras login/join/logout.
 * @param {'host'|'player'} [role]
 */
export function resetEcho(role) {
  for (const r of role ? [role] : ['host', 'player']) {
    instances[r]?.disconnect()
    instances[r] = null
  }
}
