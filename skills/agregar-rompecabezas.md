# Agregar Rompecabezas — musica-kids

> Incorpora una imagen nueva (un nivel) o un tema completo al juego
> Rompecabezas. Las imágenes las trae SIEMPRE el usuario (nunca se buscan
> en internet) y SIEMPRE se convierten a AVIF. Lo que distingue esta skill
> de las otras: **hay que preguntar la ORIENTACIÓN de cada rompecabezas**
> (horizontal, cuadrado o vertical) antes de implementarlo.

## Cómo funciona el Rompecabezas (para entender qué se está tocando)

Todo vive en `src/assets/rompecabezas/<tema>/<codigo>.avif` y en
`TEMAS_ROMPECABEZAS_META` (arriba en `src/components/MenuActividades.jsx`):

```js
{
  id: 'toy-story',            // MISMO id que el tema del Memorice (TEMAS_META)
  nombre: 'Toy Story',
  header: 'linear-gradient(...)',
  niveles: [
    { piezas: 12, rompecabezas: [
      { id: 'toy_story_001', orientacion: 'horizontal' },
      { id: 'toy_story_005', orientacion: 'vertical' },
    ] },
    { piezas: 18, rompecabezas: [
      { id: 'toy_story_002', orientacion: 'horizontal' },
    ] },
  ],
}
```

- Un **nivel = una dificultad** (la cantidad de piezas, declarada a mano por
  nivel) y agrupa **uno o varios rompecabezas**, cada uno con una foto
  distinta (no la misma foto cortada más fina). El orden del arreglo
  `niveles` es el orden de dificultad: el primero es el Nivel 1.
- Al empezar un nivel el juego **elige uno de sus rompecabezas al azar**,
  sin repetir el que se acaba de jugar (`elegirAlAzarPendiente`).
- **Para desbloquear el nivel siguiente hay que armar TODOS los rompecabezas
  del nivel** (pedido explícito). Mientras falten, el sorteo solo toma los
  que aún no se armaron; los ya armados se guardan por tema en
  localStorage (`musica-kids-rompecabezas-completados-<tema>`, lista de
  códigos). Consecuencia al agregar: un rompecabezas nuevo en el nivel de
  la frontera de una jugadora agrega una pieza más por armar antes de
  avanzar; en niveles ya desbloqueados no bloquea nada. Agregar uno a un
  nivel existente no cambia la posición de ningún nivel, así que no toca el
  nivel máximo guardado.
- Cada rompecabezas tiene un **código permanente `<tema>_NNN`** (ej.
  `toy_story_001`, `frozen_002`): el id del tema con guion bajo en vez de
  guion, más un número de 3 cifras **correlativo por tema** (no por nivel).
  Sirve para referenciarlo al hablar de él (se ve bajo cada miniatura en la
  página "Todos los rompecabezas"). Ese código es a la vez el `id` del
  rompecabezas y el nombre del archivo. **Nunca se reutiliza ni se
  renumera**, aunque cambie de nivel: si se quita uno, su número queda
  vacío.
- El tablero **mide las proporciones reales de la imagen** para elegir la
  grilla (columnas x filas, entre los divisores de `piezas`) y decide solo
  si el carrousel de piezas va abajo o al lado (calcula las dos
  disposiciones y se queda con la que da la celda más grande).
- `orientacion` es una **clasificación declarada** ('horizontal',
  'cuadrado', 'vertical'). Es una **etiqueta aproximada**: las imágenes de
  una misma orientación no miden lo mismo (una horizontal puede ser 16:9,
  4:3 o 21:9, y una "cuadrada" casi nunca lo es exacta), así que el código
  NUNCA debe asumir una proporción fija a partir de ella. Hoy solo fija el
  tamaño máximo de las miniaturas de la página "Todos los rompecabezas".
- El selector de temas reutiliza la card del Memorice (mismo `id`), así que
  un tema nuevo necesita existir también en `TEMAS_META` del Memorice.

## OBLIGATORIO: preguntar la orientación

**Nunca deducirla ni asumirla en silencio**, aunque parezca obvia. Para cada
imagen nueva:

1. Medir las dimensiones (`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "<archivo>"`).
2. **Proponer** una clasificación según la relación ancho/alto y **pedir
   confirmación**, por ejemplo: "`frozen_3.jpg` mide 1600x900 (1.78), parece
   *horizontal*. ¿Confirmas?".
   - relación > 1.15 → horizontal
   - relación < 0.87 → vertical
   - entre medio → cuadrado
3. Si el usuario trae varias imágenes, listar todas con su propuesta y pedir
   una sola confirmación de la lista completa.

