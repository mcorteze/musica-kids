# Agregar lámina de Pintar por números — musica-kids

> **2026-10-21: el juego OFICIAL "Pintar por números" es el de cuadrícula
> (interno "pixel", sección más abajo). Lo que sigue hasta esa sección es el
> juego viejo de niveles, hoy "Pintar por números (descontinuado)", visible
> solo en modo desarrollador. Láminas nuevas van al oficial.**
>
> Incorpora imágenes nuevas al juego Pintar por números. Las imágenes las
> trae SIEMPRE el usuario (nunca se buscan en internet) y se convierten a
> AVIF. Lo que distingue esta skill: **no hay nada que anotar**. La
> cuadrícula numerada se arma sola en el navegador; solo hay que dejar el
> archivo en la carpeta del nivel correcto.

## Cómo funciona el juego (para entender qué se está tocando)

- Archivos: `src/assets/pintar/<tema>/nivel-<n>/<nombre>.avif`.
  `<tema>` = MISMO id que el tema del Memorice (`TEMAS_META`); un tema que
  no está ahí no aparece.
- Niveles (`NIVELES_PINTAR` en `src/components/MenuActividades.jsx`):

  | Nivel | Celdas del lado largo | Tope de colores |
  |-------|----------------------|-----------------|
  | 1 | 14 | 6 |
  | 2 | 20 | 8 |
  | 3 | 28 | 10 |
  | 4 | 36 | 12 |
  | 5 | 44 | 14 |

  (Afinados dos veces el 2026-10-19 a pedido: 10/14/18/24 → 12/18/24/32 →
  14/20/28/36.) La imagen original se ve tenue (opacidad 0.3) detrás de
  las celdas sin pintar (`.pintar-fondo`); revelar la imagen real al pintar
  fue DESCARTADO por el usuario.

  El lado corto sale de la proporción de la imagen. Un nivel sin láminas no
  aparece; un tema sin láminas no aparece en el selector.
- `src/utils/pintarNumeros.js` convierte la imagen: reduce a la cuadrícula,
  agrupa colores (k-means, determinista) y a cada celda le da el color que
  más se repite en ella. Los números van de más a menos celdas (01 = el que
  más ocupa). Las partes transparentes quedan vacías (sin número).
- Se pinta en orden obligado 01 → 02 → 03; tocar o arrastrar el dedo.
- Igual que Rompecabezas/Diferencias: se sortea una lámina del nivel y para
  desbloquear el siguiente hay que terminar todas. Progreso en localStorage
  (`musica-kids-pintar-nivel-<tema>`, `musica-kids-pintar-completados-<tema>`).
  El id de una lámina es `nivel-<n>/<nombre>`: **moverla de nivel o
  renombrarla la cuenta como nueva**.

## Qué imagen sirve (verificado con pruebas, 2026-10-19)

- **Sirven:** dibujos planos, pocos colores, formas grandes y sin
  degradados. Idealmente con **fondo transparente**: el fondo queda vacío y
  la niña pinta solo el personaje.
- **Ejemplo que funcionó:** `moana/nivel-4/moana-y-pua.avif` (chibi de
  trazo simple, colores planos). Búsquedas útiles: "<personaje> chibi png",
  "<personaje> perler beads pattern", "<personaje> pixel art".
- **No sirven:** fotos o renders 3D (la Skye del menú quedó como una mancha
  de beiges apagados). Los degradados se vuelven bandas sucias.
- **Se pierde todo detalle más delgado que una celda** (un tallo fino, ojos
  chicos, contornos finos). A 10 celdas de lado, una celda ocupa el 10% del
  ancho de la imagen.
- Con fondo blanco (no transparente), el blanco suele ser el 01 y ocupar la
  mitad de las celdas: es lo primero y lo más largo de pintar. Avisar al
  usuario si trae imágenes así.

## Juego OFICIAL "Pintar por números" (interno "Pintar pixel art") — 2026-10-21

