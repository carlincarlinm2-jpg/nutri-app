# Nutri — app de nutrición y fitness con IA

## Qué cambió respecto a la versión anterior
- **Cuentas y datos en la nube (Supabase)**: antes todo vivía en el navegador del teléfono
  (`localStorage`), lo que causaba que los datos "se perdieran" o la sesión se reiniciara.
  Ahora hay una cuenta real, sincronizada, con respaldo local para cuando no hay internet.
- **Reconocimiento de fotos por API (no más modelos pesados en el teléfono)**: antes se
  descargaban 3 modelos de IA al celular, lo que tardaba mucho y podía saturar la memoria y
  reiniciar la app. Ahora una función en el servidor le manda la foto a Claude y regresa el
  resultado en segundos, sin usar la memoria del teléfono.
- **Nuevo: recetas, plan de alimentación semanal, rutinas de ejercicio y análisis de
  progreso, generados por IA** (Claude), disponibles desde la pantalla principal.
- **Instalable como app (PWA)**: se puede "Agregar a pantalla de inicio" en iPhone/Android.

## Antes de desplegar

### 1. Base de datos (Supabase) — ya está creada
El proyecto de Supabase ya existe. Solo falta correr el esquema una vez:
1. Entra a tu proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. Abre `supabase/schema.sql` de esta carpeta, copia todo su contenido y pégalo ahí.
3. Dale **Run**. Esto crea la tabla de datos y las reglas de seguridad.
4. (Opcional pero recomendado para pruebas rápidas) En **Authentication → Providers → Email**,
   si quieres que las cuentas nuevas no requieran confirmar el correo mientras pruebas,
   desactiva "Confirm email". Para producción, mejor dejarlo activado.

### 2. API key de Anthropic (Claude)
Ya tienes tu cuenta y saldo en [console.anthropic.com](https://console.anthropic.com).
Genera una API key en **API Keys → Create Key** y guárdala — la necesitas en el paso de Vercel.

## Desplegar en Vercel (gratis)

1. Sube esta carpeta a un repositorio de GitHub (ver sección de abajo si no sabes cómo).
2. Entra a [vercel.com](https://vercel.com), inicia sesión con GitHub.
3. **Add New → Project**, elige tu repositorio.
4. En **Environment Variables**, agrega:
   - `ANTHROPIC_API_KEY` = tu API key de Anthropic (la que generaste arriba).
5. Deploy. Vercel te da una URL tipo `https://tu-proyecto.vercel.app`.

No hace falta configurar nada más — Vercel detecta automáticamente los archivos en `/api`
como funciones de servidor y el resto (`index.html`, `manifest.json`, etc.) como sitio estático.

## Subir el código a GitHub

```bash
cd nutri-app
git init
git add .
git commit -m "Nutri: cuenta en la nube, reconocimiento por API, recetas/planes/rutinas con IA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Instalar la app en el teléfono (PWA)

Una vez desplegada la URL de Vercel:
- **iPhone (Safari)**: abre la URL → botón de compartir (cuadro con flecha) → "Agregar a
  pantalla de inicio".
- **Android (Chrome)**: abre la URL → menú (⋮) → "Instalar app" o "Agregar a pantalla de inicio".

Después de eso, el ícono queda en la pantalla como cualquier app, a pantalla completa.

## Estructura del proyecto

```
index.html              La app completa (frontend)
manifest.json, sw.js     Configuración de PWA (instalable, funciona offline para la interfaz)
assets/broccoli.png      Mascota de Nutri
icons/                   Íconos de la app en distintos tamaños
supabase/schema.sql      Esquema de base de datos para correr en Supabase
api/                     Funciones de servidor (Vercel) que hablan con la API de Claude:
  _anthropic.js            helper compartido (llama a la API, no expone la key al navegador)
  scan-food.js             reconocimiento de comida por foto (Haiku)
  generate-recipe.js       recetas según ingredientes disponibles (Sonnet)
  generate-meal-plan.js    plan de alimentación semanal (Sonnet)
  generate-routine.js      rutina de ejercicio (Sonnet)
  analyze-progress.js      retroalimentación sobre el progreso (Sonnet)
```

## Costo estimado de uso (con la cuenta de Anthropic)
Con uso personal/familiar típico (varios escaneos de comida al día, alguna receta, un plan
semanal y una rutina ocasional), el gasto de la API ronda **$1-3 USD al mes**. Supabase y
Vercel son gratis en este nivel de uso.

## Pendiente para una siguiente vuelta
- Migrar datos de prueba anteriores (no aplica: se decidió empezar limpio).
- Pulido visual: animaciones del mascote y micro-interacciones (planeado, no incluido en
  esta entrega).
