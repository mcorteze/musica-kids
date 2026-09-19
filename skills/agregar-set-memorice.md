# Agregar Set de Memorice — musica-kids

> Incorpora (o renueva) el set completo de un tema del juego Memorice: 24
> fotos de personajes/objetos + la imagen de fondo del drawer + la imagen
> del dorso de las cartas. A diferencia de agregar-cancion.md, estas
> imagenes NUNCA se buscan en internet: siempre las trae el usuario, y
> SIEMPRE se convierten a AVIF antes de copiarlas (son pesadas de origen).

## Cómo funciona el Memorice (para entender qué se está tocando)

Todo vive en `src/assets/memorice/<tema>/` con esta forma:

```
<tema>/
  ui/
    fondo.avif   -> fondo del drawer completo (paisaje, ideal 16:9)
    back.avif    -> dorso de las cartas boca abajo (cuadrado)
  caras/
    *.avif       -> una foto por personaje/carta, cualquier nombre sirve
```

`src/components/MenuActividades.jsx` detecta todo esto solo via
`import.meta.glob` — nombre e id del tema salen de `TEMAS_META` (arriba del
archivo) cruzado con `src/data/groups.js` (para el nombre a mostrar). Un
tema queda **jugable** recién cuando tiene `fondo.avif` + `back.avif` + al
menos 2 fotos en `caras/`; si falta algo, aparece "Muy pronto" en el
selector solo, sin tocar código. Los tableros van de 4 a 48 cartas
(`NIVELES` en MenuActividades.jsx: 4, 8, 12, 16, 20, 24, 30, 36, 42, 48) y cada
uno pide la mitad de fotos que cartas — **24 fotos distintas destraban el
tablero maximo (48)**; con menos, el tema se tapa solo en el nivel mas alto
que le alcanza (ej. 23 fotos → tope 42, no 48).

## Obligatorio

**Carpeta o rutas de imagenes, con el fondo y el dorso identificados.** Si
falta cualquiera de los tres grupos (caras, fondo, dorso) para completar el
tema, avisar qué falta — no hace falta bloquear si el usuario dice
explicitamente que las manda despues (el tema queda "Muy pronto" mientras
tanto, eso ya lo maneja el codigo solo).

## Flujo

### 1. Recibir las rutas

El usuario da una carpeta (o rutas sueltas) con las fotos de personajes, y
por separado cuál es la de fondo y cuál la de dorso — si no lo aclara,
preguntar cuál es cuál antes de seguir (no asumir por nombre de archivo).
Verificar que todo existe. Revisar tambien si mencionó que es una
actualización de un tema existente ("cambiaron algunas", "renueva") vs uno
nuevo — si no queda claro si hay que **reemplazar** el set anterior o
**sumar** a el, preguntar. Nunca asumir reemplazo (ni suma) en silencio.

### 2. Determinar el tema destino

Leer `TEMAS_META` en `src/components/MenuActividades.jsx`:

- Si el nombre que da el usuario coincide con un tema ya listado
  (`paw-patrol`, `munecas`, `toy-story`, `frozen` hoy), usar ese id.
- Si es un tema nuevo, cada entrada de `TEMAS_META` acepta `grupo` (id de
  `src/data/groups.js`, reusa el `name` de ahi) O `nombre` fijo (texto
  directo, cuando NO hay un grupo de canciones que corresponda de verdad al
  set — ej. Frozen: existe un grupo "Disney" pero es mas generico que el
  set real, asi que a ese tema se le puso `nombre: 'Frozen'` en vez de
  `grupo`). Elegir cual de los dos corresponde: si el set es exactamente el
  mismo personaje/franquicia que un grupo existente, usar `grupo`; si no
  hay un grupo que le quede bien (o el set es mas especifico/distinto),
  usar `nombre` fijo — no crear un grupo nuevo en `groups.js` solo para
  esto (ese archivo es para filtrar canciones, no tiene sentido un grupo
  vacio sin canciones solo para el Memorice). Ante la duda de cual usar,
  preguntar.

### 3. Revisar CADA imagen antes de convertir — obligatorio, no saltar

Mirar una por una (no asumir por el nombre del archivo). Se encontraron
casos reales de fotos que no correspondian al tema (ej. una funda de
tablet infantil mezclada en un set de Toy Story). Ante una imagen dudosa
o claramente ajena al tema:

- Excluirla de la conversion.
- Anotarla en la previsualizacion (paso 7) explicando por qué, y seguir
  con el resto — no bloquear todo el set por una imagen rara.

De paso, para cada imagen dudosa en su nombre (ej. un hash tipo
`d4c1f032...jpg`, o un nombre mal escrito/mal atribuido como
`tiroalblanco.jpg` para lo que en realidad es Bullseye), identificar el
personaje/objeto real por la imagen y usar ESE nombre al convertir. Si no
se tiene certeza de cuál es, dejar el nombre original (limpio) en vez de
inventar uno.

### 4. Duplicados exactos contra lo que ya existe

Si el tema YA tiene fotos (se estan sumando o renovando, no es un tema
nuevo de cero), comparar tamaño en bytes de cada imagen nueva contra las
ya presentes en `<tema>/caras/` — si el original de una nueva coincide en
bytes con un archivo ya convertido antes, es la misma imagen (ya paso por
este flujo una vez): no reconvertir, mencionarlo en la previsualizacion y
seguir con las demas.

### 5. Generar nombres de archivo limpios

