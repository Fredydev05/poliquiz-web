import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Configuración de Vite: activamos el plugin de Vue (para los archivos .vue)
// y el plugin de Tailwind v4 (no necesita archivo tailwind.config.js).
export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
