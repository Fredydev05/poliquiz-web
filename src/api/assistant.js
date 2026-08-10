/*
  Cliente del asistente de IA (SSE streaming).
  --------------------------------------------------------------------------
  Usamos fetch + ReadableStream en vez de EventSource porque necesitamos
  mandar el Bearer del docente (EventSource no permite headers y es solo GET).
  El backend emite eventos `data: {type,...}`: token | result | error | done.
*/
import { STORAGE_KEYS } from './http'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api/v1'

/**
 * Abre el stream del asistente y despacha callbacks por cada evento.
 * @returns {Promise<void>} resuelve cuando el stream termina.
 */
export async function streamAssistant(quizId, message, { onToken, onResult, onError, signal } = {}) {
  let res
  try {
    res = await fetch(`${BASE}/quizzes/${quizId}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${localStorage.getItem(STORAGE_KEYS.hostToken) ?? ''}`,
      },
      body: JSON.stringify({ message }),
      signal,
    })
  } catch (e) {
    if (e.name !== 'AbortError') onError?.('No se pudo conectar con el asistente.')
    return
  }

  // Errores antes del stream (422 validación, 403, 429 rate-limit): son JSON.
  if (!res.ok) {
    let msg = res.status === 429
      ? 'Estás yendo muy rápido. Esperá un momento y probá de nuevo.'
      : 'El asistente no está disponible ahora.'
    try { msg = (await res.json()).message || msg } catch { /* sin cuerpo JSON */ }
    onError?.(msg)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    let chunk
    try {
      chunk = await reader.read()
    } catch (e) {
      if (e.name !== 'AbortError') onError?.('Se cortó la conexión con el asistente.')
      return
    }
    if (chunk.done) break

    buffer += decoder.decode(chunk.value, { stream: true })

    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      const line = raw.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue

      let evt
      try { evt = JSON.parse(line.slice(6)) } catch { continue }

      if (evt.type === 'token') onToken?.(evt.text)
      else if (evt.type === 'result') onResult?.(evt)
      else if (evt.type === 'error') onError?.(evt.message)
    }
  }
}
