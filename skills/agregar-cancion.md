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

### 5. Buscar carátula (opcional, automatica)

Buscar en `public/covers/` si existe un archivo que empiece con el mismo nombre base del MP3 original o del nombre limpio. Si existe, usarlo como cover. Si no, `cover: null`.

### 6. Actualizar songs.js

Leer `src/data/songs.js`, encontrar el ultimo `id`, incrementar, agregar entrada.

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
