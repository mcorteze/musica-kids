# musica-kids — Hub Operativo

Reproductor de musica local para tablet/movil. Sin videos, sin anuncios.
Stack: React + Ant Design + Vite. Deploy: GitHub Pages.

## Skills

| Skill | Archivo | Cuándo activarla |
|-------|---------|-----------------|
| Agregar cancion | skills/agregar-cancion.md | Cuando el usuario quiera agregar una cancion nueva |
| Agregar imagen a galeria | skills/agregar-imagen-galeria.md | Cuando el usuario tenga fotos propias para sumar a una galeria (ej. Paw Patrol) |
| Agregar set de Memorice | skills/agregar-set-memorice.md | Cuando el usuario traiga (o renueve) las fotos de personajes + fondo + dorso de un tema del juego Memorice |
| Agregar rompecabezas | skills/agregar-rompecabezas.md | Cuando el usuario traiga imagenes para un nivel o tema nuevo del Rompecabezas (obliga a preguntar la orientacion: horizontal/cuadrado/vertical) |
| Conversaciones de los juguetes | skills/conversaciones-juguetes.md | Crear, reutilizar o programar mensajes del chat de los juguetes |

## Estructura

```
musica-kids/
├── public/music/       ← MP3s
├── public/covers/      ← Caratulas
├── src/assets/*-gallery/ ← Fotos de galerias (ej. paw-patrol-gallery), SI viajan en git
├── src/assets/memorice/ ← Sets del juego Memorice (por tema), SI viajan en git
├── src/assets/rompecabezas/ ← Una foto por nivel del Rompecabezas (por tema), SI viajan en git
├── src/assets/diferencias/ ← Pares original/modificada de "Encuentra las diferencias" (<tema>/<nivel>/); coordenadas en src/data/diferencias.js (ahi esta el flujo completo)
├── src/data/songs.js   ← Lista de canciones
├── src/themes/         ← Paletas de colores
└── skills/             ← Skills del proyecto
```

## Comandos

- `npm run dev` — Desarrollo local
- `npm run build` — Build de produccion
- `npm run deploy` — Deploy manual a GitHub Pages (respaldo)
- `npm run build && npm run deploy` — Build + Deploy manual

## Deploy

**Automatico:** cada push a `main` dispara `.github/workflows/deploy.yml`, que
buildea y publica en la rama `gh-pages`. Sirve tambien para editar desde el
telefono en github.com. Si el build falla, no se publica nada y la version
online queda como estaba.

**Manual:** `npm run build && npm run deploy` sigue funcionando desde el
computador, apunta a la misma rama.

**Musica y caratulas:** estan en `.gitignore` por pesadas, asi que no viajan
al repositorio y el deploy automatico NO las publica. Solo llegan al sitio con
`npm run deploy` desde el computador. Por eso el workflow usa `keep_files: true`:
sin eso, cada deploy automatico las borraba de `gh-pages` y el sitio quedaba
sin musica. **Al agregar una cancion nueva hay que desplegar desde el
computador**, no basta con pushear.

URL: `https://mcorteze.github.io/musica-kids/`

## Agregar una conversacion desde el telefono

Editar `src/data/conversaciones.json` en github.com, guardar, esperar 1-2
minutos. El contenido esta en JSON justamente para poder tocarlo sin riesgo de
romper el build. Las reglas de tono siguen siendo las de
`skills/conversaciones-juguetes.md`.
