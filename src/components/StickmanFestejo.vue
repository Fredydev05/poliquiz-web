<script setup>
/*
  StickmanFestejo.vue · Muñequito de palitos (SVG) que festeja en el podio.
  --------------------------------------------------------------------------
  Dibujado a mano con líneas SVG. Cada puesto recibe una POSE distinta:
    'campeon' → brazos en V, salta sin parar        (1º puesto)
    'animo'   → puño arriba, se balancea de lado    (2º puesto)
    'saludo'  → saluda agitando el brazo + rebota   (3º puesto)

  El loop es `infinite`: festeja hasta que la pantalla se cierra
  (cuando el componente se desmonta, la animación muere sola).
  La entrada respeta el stagger del podio vía la prop `delay`.
*/
defineProps({
  pose: { type: String, default: 'campeon' }, // 'campeon' | 'animo' | 'saludo'
  color: { type: String, default: '#ffffff' },
  delay: { type: Number, default: 0 },        // ms: espera a que suba su columna
})
</script>

<template>
  <!-- --d alimenta los animation-delay del CSS de abajo -->
  <div class="stickman" :class="'pose-' + pose" :style="{ '--d': delay + 'ms' }">
    <svg
      viewBox="0 0 100 140"
      class="w-12 h-16 mx-auto"
      fill="none"
      :stroke="color"
      stroke-width="7"
      stroke-linecap="round"
    >
      <!-- Cabeza (rellena para que se lea desde lejos) -->
      <circle cx="50" cy="22" r="13" :fill="color" stroke="none" />
      <!-- Tronco -->
      <line x1="50" y1="35" x2="50" y2="88" />
      <!-- Piernas -->
      <line x1="50" y1="88" x2="32" y2="126" />
      <line x1="50" y1="88" x2="68" y2="126" />

      <!-- Brazos: cambian según la pose -->
      <template v-if="pose === 'campeon'">
        <!-- Brazos en V de victoria -->
        <line x1="50" y1="50" x2="22" y2="24" />
        <line x1="50" y1="50" x2="78" y2="24" />
      </template>
      <template v-else-if="pose === 'animo'">
        <!-- Un puño al aire, el otro en la cadera -->
        <line x1="50" y1="50" x2="79" y2="27" />
        <polyline points="50,50 30,62 38,76" />
      </template>
      <template v-else>
        <!-- Brazo que saluda (grupo animado con "ola") + brazo caído -->
        <g class="brazo-saludo">
          <line x1="50" y1="50" x2="80" y2="32" />
        </g>
        <line x1="50" y1="50" x2="30" y2="74" />
      </template>
    </svg>
  </div>
</template>

<style scoped>
/* --- Entrada: aparece cuando su columna ya subió (delay = --d) --- */
@keyframes stick-aparece {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.7);
  }
}
.stickman {
  animation: stick-aparece 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-delay: var(--d);
}

/* --- Loops de festejo (infinitos hasta cerrar la pantalla) --- */

/* 1º: salta de alegría */
@keyframes stick-salto {
  0%, 100% { transform: translateY(0); }
  35%      { transform: translateY(-13px); }
  55%      { transform: translateY(-11px); }
}
/* 2º: se balancea de lado a lado (pivote en los pies) */
@keyframes stick-balanceo {
  0%, 100% { transform: rotate(-7deg); }
  50%      { transform: rotate(7deg); }
}
/* 3º: rebote suave en el lugar */
@keyframes stick-rebote {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
/* Ola del brazo que saluda (rota desde el hombro: 50,50 del viewBox) */
@keyframes stick-ola {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-32deg); }
}

/* El loop arranca DESPUÉS de la entrada: delay = --d + 300ms.
   Se anima el <svg> interno para no pisar el transform de la entrada. */
.pose-campeon svg {
  animation: stick-salto 800ms ease-in-out infinite;
  animation-delay: calc(var(--d) + 300ms);
}
.pose-animo svg {
  transform-origin: 50% 100%;
  animation: stick-balanceo 1100ms ease-in-out infinite;
  animation-delay: calc(var(--d) + 300ms);
}
.pose-saludo svg {
  animation: stick-rebote 1200ms ease-in-out infinite;
  animation-delay: calc(var(--d) + 300ms);
}
.brazo-saludo {
  transform-origin: 50px 50px; /* el hombro */
  animation: stick-ola 700ms ease-in-out infinite alternate;
  animation-delay: calc(var(--d) + 300ms);
}

/* Menos movimiento: solo aparecen, sin loops de festejo. */
@media (prefers-reduced-motion: reduce) {
  .pose-campeon svg,
  .pose-animo svg,
  .pose-saludo svg,
  .brazo-saludo {
    animation: none;
  }
}
</style>
