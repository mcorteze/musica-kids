// ============================================
// LISTA DE CANCIONES - EDITAR AQUÍ
// ============================================
// Para agregar una canción:
// 1. Coloca el archivo MP3 en public/music/
// 2. Coloca la carátula (jpg/png) en public/covers/ (opcional)
// 3. Agrega una entrada abajo con el formato correcto
//
// El "id" debe ser único. El "file" es el nombre exacto del MP3.
// Si no tienes carátula, usa null en "cover".
// ============================================

const songs = [
  {
    id: 1,
    title: 'Tema de Paw Patrol',
    artist: 'Paw Patrol',
    file: 'paw-patrol-theme.mp3',
    cover: '/covers/paw-patrol.jpg',
  },
  {
    id: 2,
    title: 'Theme Song Bluey',
    artist: 'Bluey',
    file: 'bluey-theme.mp3',
    cover: '/covers/bluey.jpg',
  },
  {
    id: 3,
    title: 'Yo nunca vi tele',
    artist: '31 Minutos',
    file: 'yo-nunca-vi-tele.mp3',
    cover: '/covers/31minutos.jpg',
  },
  {
    id: 4,
    title: 'Cancion de Cielo',
    artist: 'Paw Patrol',
    file: 'sky-song.mp3',
    cover: null,
  },
  {
    id: 5,
    title: 'Zoo',
    artist: 'Shakira',
    file: 'shakira-zoo-zootopia2.mp3',
    cover: null,
  },
];

export default songs;
