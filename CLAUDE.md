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
- `npm run deploy` — Deploy a GitHub Pages
- `npm run build && npm run deploy` — Build + Deploy

## Deploy

El proyecto usa `gh-pages` para desplegar. La URL es:
`https://mcorteze.github.io/musica-kids/`