- Sin espacios, minusculas, guiones entre palabras (kebab-case)
- Sin caracteres especiales (tildes → sin tilde, eñes → n)
- Descriptivo del personaje/objeto real (ver paso 3) — no conservar un
  nombre críptico o incorrecto
- Extension siempre `.avif` (se convierte todo, ver paso 6)

### 6. Convertir a AVIF (SIEMPRE, sin excepcion)

Con `ffmpeg` (ya deberia estar disponible). Parametros distintos segun el
rol de la imagen:

**Caras** (personajes/objetos, van en `caras/`):
```bash
ffmpeg -y -i "<original>" -vf "scale='min(640,iw)':'min(640,ih)':force_original_aspect_ratio=decrease" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 28 -cpu-used 6 "<tema>/caras/<nombre-limpio>.avif"
```

**Fondo** (paisaje completo, mas grande — va en `ui/fondo.avif`):
```bash
ffmpeg -y -i "<original>" -vf "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 30 -cpu-used 6 "<tema>/ui/fondo.avif"
```

**Dorso** (logo/escudo del tema, cuadrado — va en `ui/back.avif`):
```bash
ffmpeg -y -i "<original>" -vf "scale='min(640,iw)':'min(640,ih)':force_original_aspect_ratio=decrease" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 26 -cpu-used 6 "<tema>/ui/back.avif"
```

`fondo.avif` y `back.avif` tienen que llamarse EXACTAMENTE asi (son los
unicos dos nombres que el codigo busca en `ui/`); los de `caras/` pueden
llamarse como sea.

Si el tema se esta **renovando** (paso 1: reemplazo, no suma), borrar antes
las fotos viejas de `caras/` que quedan reemplazadas por las nuevas.

### 7. Verificar calidad — al menos 2 imagenes al azar

Convertir de vuelta a PNG una o dos de las recien creadas y mirarlas, para
confirmar que la compresion no arruino nada (texto legible, sin banding
raro en fondos con degradé):

```bash
ffmpeg -y -i "<archivo>.avif" -update 1 "<tmp>/check.png"
```

Ver `<tmp>/check.png` con la herramienta de lectura de imagenes. Borrar el
PNG temporal despues.

### 8. Actualizar documentacion de la carpeta

- Si el tema paso de "esperando imagenes" a completo (o de incompleto a
  completo), actualizar `src/assets/memorice/README.txt` (la lista de
  cuales estan listos) y borrar el `README.txt` placeholder que hubiera
  quedado dentro de `<tema>/ui/` o `<tema>/caras/` (ya no aplica, los
  archivos reales lo reemplazan).
- Si quedo incompleto (falta fondo, dorso, o hay menos de 2 caras), dejar
  o crear un `README.txt` ahi explicando exactamente qué falta (mismo
  formato que `toy-story/ui/README.txt` o `munecas/` como referencia).

### 9. PREVISUALIZACION — Obligatoria antes de desplegar

**ANTES de build/commit**, mostrar un resumen y ESPERAR confirmacion:

```
Set de <tema> (<nuevo tema | renovacion | suma a lo existente>):
  24 fotos convertidas a caras/ (~330KB total, antes ~4.2MB)
  fondo.avif (paisaje) — 984KB → 17KB
  back.avif (dorso) — 122KB → 20KB

  Excluida: lilypad.jpg — parece una funda de tablet, no un personaje del tema
  Renombrada: kaboom.jpg → duke-caboom.avif (nombre real del personaje)
  Renombrada: d4c1f0325d16a4c28008d18a1353cc00.jpg → dolly.avif

  Con 24 fotos, el tema alcanza el tablero maximo (48 cartas).
  Tema queda: LISTO PARA JUGAR (antes: "Muy pronto")

Confirmas? (s/n)
```

Si el usuario dice que no o corrige algo (un renombre incorrecto, quiere
la imagen excluida igual, etc.), ajustar y volver a mostrar. Solo proceder
al paso 10 cuando confirme.

### 10. Build + Commit + Push

```powershell
npm run build
git add -A
git commit -m "feat: agrega/renueva el set de <tema> para el Memorice"
git push
```

**No hace falta `npm run deploy`**: `src/assets/` viaja en el repositorio
(no esta en `.gitignore` como `public/music`/`public/covers`), asi que el
workflow automatico de GitHub Actions lo publica solo al pushear a `main`.

### 11. Confirmar

Informar que el push disparo el deploy automatico y dar la URL:
`https://mcorteze.github.io/musica-kids/` (puede tardar 1-2 minutos en
reflejarse). Recordar si el tema quedo listo para jugar o sigue esperando
algo.

## Reglas

- NUNCA proceder sin rutas validas para al menos las caras (fondo/dorso
  pueden faltar temporalmente si el usuario avisa que los manda despues)
- NUNCA buscar o descargar imagenes de internet para esto — son siempre
  del usuario
- NUNCA copiar una imagen sin convertirla a AVIF primero (son pesadas de
  origen — bajarles el peso es parte obligatoria del flujo, no opcional)
- NUNCA incluir una imagen que a simple vista no corresponda al tema sin
  avisarlo en la previsualizacion — mejor excluirla y preguntar que
  meterla en silencio
- NUNCA asumir "reemplaza" vs "suma" cuando no queda claro — preguntar
- NUNCA eliminar los archivos originales del usuario
- NUNCA saltar la previsualizacion ni el commit/push sin confirmacion
- fondo.avif y back.avif SIEMPRE con esos nombres exactos; las caras,
  nombres descriptivos del personaje/objeto real, no cripticos
