<script setup>
/*
  BaseInput.vue · Input con label que soporta v-model.
  ---------------------------------------------------
  Para que un componente propio funcione con v-model necesita:
   1. una prop llamada `modelValue`
   2. emitir el evento `update:modelValue` cuando el usuario escribe
  Uso:  <BaseInput v-model="pin" label="Código PIN" />
*/
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  maxlength: { type: [String, Number], default: undefined },
  center: { type: Boolean, default: false }, // texto centrado (útil para el PIN)
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-semibold text-slate-600 mb-1">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      @input="emit('update:modelValue', $event.target.value)"
      class="w-full rounded-lg border border-slate-300 px-4 py-3 transition-shadow
             focus:outline-none focus:ring-2 focus:ring-marino"
      :class="center ? 'text-center tracking-[0.3em] text-lg font-bold' : ''"
    />
  </div>
</template>
