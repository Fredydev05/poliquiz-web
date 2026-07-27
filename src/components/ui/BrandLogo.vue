<script setup>
/*
  BrandLogo.vue · Logo institucional de la Facultad Politécnica.
  Usa la imagen real ubicada en  public/logo.png .
  En fondos oscuros (dark) el logo va sobre un recuadro blanco para
  que contraste, ya que el logo original es de color azul marino.
*/
defineProps({
  // dark=true → para fondos oscuros (texto blanco); false → fondos claros.
  dark: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // sm | md | lg
})

const tamanos = {
  sm: { box: 'w-8 h-8', text: 'text-base' },
  md: { box: 'w-10 h-10', text: 'text-xl' },
  lg: { box: 'w-14 h-14', text: 'text-3xl' },
}
</script>

<template>
  <div class="flex items-center gap-2.5">
    <!-- Logo real de la Facultad (public/logo.png).
         En fondo oscuro lo envolvemos en un recuadro blanco para contraste. -->
    <div
      class="rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
      :class="[tamanos[size].box, dark ? 'bg-white p-1 shadow-md' : '']"
    >
      <img src="/logo-fpune.webp" alt="Facultad Politécnica - UNE" class="w-full h-full object-contain" />
    </div>
    <div class="leading-tight">
      <span class="font-extrabold" :class="[tamanos[size].text, dark ? 'text-white' : 'text-marino']">
        POLI&nbsp;<span class="text-azul-intenso">Quiz</span>
      </span>
      <p class="text-[10px] uppercase tracking-wider" :class="dark ? 'text-white/50' : 'text-slate-400'">
        Facultad Politécnica · UNE
      </p>
    </div>
  </div>
</template>