Nació el 2026-10-20 como juego experimental aparte. El 2026-10-21 el usuario
decidió: este es el oficial, publicado para todos con el nombre "Pintar por
números"; el de niveles pasa a "Pintar por números (descontinuado)", solo en
modo desarrollador. En código sigue llamándose "pixel" (`vista === 'pixel'`,
`src/assets/pintar-pixel/`, `PintarPixelDev`, `utils/pintarPixel.js`).

En el juego nuevo la CUADRÍCULA MANDA: no hay niveles ni tamaños distintos.
Flujo (exactamente este, pedido del usuario):

1. El usuario pasa una imagen (pixel art o patrón con cuadrícula) → RECORTAR
   los márgenes muertos (fondo vacío, numeración, leyenda de colores, marcas
   de agua) y guardarla en `src/assets/pintar-pixel/<tema>/originales/<nombre>.avif`
   (`-crf 22 -pix_fmt yuv444p`: admite lados impares).
   Recorte: `py -I -X utf8 herramientas/recortar_margenes.py <carpeta con subcarpetas
   por tema> <salida> [ajustes.json]` → detecta fondo y color de línea, borra
   la cuadrícula/aros de beads (apertura morfológica) y descarta franjas
   separadas; genera hojas `hoja-<tema>.png` con la caja propuesta. REVISAR
   cada hoja: falla con marcos gruesos, líneas mayores cada 10 cuadros y
   fotos; ahí recorte manual. Íconos encima de la imagen (lupa de Google
   Lens, flechas) se tapan con el color de fondo. Collages (varias figuras)
   se dividen en una lámina por figura. Duplicados (mismo md5) se omiten.
   Tema NUEVO (sin set de Memorice): agregarlo a `TEMAS_PIXEL_PROPIOS`
   (MenuActividades.jsx) y crear `pintar-pixel/<tema>/portada.avif`
   (512×512). NUNCA usar una imagen del juego (original ni lámina) como
   portada (pedido explícito 2026-10-20): buscar en internet el LOGO del tema
   (Wikimedia Commons, 1000logos…) o, si el tema no tiene logo (Halloween,
   Unicornios), una ilustración limpia (emoji Noto de Google). Logo centrado
   sobre un degradado suave del tema; AVIF crf 26. Script de composición:
   scratchpad de la sesión 2026-10-20 (armar.py), reconstruirlo si hace falta.
   Los temas del Memorice usan su dorso como card.
2. El usuario abre el juego → "Modo desarrollador" → "Establecer cuadrícula"
   (PintarPixelDev + PintarCuadriculaEditor): marca esquinas + columnas/filas,
   ajusta, ve la vista previa (mismo cálculo que el script), Guardar →
   "Copiar" (los borradores y descartes se limpian al copiar). Tabs "En
   preparación" (originales sin lámina) / "Procesados" (muestra la lámina
   recreada); ambos con casilla "Descartar".
