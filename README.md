# 🎵 Mi Música - Reproductor Kids

Reproductor de música local diseñado para tablet, orientado a niños. Sin videos, sin anuncios, sin recomendaciones. Solo música.

## Inicio rápido

```bash
cd musica-kids
npm install
npm run dev
```

Abrir en la tableta: `http://<ip-de-tu-pc>:5173`

## Agregar canciones

1. Coloca los archivos MP3 en `public/music/`
2. Coloca las carátulas (jpg/png) en `public/covers/` (opcional)
3. Edita `src/data/songs.js` y agrega una entrada:

```js
{
  id: 5,
  title: 'Nombre de la Cancion',
  artist: 'Artista',
  file: 'nombre-del-archivo.mp3',  // nombre exacto del MP3
  cover: '/covers/nombre-foto.jpg', // o null si no tiene carátula
}
```

## Cambiar tema

Hay 4 temas disponibles:
- 🐾 **Sky (Paw Patrol)** - Rosa y celeste
- 🐕 **Bluey** - Azul y celeste
- 🎤 **31 Minutos** - Naranja cálido
- 🏠 **La Casa de Muñecas** - Violeta pastel

Se cambian con los botones en la parte superior.

## Controles

| Botón | Acción |
|-------|--------|
| ▶ / ⏸ | Play / Pausa |
| ⏮ | Canción anterior |
| ⏭ | Siguiente canción |
| 🔀 | Aleatorio (shuffle) |
| 🔁 | Repetir (off → todas → una) |
| 🔊 | Volumen / silenciar |

## Estructura

```
musica-kids/
├── public/
│   ├── music/        ← Aquí van los MP3
│   └── covers/       ← Aquí van las carátulas
├── src/
│   ├── components/   ← React components
│   ├── data/
│   │   └── songs.js  ← Lista de canciones (editar aquí)
│   └── themes/       ← Paletas de colores
└── index.html
```

## Deploy en la tableta

Para usar sin servidor de desarrollo:

```bash
npm run build
```

Los archivos se generan en `dist/`. Copia la carpeta `dist/` a la tableta
y abre `index.html` con un navegador.
