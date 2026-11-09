<script setup>
/*
  ConfirmModal.vue · Confirmación de acciones destructivas (reemplaza al
  confirm() del navegador). Cierra con Escape, click afuera o "Cancelar".
*/
import { watch, onUnmounted } from 'vue'
import { AlertTriangle, Loader } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '¿Estás seguro?' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Eliminar' },
  loading: { type: Boolean, default: false }, // mientras corre la acción
})
const emit = defineEmits(['confirm', 'cancel'])

function onKey(e) {
  if (e.key === 'Escape' && !props.loading) emit('cancel')
}
watch(() => props.open, (abierto) => {
  abierto ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] bg-marino/60 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="!loading && emit('cancel')"
      >
        <div class="confirm-card bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" role="alertdialog" aria-modal="true">
          <div class="w-12 h-12 rounded-full bg-coral/10 text-coral flex items-center justify-center mb-4">
            <AlertTriangle :size="24" />
          </div>
          <h2 class="text-lg font-extrabold text-marino">{{ title }}</h2>
          <p v-if="message" class="text-sm text-slate-500 mt-1.5 leading-relaxed">{{ message }}</p>

          <div class="flex gap-2 mt-6">
            <BaseButton variant="ghost" class="flex-1 !bg-slate-100 !text-slate-600 hover:!bg-slate-200" :disabled="loading" @click="emit('cancel')">
              Cancelar
            </BaseButton>
            <BaseButton variant="danger" class="flex-1" :disabled="loading" @click="emit('confirm')">
              <Loader v-if="loading" :size="16" class="animate-spin" />
              {{ confirmLabel }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-enter-active, .confirm-leave-active { transition: opacity 180ms ease; }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }
.confirm-enter-active .confirm-card { transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1); }
.confirm-enter-from .confirm-card { transform: scale(0.94); }

@media (prefers-reduced-motion: reduce) {
  .confirm-enter-active, .confirm-leave-active, .confirm-enter-active .confirm-card { transition: none; }
}
</style>
