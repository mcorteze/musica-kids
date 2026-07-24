# Embellecer Tema — musica-kids

> Refina el estilo visual de un tema del reproductor mediante autocritica iterativa,
> usando como referencia la imagen oficial del show en `skills/referencias-estilo/`.

## Obligatorio

**Nombre del tema a embellecer** (key en `src/themes/index.js`: `bluey`, `sky`, `trece` o `munecas`).
Si no se especifica, preguntar cual.

## Principio rector

Esta es una aplicacion para **ninos preescolares**. Todo cambio debe:
- Verse mas hermoso, calido y "de show infantil" — nunca mas adulto, corporativo o minimalista-frio.
- Acercarse a la sensacion visual de la imagen de referencia (paleta, texturas, animo), sin copiar literalmente logos o personajes con copyright.
- **Nunca agregar densidad**: no mas botones, no mas texto, no mas elementos en pantalla. Embellecer = mejor terminacion de lo que ya existe (color, forma, profundidad, brillo, tipografia, curvas, sombras, detalles de borde), no mas cosas.
- Mantener legibilidad y contraste — "hermoso" no puede sacrificar que un nino pueda leer el titulo de la cancion.
- Respetar reglas ya establecidas del proyecto: sin `translateY` en hover, sin checks verdes ni bold tosco, nada de estilos improvisados fuera del sistema de tokens de color cuando aplique.

## Flujo

### 1. Ver la referencia

Leer con la herramienta de lectura de imagenes el archivo correspondiente en `skills/referencias-estilo/`:
- `bluey` → `bluey.png`
- `sky` → `paw-patrol-skye.png`
- `trece` → `31-minutos.png`
- `munecas` → `gabby-dollhouse.png`

Extraer de la imagen: paleta de color exacta (tonos, saturacion, si es pastel o vibrante), texturas o motivos decorativos (brillos, patrones, texturas artesanales, marcos), tipografia/animo general (redondeado y suave vs. gestual y craft vs. brillante y magico), y que "temperatura emocional" transmite.

### 2. Auditar el estado actual

Leer `src/themes/index.js` (el objeto del tema en cuestion) y `src/App.css` (las reglas que usan `--accent-color`, `gradient`, `playerBg`, `cardBg`, `headerStyle`, `buttonPrimary`, `cardStyle`, y cualquier estilo especifico de ese tema). Tambien revisar como se ve aplicado en `album-header`, `player-bar`, `song-row`, `theme-card` — cualquier componente visible que consuma tokens del tema.

Anotar mentalmente (no hace falta escribir archivo aparte) 3-5 puntos donde el tema actual se siente generico o le falta la personalidad de la referencia.

### 3. Loop de autocritica — 10 iteraciones

Repetir 10 veces esta secuencia. Cada iteracion es un ciclo completo de propuesta + critica + decision:

1. **Proponer UN cambio concreto** (color, gradiente, sombra, borde, textura via CSS, radio, glow, decoracion) que acerque el tema a la referencia.
2. **Autocriticar el cambio** contra 3 preguntas:
   - ¿Se ve mas hermoso y mas "showtime infantil", o solo distinto?
   - ¿Agrega densidad visual (mas elementos, mas ruido) o es una terminacion sobre lo que ya existe?
   - ¿Sigue siendo legible y coherente con el resto del sitio (no rompe otros temas ni componentes compartidos)?
3. **Decidir**: aplicar, ajustar, o descartar. Si se aplica, hacerlo en el codigo real (`src/themes/index.js` y/o `src/App.css`) inmediatamente — no acumular cambios en un documento aparte.
4. Avanzar a la siguiente iteracion partiendo del estado ya mejorado (cada iteracion construye sobre la anterior, no repite desde cero).

No hace falta narrar las 10 iteraciones en detalle al usuario; al terminar, resumir en pocas lineas que se cambio y por que, agrupado por tema (color, textura, tipografia, forma), no iteracion por iteracion.

### 4. Verificar en build

```powershell
npm run build
```

Confirmar que compila sin errores antes de mostrar resultado.

### 5. Mostrar resumen y esperar confirmacion

Antes de deploy, resumir los cambios aplicados (agrupados por tipo, no las 10 iteraciones crudas) y esperar confirmacion del usuario. No hacer deploy/commit sin confirmacion explicita, salvo que el usuario ya haya dado luz verde para ese paso en la conversacion.

## Reglas

- NUNCA agregar elementos nuevos al layout (nuevos botones, badges, textos) para "embellecer" — solo refinar terminacion visual de lo existente.
- NUNCA copiar logos, marcas de agua o texto de las imagenes de referencia — son solo guia de paleta/animo, no assets a insertar.
- NUNCA romper el sistema de temas: los cambios deben vivir en el objeto del tema (`src/themes/index.js`) o en reglas CSS que dependan de `var(--accent-color)` / tokens del tema, no en estilos hardcodeados que ignoren el theming.
- NUNCA usar `translateY` en hover ni otros patrones ya prohibidos en el proyecto.
- Si en algun punto el cambio requeriria mas de un tema a la vez (ej. tocar `.song-row` global), evaluar que no rompa la apariencia de los otros 3 temas antes de aplicarlo.
- Al terminar las 10 iteraciones de un tema, preguntar si se continua con el siguiente tema o se cierra ahi.
