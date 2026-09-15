# Agregar Imagen a Galeria — musica-kids

> Incorpora fotos propias del usuario a una galeria del proyecto (por ahora,
> la de Paw Patrol). A diferencia de agregar-cancion.md, estas imagenes NUNCA
> se buscan en internet: siempre las trae el usuario.

## Obligatorio

**Ruta(s) de imagen.** Si no se proporciona ninguna, no hacer nada.

## Flujo

### 1. Recibir ruta(s) de imagen

El usuario da una o varias rutas (o una carpeta con varias imagenes adentro).
Verificar que cada una existe con `Test-Path`. Si alguna no existe, informar
cual y detener (no seguir con las demas hasta que el usuario corrija).

### 2. Determinar la galeria destino

Buscar carpetas `src/assets/*-gallery/` existentes:

- Si hay una sola (hoy: `src/assets/paw-patrol-gallery/`), usar esa.
- Si hay mas de una, preguntar al usuario cual.
- Si no hay ninguna, preguntar si hay que crear una nueva y con que nombre
  (`<algo>-gallery`), no asumir.

### 3. Generar nombre de archivo limpio

Mismo criterio que agregar-cancion.md:

- Sin espacios, minusculas, guiones entre palabras
- Sin caracteres especiales (tildes → sin tilde, eñes → n)
- Conservar la extension original (png/jpg/jpeg/webp/avif)

### 4. Numerar para mantener el orden

La galeria se ve en orden alfabetico de nombre de archivo (ver el README.txt
de la carpeta destino). Para que las fotos nuevas queden ordenadas:

1. Revisar los archivos que ya existen en la carpeta destino y detectar el
   prefijo numerico mas alto usado (ej. si hay `01-marshall.jpg` y
   `02-chase.jpg`, el siguiente es `03`).
2. Si el usuario no pidio un orden puntual, numerar las imagenes nuevas
   correlativamente a partir de ahi, en el orden en que las dio.
3. Si el usuario SI pidio un orden especifico, respetarlo en vez del orden
   de llegada.

Nombre final: `<numero>-<nombre-limpio>.<ext>` (ej. `03-everest.jpg`).

### 5. Copiar los archivos

```powershell
Copy-Item "<ruta-usuario>" "C:\Proyectos\musica-kids\src\assets\<galeria>\<nombre-final>"
```

No eliminar los originales.

### 6. Chequeo de uniformidad — informativo, no bloqueante

El README.txt de la galeria pide proporciones parecidas entre fotos (para que
se vea prolija). Antes de la previsualizacion, comparar el ancho/alto de cada
imagen nueva contra las que ya existen en esa carpeta:

```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("<ruta>")
$w = $img.Width; $h = $img.Height; $img.Dispose()
```

Si la proporcion (ancho/alto) de una imagen nueva difiere en mas de ~30% del
promedio de las que ya estan, anotarlo como aviso en la previsualizacion (paso
7) — no es un error, solo una sugerencia. No recortar ni redimensionar nada
por cuenta propia.

### 7. PREVISUALIZACION — Obligatoria antes de desplegar

**ANTES de hacer build/commit**, mostrar un resumen y ESPERAR confirmacion:

```
Imagenes a agregar a src/assets/paw-patrol-gallery/:
  01-marshall.jpg  (800x800)
  02-chase.jpg     (800x600)  ⚠ proporcion distinta a las demas

Confirmas? (s/n)
```

Si el usuario dice que no o corrige algo, ajustar y volver a mostrar. Solo
proceder al paso 8 cuando confirme.

### 8. Build + Commit + Push

```powershell
npm run build
git add -A
git commit -m "feat: agrega fotos a la galeria de <grupo>"
git push
```

**No hace falta `npm run deploy`**: a diferencia de `public/covers/` y
`public/music/` (gitignorados, solo se publican con deploy manual desde el
computador — ver CLAUDE.md), `src/assets/` SI viaja en el repositorio, asi
que el workflow automatico de GitHub Actions la publica sola al pushear a
`main`.

### 9. Confirmar

Informar que el push disparo el deploy automatico y dar la URL:
`https://mcorteze.github.io/musica-kids/` (puede tardar 1-2 minutos en
reflejarse).

## Reglas

- NUNCA proceder sin al menos una ruta de imagen valida
- NUNCA buscar o descargar imagenes de internet para esto — son fotos
  propias del usuario, siempre las trae el
- NUNCA eliminar los archivos originales
- NUNCA saltar la previsualizacion
- NUNCA commitear/pushear sin confirmacion del usuario
- Si hay multiples imagenes, procesar todas y mostrar el resumen completo
  antes de desplegar
