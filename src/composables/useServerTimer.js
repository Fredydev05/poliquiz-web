/*
  useServerTimer · Countdown sincronizado con el reloj DEL SERVIDOR (plan §6).
  --------------------------------------------------------------------------
  El servidor manda ends_at_ms y server_now_ms. Con eso calculamos el offset
  entre su reloj y el nuestro; a partir de ahí solo DIBUJAMOS el tiempo
  restante — el cierre real siempre lo decide el servidor.
*/
import { ref, computed, onUnmounted } from 'vue'

export function useServerTimer() {
  const remainingMs = ref(0)
  const totalMs = ref(1)
  let offset = 0        // server_now - client_now
  let endsAt = 0        // en tiempo del servidor
  let rafId = null

  function tick() {
    remainingMs.value = Math.max(0, endsAt - (Date.now() + offset))
    if (remainingMs.value > 0) {
      rafId = requestAnimationFrame(tick)
    }
  }

  /** Arranca (o re-sincroniza) con los timestamps del servidor. */
  function sync(endsAtMs, serverNowMs, timeLimitSeconds) {
    offset = serverNowMs - Date.now()
    endsAt = endsAtMs
    totalMs.value = timeLimitSeconds * 1000
    cancelAnimationFrame(rafId)
    tick()
  }

  function stop() {
    cancelAnimationFrame(rafId)
    remainingMs.value = 0
  }

  onUnmounted(() => cancelAnimationFrame(rafId))

  return {
    remainingMs,
    seconds: computed(() => Math.ceil(remainingMs.value / 1000)),
    percent: computed(() => (remainingMs.value / totalMs.value) * 100),
    isUrgent: computed(() => remainingMs.value > 0 && remainingMs.value <= 5000),
    sync,
    stop,
  }
}
