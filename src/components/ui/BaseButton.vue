<script setup>
/*
  BaseButton.vue · Botón reutilizable con variantes de color.
  Uso:  <BaseButton variant="primary" @click="...">Texto</BaseButton>
*/
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | success | ghost | danger
  size: { type: String, default: 'md' },         // sm | md | lg
  block: { type: Boolean, default: false },      // ocupa todo el ancho
  disabled: { type: Boolean, default: false },
})

// Mapa de estilos por variante (usa la paleta institucional de style.css).
const variantes = {
  primary: 'bg-marino text-white hover:bg-marino-claro',
  success: 'bg-esmeralda text-white hover:brightness-110',
  danger: 'bg-coral text-white hover:brightness-110',
  ghost: 'bg-white/10 text-white hover:bg-white/20',
}
const tamanos = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-6 py-3 text-lg',
}

const clases = computed(() => [
  'font-semibold rounded-lg shadow-md transition-all active:scale-95',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  'inline-flex items-center justify-center gap-2',
  variantes[props.variant],
  tamanos[props.size],
  props.block ? 'w-full' : '',
])
</script>

<template>
  <button :class="clases" :disabled="disabled">
    <!-- <slot /> renderiza lo que pongas entre <BaseButton>...</BaseButton> -->
    <slot />
  </button>
</template>
