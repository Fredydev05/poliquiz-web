<script setup>
/*
  StudentLobby.vue · Sala de espera REAL del jugador.
  Está conectado por WebSocket: cuando el docente lance la primera
  pregunta (F3), esta pantalla cambiará sola.
*/
import { Eye, LogOut, Loader } from 'lucide-vue-next'
import BaseButton from '../../components/ui/BaseButton.vue'
import { usePlayerStore } from '../../stores/player'

const player = usePlayerStore()
</script>

<template>
  <div class="min-h-[calc(100vh-52px)] bg-marino flex items-center justify-center p-4 text-white">
    <div class="text-center space-y-6 max-w-sm">

      <Loader :size="48" class="mx-auto animate-spin text-dorado" />

      <div>
        <h1 class="text-2xl font-extrabold">¡Estás dentro, {{ player.nickname }}!</h1>
        <p class="text-white/60 text-sm mt-1">{{ player.quizTitle }}</p>
        <p class="text-white/70 mt-3 flex items-center justify-center gap-2">
          <Eye :size="18" /> Mirá la pantalla del profesor
        </p>
        <p class="text-white/40 text-sm mt-1">El juego comenzará en cualquier momento…</p>
      </div>

      <BaseButton variant="ghost" size="sm" @click="player.leave()">
        <LogOut :size="15" /> Salir de la sala
      </BaseButton>
    </div>
  </div>
</template>
