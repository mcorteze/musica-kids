# Agregar Cancion — musica-kids

> Agrega canciones al reproductor desde un archivo MP3.

## Obligatorio

**Ruta del archivo MP3.** Si no se proporciona, no hacer nada.

## Flujo

### 1. Recibir ruta MP3

El usuario da la ruta. Verificar que existe con `Test-Path`. Si no existe, informar y detener.

### 2. Extraer datos del nombre de archivo

Parsear el nombre del archivo para obtener titulo y artista.

Ejemplos:
- `Shakira - Zoo (From Zootopia 2).mp3` → artista: `Shakira`, titulo: `Zoo`
- `paw-patrol-theme.mp3` → titulo: `Paw Patrol Theme`, artista: `Kids Music`
- `yo-nunca-vi-tele.mp3` → titulo: `Yo nunca vi tele`, artista: `31 Minutos`

Reglas:
- Si hay ` - ` separando, lo izquierda es artista, lo derecha es titulo
- Si no hay ` - `, todo el nombre (sin extension) es el titulo, artista queda como `Various`
- Quitar extension `.mp3`
- Reemplazar `_` y `-` por espacios
- Capitalizar primera letra de cada palabra

### 3. Generar nombre limpio del archivo

- Sin espacios, minusculas, guiones entre palabras
- Sin caracteres especiales (tildes → sin tilde, eñes → n)
- Ejemplo: `Shakira - Zoo (From Zootopia 2).mp3` → `shakira-zoo-zootopia2.mp3`

### 4. Mover el MP3

```powershell
Copy-Item "<ruta-usuario>" "C:\Proyectos\musica-kids\public\music\<nombre-limpio>.mp3"
```

No eliminar el original.

### 5. Buscar carátula (automática, SIEMPRE por cuenta propia)

1. Buscar primero en `public/covers/` si existe un archivo que empiece con el mismo nombre base del MP3 original o del nombre limpio. Si existe, usarlo como cover.
2. Si no existe localmente, buscarla uno mismo en internet (WebSearch/WebFetch) usando titulo + artista reales (ej: carátula del álbum/single o imagen oficial del personaje/serie). **Nunca pedirle la carátula al usuario.**
3. Descargar la imagen encontrada a `public/covers/<nombre-limpio>.<ext>` y referenciarla en el paso 6.
4. Si tras buscar no se encuentra ninguna carátula razonable, recién ahí usar `cover: null`.

### 6. Actualizar songs.js

Leer `src/data/songs.js`, encontrar el ultimo `id`, incrementar, agregar entrada antes del `];`:

```js
  {
    id: <siguiente-id>,
    title: '<titulo>',
    artist: '<artista>',
    file: 'music/<nombre-limpio>.mp3',
    cover: 'covers/<nombre-limpio>.<ext>', // o null si no se encontro ninguna
  },
```

**IMPORTANTE**: El campo `file` SIEMPRE debe empezar con `music/` seguido del nombre del archivo. El campo `cover` empieza con `covers/` cuando existe.

### 7. Verificar duplicados — Obligatorio, sin esperar que el usuario lo pida

Antes de la previsualizacion, revisar TODO `songs.js` (no solo las canciones nuevas) en busca de:

1. **Titulo+artista repetido**: dos entradas con el mismo `title` y `artist` (exacto o casi identico). Si aparece, es un error de datos: corregirlo (eliminar duplicado o ajustar titulo/artista si en verdad son dos cosas distintas mal nombradas) antes de seguir.
2. **Titulo compartido por artistas distintos que en realidad es el mismo dato mal puesto**: si dos canciones tienen el mismo `title` mostrando artistas diferentes, revisar si el titulo real y el artista real quedaron invertidos o genericos (ej. "El gato del dia" como titulo cuando el titulo real es el nombre del personaje/segmento y el artista real es la serie). Corregir el nombre, no solo ignorarlo.
3. **Caratulas duplicadas por accidente**: mismo tamaño en bytes es solo una señal, no prueba. Antes de tocar nada, comparar el HASH (MD5) de los archivos con tamaño igual — si el hash tambien coincide, son literalmente el mismo archivo (bug de copiado). Si el hash difiere, son imagenes distintas que coinciden en peso por casualidad: NO tocar.

```powershell
Get-ChildItem "C:\Proyectos\musica-kids\public\covers" | Group-Object Length | Where-Object { $_.Count -gt 1 }
certutil -hashfile "<archivo1>" MD5
certutil -hashfile "<archivo2>" MD5
```

Solo si el MD5 coincide: es un duplicado real → buscar la caratula correcta para la que quedo mal y reemplazarla.
Este chequeo de hash aplica SOLO a las caratulas nuevas agregadas en esta corrida, no a reabrir/tocar caratulas de canciones ya existentes de antes — si se nota algo raro en datos viejos, reportarlo y preguntar, no corregir por cuenta propia.

Si se detecta y corrige algo en este paso, incluirlo en el resumen de la previsualizacion (paso 8) como "Correccion aplicada: ...", no corregirlo en silencio.

### 8. PREVISUALIZACION — Obligatoria antes de desplegar

**ANTES de hacer build/deploy**, mostrar al usuario un resumen y ESPERAR confirmacion:

```
Cancion a agregar:
  Titulo: Zoo
  Artista: Shakira
  Archivo: shakira-zoo-zootopia2.mp3
  Caratula: no

Confirmas? (s/n)
```

Si el usuario dice que no o corrige algo, ajustar y volver a mostrar.
Solo proceder al paso 9 cuando el usuario confirme.

### 9. Build + Commit + Push + Deploy

```powershell
npm run build
npm run deploy
git add -A
git commit -m "feat: add <artista> - <titulo>"
git push
```

### 10. Confirmar

Informar URL: `https://mcorteze.github.io/musica-kids/`

## Reglas

- NUNCA proceder sin ruta de MP3 valida
- NUNCA eliminar el archivo original
- NUNCA saltar la previsualizacion
- NUNCA deploy sin confirmacion del usuario
- Si hay multiples archivos, procesar todos y mostrar resumen completo antes de desplegar
- NUNCA pedirle la caratula al usuario: buscarla siempre uno mismo (local en covers/, si no en internet)
- NUNCA saltar la verificacion de duplicados (titulo+artista, nombres invertidos, caratulas repetidas) ni dejarla para que el usuario la detecte despues
