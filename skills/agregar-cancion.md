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

### 7. PREVISUALIZACION — Obligatoria antes de desplegar

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
Solo proceder al paso 8 cuando el usuario confirme.

### 8. Build + Commit + Push + Deploy

```powershell
npm run build
npm run deploy
git add -A
git commit -m "feat: add <artista> - <titulo>"
git push
```

### 9. Confirmar

Informar URL: `https://mcorteze.github.io/musica-kids/`

## Reglas

- NUNCA proceder sin ruta de MP3 valida
- NUNCA eliminar el archivo original
- NUNCA saltar la previsualizacion
- NUNCA deploy sin confirmacion del usuario
- Si hay multiples archivos, procesar todos y mostrar resumen completo antes de desplegar
- NUNCA pedirle la caratula al usuario: buscarla siempre uno mismo (local en covers/, si no en internet)
