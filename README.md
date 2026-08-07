# POLI Quiz 🎓

Maqueta interactiva de una plataforma de trivias estilo **Kahoot!** para la **Facultad Politécnica · UNE**. Todo el funcionamiento es simulado en el frontend con datos mockeados (sin backend): un store reactivo compartido conecta la vista del profesor con la del estudiante en tiempo real.

## Stack

- [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- [Vite](https://vite.dev/) · [Tailwind CSS v4](https://tailwindcss.com/)
- [lucide-vue-next](https://lucide.dev/) (iconos) · [canvas-confetti](https://github.com/catdad/canvas-confetti) (confeti del podio)

## Comandos

Este proyecto usa **pnpm** (`corepack enable` o `npm i -g pnpm` si no lo tenés):

```bash
pnpm install     # instalar dependencias
pnpm dev         # levantar en desarrollo → http://localhost:5173
pnpm build       # compilar para producción (carpeta dist/)
pnpm preview     # servir el build de producción
pnpm test        # correr los tests (Vitest)
```

## Cómo probar la demo

La barra superior permite alternar entre los dos roles:

1. **Estudiante** → ingresá un PIN cualquiera + apodo (quedás en sala de espera).
2. **Profesor** → *Iniciar juego* en un cuestionario → *Comenzar juego*.
3. Volvé a **Estudiante** → respondé tocando un color.
4. Como **Profesor** → *Cerrar respuestas* → *Siguiente* → podio final con confeti 🎉.

## Estructura

```
src/
├── composables/useQuizStore.js   # estado global mockeado (simula backend)
├── components/ui/                # botones, inputs, cards, logo
├── views/teacher/                # dashboard, editor y pantalla de host
└── views/student/                # login, sala de espera, respuesta y feedback
```