3. El usuario pega el texto → anotarlo en `src/data/pintarCuadriculas.js`
   (registro; clave `<tema>/<nombre>`, valores sobre el ORIGINAL). Si trae un
   bloque "Descartar en Pintar pixel art", borrar esos originales, su lámina
   en `laminas/` si la tiene y su entrada en pintarCuadriculas.js si la hubiera.
   Si trae una cuadrícula para una lámina YA creada, se recrea encima.
   Si trae un bloque "Limpiar en Pintar pixel art" (casilla "Requiere
   limpieza" de Procesados): revisar esa lámina contra su original y quitar
   líneas o manchas raras (cuadros sueltos de un color que no corresponde,
   filas corridas); mostrar antes/después y regrabarla sin pérdida.
4. RECREAR la lámina desde cero con esa cuadrícula:
   `py herramientas/pintar_desde_cuadricula.py <original> <salida.png> --x .. --y .. --ancho .. --alto .. --columnas .. --filas .. --vista v.png`
   → (2026-10-20) ajusta cada línea interior de la cuadrícula a la línea real
   más cercana (hasta ¼ de cuadro), toma el color DOMINANTE del centro de cada
   celda (líneas claras/oscuras y agujeros de beads no ganan), consolida los
   parecidos (Lab ΔE 12, sube hasta dejar MÁXIMO 15 colores), 1 pixel = 1 celda.
   utils/pintarPixel.js (vista previa) hace EXACTAMENTE lo mismo: si se cambia
   uno, cambiar el otro (redondeo .5 hacia arriba en ambos) y comprobar 0
   celdas distintas con los mismos pixeles.
   Mostrar al usuario original vs. lámina lado a lado.
5. Guardar SIN pérdida en `src/assets/pintar-pixel/<tema>/laminas/<nombre>.avif`:
   `ffmpeg -i salida.png -c:v libaom-av1 -still-picture 1 -aom-params lossless=1 -pix_fmt gbrp <destino>`
   y verificar decodificando (0 pixeles distintos). El juego la lee con
   `laminaDePixelArt` (utils/pintarPixel.js): colores exactos, sin fusionar.

Juego: tema (dorso del Memorice / portada) → parte DIRECTO con una lámina al
azar entre las pendientes (como los demás juegos: nunca una lista que muestre
la figura antes de pintarla; pedido explícito 2026-10-21) → se pinta con
PintarJuego (`calcular`, `nitida`) → victoria "Te faltan N" + "Otra lámina"
(sortea entre las que faltan; con todas terminadas, entre todas). Tamaño
ideal: 20–45 cuadros por lado.

## Modo desarrollador (PintarDev.jsx)

Botón "Modo desarrollador" en el selector de temas del juego (solo laptop).
Muestra cada imagen: la original + cómo queda pintada entera en cada
nivel (mismo cálculo del juego), con cuadrícula, colores, celdas y cuánto
ocupa el 01. Tabs "En preparación" (carpeta `por-asignar/`) / "Procesados"
(carpetas `nivel-<n>`, con su nivel marcado). Es para que el usuario decida
el nivel mirando, no adivinando.

## Pasos

1. Pedir al usuario el tema si no lo dijo (el nivel NO se pregunta todavía).
   Si la imagen no encaja en "Qué imagen sirve", avisarlo una vez.
2. Convertir a AVIF conservando la transparencia (ffmpeg está instalado):
   `ffmpeg -i entrada.png -c:v libaom-av1 -still-picture 1 -crf 28 salida.avif`.
3. Copiar a `src/assets/pintar/<tema>/por-asignar/`, nombre en minúsculas y
   guiones.
4. `npm run build`. El usuario marca en el Modo desarrollador un checkbox
   por imagen (un nivel o Descartar) y pega el texto de "Copiar":

   ```
   Propuesta de Pintar por números (src/assets/pintar/):
   Moana (moana)
     Nivel 3: por-asignar/maui, por-asignar/moana
     Descartar: por-asignar/moana-bebe
   ```

   - `Nivel N: <carpeta>/<nombre>` → mover `src/assets/pintar/<tema>/<carpeta>/<nombre>.avif`
     a `<tema>/nivel-N/`. Si dice "(estaba en nivel M)", viene de `nivel-M/`.
   - `Descartar` → borrar el archivo (grep del nombre en todo el proyecto).
   - Carpetas que queden vacías se borran. `npm run build`.
   - La propuesta queda guardada en el navegador del usuario: los ya movidos
     dejan de contar solos (salen del tab o ya están en su nivel); avisarle
     que puede usar "Vaciar".

## Lo que NO hago

- No toco la página de música ni otros juegos.
- No uso las imágenes de Rompecabezas o Memorice para este juego sin que el
  usuario lo pida.
- No cambio `NIVELES_PINTAR` (tamaños/colores) sin aprobación: cambia todas
  las láminas ya cargadas.
