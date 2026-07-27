<script setup>
/*
  BaseCard.vue · Tarjeta blanca genérica (contenedor con sombra suave).
  Uso:  <BaseCard><p>contenido...</p></BaseCard>
*/
defineProps({
  padding: { type: String, default: 'p-6' }, // permite ajustar el padding
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md border border-slate-200" :class="padding">
    <slot />
  </div>
</template>