Motivo: la orientación es el dato con el que el usuario piensa cómo se
presenta el rompecabezas y cómo se muestra en el catálogo. Una clasificación
mal puesta no rompe nada (el tablero usa las proporciones reales), solo deja
la miniatura más chica o más grande de lo ideal.

## También preguntar (no se puede deducir)

- **Tema**: ¿es un tema que ya existe o uno nuevo?
- **Nivel** de cada imagen dentro del tema: ¿se suma a un nivel que ya existe
  (queda como una opción más del sorteo) o abre un nivel nuevo? Si abre un
  nivel nuevo: ¿va al final o en medio? Si va en medio, los niveles de
  después se corren y cambia de sentido el progreso guardado en localStorage
  (`musica-kids-rompecabezas-nivel-<tema>`, es un índice de posición):
  avisarlo. Sumar imágenes a un nivel existente no toca el progreso.
- El **código** (`<tema>_NNN`) no se pregunta: es el siguiente número libre del
  tema (el mayor que existe + 1, 3 cifras, sin importar el nivel) y se le
  informa al usuario. Con varias imágenes, se asignan correlativos en el
  orden de nivel y de aparición.
- **Cantidad de piezas** de cada nivel (todos sus rompecabezas comparten la
  misma). Sugerir cantidades con buenos divisores (12, 18, 24, 30...) y evitar
  primos (13 → tablero de 1x13). Para una niña de 5 años, el primer nivel de
  un tema conviene en 12.

## Flujo

### 1. Recibir y revisar

Verificar que las rutas existen y **mirar cada imagen** (no asumir por el
nombre): que corresponda al tema y que no traiga texto, marcas de agua o
logos que se vean raros cortados en piezas. Si una no corresponde, avisar y
excluirla en vez de meterla en silencio.

### 2. Preguntar (orientación, piezas, nivel, tema)

Ver las dos secciones de arriba. No seguir sin esas respuestas.

### 3. Convertir a AVIF (siempre)

```bash
ffmpeg -y -i "<original>" -vf "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 28 -cpu-used 6 "src/assets/rompecabezas/<tema>/<codigo>.avif"
```

(`<tema>` es el id con guion, como la carpeta: `toy-story`; `<codigo>` lleva
guion bajo: `toy_story_004`.)

Verificar la calidad de al menos una: convertirla de vuelta a PNG
(`ffmpeg -y -i "<archivo>.avif" -update 1 "<tmp>/check.png"`), mirarla y borrar
el PNG temporal.

### 4. Registrar en el código

- Tema nuevo: agregar la entrada a `TEMAS_ROMPECABEZAS_META` con `id` igual al
  del Memorice, `nombre` y `header` (copiar el gradiente del Memorice).
- Rompecabezas nuevo en un nivel existente: agregar
  `{ id: '<codigo>', orientacion }` a su arreglo `rompecabezas`.
- Nivel nuevo: agregar `{ piezas, rompecabezas: [{ id: '<codigo>', orientacion }] }`
  al arreglo `niveles`, en orden de dificultad.
- El archivo debe llamarse exactamente como el `id` (sin extensión).
- No hay que tocar nada más: el selector, la página "Todos los rompecabezas"
  (tabs por tema, un bloque por nivel con todas sus miniaturas y códigos) y
  el juego (sorteo dentro del nivel) los toman solos.

### 5. Verificar

`npx vite build` y `npx oxlint src/components/MenuActividades.jsx`. No se
levanta ningún servidor de desarrollo salvo que el usuario lo pida.

### 6. Previsualización

Antes de comitear, mostrar un resumen y esperar confirmación:

```
Rompecabezas de <tema>:
  toy_story_003.avif — 1600x900 (horizontal) — 24 piezas — 55KB (antes 900KB)
  Grilla resultante: la elige el tablero según la proporción real.
```

### 7. Commit y push

**Solo si el usuario lo ordena explícitamente** ("comitea y pushea"). Aprobar
la previsualización no autoriza el commit. `src/assets/` viaja en el
repositorio, así que el push dispara el deploy automático.

## Reglas

- NUNCA asumir la orientación: preguntarla siempre (proponiendo la medida).
- NUNCA reciclar fotos de personajes del Memorice: los rompecabezas llevan
  imágenes pensadas para ese propósito (pedido explícito).
- NUNCA copiar una imagen sin convertirla a AVIF.
- NUNCA buscar imágenes en internet.
- NUNCA eliminar los archivos originales del usuario.
- Todo texto en español neutro (tuteo), sin voseo ni "acá".
