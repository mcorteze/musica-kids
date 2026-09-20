# Agregar Rompecabezas — musica-kids

> Incorpora una imagen nueva (un nivel) o un tema completo al juego
> Rompecabezas. Las imágenes las trae SIEMPRE el usuario (nunca se buscan
> en internet) y SIEMPRE se convierten a AVIF. Lo que distingue esta skill
> de las otras: **hay que preguntar la ORIENTACIÓN de cada rompecabezas**
> (horizontal, cuadrado o vertical) antes de implementarlo.

## Cómo funciona el Rompecabezas (para entender qué se está tocando)

Todo vive en `src/assets/rompecabezas/<tema>/nivel-N.avif` y en
`TEMAS_ROMPECABEZAS_META` (arriba en `src/components/MenuActividades.jsx`):

```js
{
  id: 'toy-story',            // MISMO id que el tema del Memorice (TEMAS_META)
  nombre: 'Toy Story',
  header: 'linear-gradient(...)',
  niveles: [
    { piezas: 12, archivo: 'nivel-1', orientacion: 'horizontal' },
    { piezas: 18, archivo: 'nivel-2', orientacion: 'horizontal' },
  ],
}
```

- Cada **nivel = una foto distinta** (no la misma foto cortada más fina).
  El orden del arreglo `niveles` es el orden de dificultad: el primero es
  el Nivel 1. La cantidad de piezas se declara a mano por nivel.
- El tablero **mide las proporciones reales de la imagen** para elegir la
  grilla (columnas x filas, entre los divisores de `piezas`) y decide solo
  si el carrousel de piezas va abajo o al lado (calcula las dos
  disposiciones y se queda con la que da la celda más grande).
- `orientacion` es una **clasificación declarada** ('horizontal',
  'cuadrado', 'vertical'). Hoy la usa la página "Todos los rompecabezas"
  para la forma de las miniaturas y queda como dato del nivel.
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

Motivo: la orientación condiciona cómo se presenta el rompecabezas (aprovechar
el espacio) y cómo se muestra en el catálogo; una clasificación mal puesta se
nota como miniaturas con franjas vacías a los lados.

## También preguntar (no se puede deducir)

- **Tema**: ¿es un tema que ya existe o uno nuevo?
- **Número de nivel** (posición dentro del tema): ¿va al final o en medio?
  Si va en medio hay que renumerar, y el progreso guardado en localStorage
  (`musica-kids-rompecabezas-nivel-<tema>`, es un índice) cambia de sentido:
  avisarlo.
- **Cantidad de piezas** de cada nivel. Sugerir cantidades con buenos
  divisores (12, 18, 24, 30...) y evitar primos (13 → tablero de 1x13). Para
  una niña de 5 años, el primer nivel de un tema conviene en 12.

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
ffmpeg -y -i "<original>" -vf "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 28 -cpu-used 6 "src/assets/rompecabezas/<tema>/nivel-N.avif"
```

Verificar la calidad de al menos una: convertirla de vuelta a PNG
(`ffmpeg -y -i "<archivo>.avif" -update 1 "<tmp>/check.png"`), mirarla y borrar
el PNG temporal.

### 4. Registrar en el código

- Tema nuevo: agregar la entrada a `TEMAS_ROMPECABEZAS_META` con `id` igual al
  del Memorice, `nombre` y `header` (copiar el gradiente del Memorice).
- Nivel: agregar `{ piezas, archivo: 'nivel-N', orientacion }` al arreglo
  `niveles`, en orden de dificultad. El archivo debe llamarse exactamente
  como `archivo` (sin extensión).
- No hay que tocar nada más: el selector, la página "Todos los rompecabezas"
  (tabs por tema, subtítulo por nivel) y el juego los toman solos.

### 5. Verificar

`npx vite build` y `npx oxlint src/components/MenuActividades.jsx`. No se
levanta ningún servidor de desarrollo salvo que el usuario lo pida.

### 6. Previsualización

Antes de comitear, mostrar un resumen y esperar confirmación:

```
Rompecabezas de <tema>:
  nivel-3.avif — 1600x900 (horizontal) — 24 piezas — 55KB (antes 900KB)
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
