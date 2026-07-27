<script setup>
/*
  StudentLogin.vue · Ingreso REAL del jugador (Mobile-First).
  El PIN se pre-carga si llegó por QR (/play?pin=123456). El join va a la
  API: PIN inexistente, sala bloqueada o apodo repetido muestran su error.
*/
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, AlertCircle, UserX } from 'lucide-vue-next'
import BrandLogo from '../../components/ui/BrandLogo.vue'
import BaseInput from '../../components/ui/BaseInput.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import { usePlayerStore } from '../../stores/player'

const route = useRoute()
const player = usePlayerStore()

// Si vino por QR, el PIN ya llega en la URL.
const pin = ref(typeof route.query.pin === 'string' ? route.query.pin : '')
const nick = ref('')

const isValid = computed(() => /^\d{6}$/.test(pin.value.trim()) && nick.value.trim().length >= 2)

async function entrar() {
  if (!isValid.value || player.joining) return
  try {
    await player.join(pin.value.trim(), nick.value)
  } catch {
    /* el mensaje quedó en player.error */
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-marino flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-6">

      <div class="flex justify-center">
        <BrandLogo size="lg" />
      </div>

      <!-- Aviso si el docente lo expulsó -->
      <p v-if="player.kicked" class="text-sm text-coral bg-coral/10 rounded-lg p-3 flex items-center gap-2">
        <UserX :size="16" class="shrink-0" /> El docente te quitó de la sala.
      </p>

      <div class="space-y-4">
        <BaseInput
          v-model="pin"
          label="Código PIN del juego"
          placeholder="123 456"
          maxlength="6"
          center
        />
        <BaseInput
          v-model="nick"
          label="Apodo (Nickname)"
          placeholder="Ej: ProfeMatias"
          maxlength="15"
          @keyup.enter="entrar"
        />

        <!-- Error real del servidor (PIN, sala bloqueada, apodo…) -->
        <p v-if="player.error" class="text-sm text-coral flex items-center gap-1.5">
          <AlertCircle :size="15" class="shrink-0" /> {{ player.error }}
        </p>

        <BaseButton variant="success" size="lg" block :disabled="!isValid || player.joining" @click="entrar">
          {{ player.joining ? 'Entrando…' : 'Ingresar a la Sala' }}
          <ArrowRight v-if="!player.joining" :size="20" />
        </BaseButton>
      </div>

      <p class="text-center text-xs text-slate-400">
        Pedile el PIN a tu docente o escaneá el QR proyectado.
      </p>
    </div>
  </div>
</template>
