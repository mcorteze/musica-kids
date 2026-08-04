# musica-kids — Hub Operativo

Reproductor de musica local para tablet/movil. Sin videos, sin anuncios.
Stack: React + Ant Design + Vite. Deploy: GitHub Pages.

## Skills

| Skill | Archivo | Cuándo activarla |
|-------|---------|-----------------|
| Agregar cancion | skills/agregar-cancion.md | Cuando el usuario quiera agregar una cancion nueva |
| Conversaciones de los juguetes | skills/conversaciones-juguetes.md | Crear, reutilizar o programar mensajes del chat de los juguetes |

## Estructura

```
musica-kids/
├── public/music/       ← MP3s
├── public/covers/      ← Caratulas
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

URL: `https://mcorteze.github.io/musica-kids/`

## Agregar una conversacion desde el telefono

Editar `src/data/conversaciones.json` en github.com, guardar, esperar 1-2
minutos. El contenido esta en JSON justamente para poder tocarlo sin riesgo de
romper el build. Las reglas de tono siguen siendo las de
`skills/conversaciones-juguetes.md`.
