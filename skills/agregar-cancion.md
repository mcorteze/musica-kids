# Agregar Cancion — musica-kids

> Skill para agregar canciones al reproductor. Mueve archivos, actualiza datos, despliega.

## Flujo obligatorio

### 1. Pedir ruta del MP3 (OBLIGATORIO)

**No hacer nada si no se proporciona la ruta del archivo MP3.**

Preguntar al usuario:
- Ruta del archivo MP3 (obligatorio)
- Ruta de carátula/foto jpg/png (opcional)
- URL de YouTube (opcional, para obtener titulo y artista automaticamente)

Si el usuario no da la ruta del MP3, detenerse aqui.

### 2. Verificar que el archivo existe

```powershell
Test-Path -LiteralPath "<ruta-del-usuario>"
```

Si no existe, informar y detenerse.

### 3. Determinar nombre limpio del archivo

El nombre del MP3 debe ser:
- Sin espacios, en minusculas
- Separado por guiones
- Sin caracteres especiales (tildes, eñes, etc.)
- Ejemplo: `Shakira - Zoo (From Zootopia 2).mp3` → `shakira-zoo-zootopia2.mp3`

### 4. Mover el MP3

```powershell
Copy-Item "<ruta-original>" "C:\Proyectos\musica-kids\public\music\<nombre-limpio>.mp3"
```

No eliminar el original (por si el usuario lo necesita).

### 5. Mover carátula (si se proporciono)

Si el usuario dio ruta de carátula, copiar a `public/covers/<nombre-limpio>.jpg` (o la extension que tenga).

### 6. Obtener datos de la cancion

**Si el usuario dio URL de YouTube:**
- Usar `webfetch` para obtener el titulo de la pagina
- El titulo suele estar en el formato: `Artista - Cancion (Details) - YouTube`
- Separar artista y titulo de ese string

**Si NO hay URL de YouTube:**
- Preguntar el titulo de la cancion
- Preguntar el nombre del artista

### 7. Actualizar songs.js

Leer `src/data/songs.js`, encontrar el ultimo `id` usado, incrementar en 1, y agregar la entrada antes del `];`:

```js
  {
    id: <siguiente-id>,
    title: '<titulo>',
    artist: '<artista>',
    file: '<nombre-limpio>.mp3',
    cover: '<nombre-cover>.jpg' o null,
  },
```

### 8. Build + Commit + Push + Deploy

Ejecutar en orden:

```powershell
npm run build
npm run deploy
git add -A
git commit -m "feat: add <artista> - <titulo>"
git push
```

### 9. Confirmar al usuario

Informar:
- Nombre del archivo movido
- Datos que se agregaron
- URL donde vera la cancion: `https://mcorteze.github.io/musica-kids/`

## Reglas que nunca se rompen

- **NUNCA** proceder sin ruta de MP3 valida
- **NUNCA** eliminar el archivo original del usuario
- **NUNCA** usar caracteres especiales en nombres de archivo
- **NUNCA** saltar el build/deploy
- Si hay multiples canciones, repetir el proceso para cada una
