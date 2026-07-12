# TimePath — Prototipo

App que fracciona proyectos académicos grandes en micro-tareas diarias, para evitar
la procrastinación por abrumamiento. Prototipo para sustentación universitaria.

**Stack:** Next.js (App Router) + Tailwind CSS + Neon (Postgres) + Gemini API + Vercel.

> Solo necesitas **3 cosas gratis**: **Neon** (base de datos), **Gemini API key** (la IA)
> y **Vercel** (hosting). **NO necesitas Render**: las API routes de Next.js son el
> backend y Vercel las ejecuta como funciones serverless.

## 1. Crear la base de datos en Neon

1. Entra a [neon.tech](https://neon.tech) y crea una cuenta (gratis, con Google).
2. Crea un proyecto (nombre: `timepath`, región: la más cercana).
3. En el panel del proyecto abre el **SQL Editor** (menú izquierdo).
4. Copia TODO el contenido de [`schema.sql`](schema.sql), pégalo y presiona **Run**.
   Eso crea las tablas y los 5 usuarios de prueba (`usuario1`..`usuario5`, clave `123`).
5. (Opcional pero recomendado para la demo) Ejecuta también [`seed-demo.sql`](seed-demo.sql):
   simula que cada usuario ya usó la app varios días (rachas distintas, proyectos
   completados y proyectos a medias).
6. Ve a **Dashboard → Connect**, copia la **connection string** (`postgresql://...`).

## 2. Conseguir la API key de Gemini (gratis)

1. Entra a [aistudio.google.com](https://aistudio.google.com) con tu cuenta de Google.
2. Click en **Get API key → Create API key**.
3. Copia la key (empieza con `AIzaSy...`). El plan gratuito sobra para la demo.

## 3. Correr localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de variables de entorno
copy .env.example .env.local
# Abre .env.local y pega tu DATABASE_URL (Neon) y tu GEMINI_API_KEY

# 3. Levantar el servidor de desarrollo
npm run dev
```

Abre http://localhost:3000 y entra con `usuario1` / `123`.

## 4. Deploy a Vercel

**Opción A — con GitHub (recomendada):**

```bash
git init
git add .
git commit -m "Prototipo TimePath"
# Crea un repo vacío en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/prototipo-timeapp.git
git branch -M main
git push -u origin main
```

1. Entra a [vercel.com](https://vercel.com), **Add New → Project**, e importa el repo.
2. Antes de darle Deploy, en **Environment Variables** agrega LAS DOS:
   - `DATABASE_URL` = tu connection string de Neon
   - `GEMINI_API_KEY` = tu key de Google AI Studio
3. Click **Deploy**. Te da una URL pública tipo `https://prototipo-timeapp.vercel.app`.

**Opción B — con la CLI (sin GitHub):**

```bash
npm i -g vercel
vercel login
vercel          # responde las preguntas con Enter (defaults)
vercel env add DATABASE_URL production
vercel env add GEMINI_API_KEY production
vercel --prod
```

## Usuarios de prueba

| Usuario  | Contraseña |
|----------|-----------|
| usuario1 … usuario5 | 123 |

Cada usuario ve solo sus propios proyectos, microtareas y racha, y todo persiste en Neon.
Para cambiar de usuario, usa el ícono de salir (arriba a la derecha en la pantalla "Hoy").

## Qué es real y qué es simulado

| Funcionalidad | Estado |
|---|---|
| Login contra tabla `usuarios` en Neon | ✅ Real |
| Proyectos y microtareas por usuario (persisten) | ✅ Real |
| Marcar microtarea completada | ✅ Real |
| Racha (+1 al completar el día, máx. 1 vez/día) | ✅ Real |
| Subir PDF y análisis con Gemini | ✅ Real |
| Foto (se comprime y Gemini la lee con visión) | ✅ Real |
| Audio (se graba con el micrófono y Gemini lo transcribe/analiza) | ✅ Real |
| Fraccionamiento en microtareas por IA | ✅ Real (Gemini genera 2-4 microtareas) |
| Textos de "Backend Django / OCR local" en el loading | 🎭 Narrativa visual (la IA real es Gemini) |
| Si Gemini falla → botón "Continuar manualmente" | 🛟 Fallback con microtareas de texto fijo |

**Límites a tener en cuenta en la demo:**
- Archivos de máximo **4 MB** (las fotos se comprimen solas antes de subir).
- El micrófono requiere HTTPS o localhost (Vercel ya es HTTPS, no hay problema) y
  el navegador pedirá permiso la primera vez.

## Reiniciar los datos entre entrevistas

En el SQL Editor de Neon:

```sql
DELETE FROM proyectos;                                    -- borra proyectos y microtareas
UPDATE usuarios SET racha = 5, racha_actualizada = NULL;  -- reinicia rachas
-- y si quieres, vuelve a correr seed-demo.sql
```
