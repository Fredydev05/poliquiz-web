<script setup>
/*
  LoginView.vue · Acceso del docente (login + registro en una sola tarjeta).
  Al autenticar, redirige al dashboard (o a la ruta que pedía originalmente).
*/
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, UserPlus, AlertCircle } from 'lucide-vue-next'
import BrandLogo from '../../components/ui/BrandLogo.vue'
import BaseInput from '../../components/ui/BaseInput.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const modo = ref('login') // 'login' | 'register'
const name = ref('')
const email = ref('')
const password = ref('')

const valido = computed(() =>
  email.value.trim() !== '' &&
  password.value.length >= (modo.value === 'register' ? 8 : 1) &&
  (modo.value === 'login' || name.value.trim() !== '')
)

async function enviar() {
  if (!valido.value) return
  try {
    if (modo.value === 'login') await auth.login(email.value, password.value)
    else await auth.register(name.value, email.value, password.value)
    // `redirect` viene del guard si intentó entrar a una ruta protegida.
    router.push(route.query.redirect ?? '/dashboard')
  } catch {
    /* el error ya quedó en auth.error y se muestra abajo */
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-marino flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-5">
      <div class="flex justify-center">
        <BrandLogo size="lg" />
      </div>

      <!-- Selector login / registro -->
      <div class="grid grid-cols-2 gap-1 bg-slate-100 rounded-lg p-1 text-sm font-semibold">
        <button
          @click="modo = 'login'; auth.error = null"
          class="py-2 rounded-md transition-colors"
          :class="modo === 'login' ? 'bg-white text-marino shadow-sm' : 'text-slate-500'"
        >Iniciar sesión</button>
        <button
          @click="modo = 'register'; auth.error = null"
          class="py-2 rounded-md transition-colors"
          :class="modo === 'register' ? 'bg-white text-marino shadow-sm' : 'text-slate-500'"
        >Crear cuenta</button>
      </div>

      <div class="space-y-4">
        <BaseInput
          v-if="modo === 'register'"
          v-model="name"
          label="Nombre"
          placeholder="Ej: Prof. Matías Céspedes"
          maxlength="100"
        />
        <BaseInput
          v-model="email"
          type="email"
          label="Correo institucional"
          placeholder="docente@fpune.edu.py"
        />
        <BaseInput
          v-model="password"
          type="password"
          :label="modo === 'register' ? 'Contraseña (mínimo 8 caracteres)' : 'Contraseña'"
          placeholder="••••••••"
          @keyup.enter="enviar"
        />

        <!-- Error del servidor (credenciales, email duplicado, etc.) -->
        <p v-if="auth.error" class="text-sm text-coral flex items-center gap-1.5">
          <AlertCircle :size="15" /> {{ auth.error }}
        </p>

        <BaseButton variant="success" size="lg" block :disabled="!valido || auth.loading" @click="enviar">
          <component :is="modo === 'login' ? LogIn : UserPlus" :size="19" />
          {{ auth.loading ? 'Un momento…' : modo === 'login' ? 'Entrar al panel' : 'Crear mi cuenta' }}
        </BaseButton>
      </div>

      <p class="text-center text-xs text-slate-400">
        Solo docentes. Los estudiantes entran con el PIN en
        <RouterLink to="/play" class="text-azul font-semibold hover:underline">/play</RouterLink>.
      </p>
    </div>
  </div>
</template>
