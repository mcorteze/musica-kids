// ============================================
// LISTA DE CANCIONES - EDITAR AQUI
// ============================================
// Para agregar una cancion:
// 1. Coloca el archivo MP3 en public/music/
// 2. Coloca la caratula (jpg/png) en public/covers/ (opcional)
// 3. Agrega una entrada abajo con el formato correcto
//
// El "id" debe ser unico. El "file" es el nombre exacto del MP3.
// Si no tienes caratula, usa null en "cover".
// ============================================

const songs = [
  {
    id: 1,
    title: 'Zoo',
    artist: 'Shakira',
    file: 'music/shakira-zoo-zootopia2.mp3',
    cover: 'covers/shakira-zoo-zootopia2.jpg',
  },
  {
    id: 2,
    title: 'Mi equilibrio espiritual (Freddy Turbina)',
    artist: '31 Minutos',
    file: 'music/31-minutos-mi-equilibrio-espiritual.mp3',
    cover: 'covers/31-minutos-mi-equilibrio-espiritual.jpg',
  },
  {
    id: 3,
    title: 'Yo opino',
    artist: '31 Minutos',
    file: 'music/31-minutos-yo-opino.mp3',
    cover: 'covers/31-minutos-yo-opino.jpg',
  },
  {
    id: 4,
    title: 'Rin Raja (Juan Tástico)',
    artist: '31 Minutos',
    file: 'music/31-minutos-rin-raja.mp3',
    cover: 'covers/31-minutos-rin-raja.jpg',
  },
  {
    id: 5,
    title: 'Ratoncitos',
    artist: '31 Minutos',
    file: 'music/31-minutos-ratoncitos.mp3',
    cover: 'covers/31-minutos-ratoncitos.jpg',
  },
  {
    id: 6,
    title: 'Call Me Maybe',
    artist: 'Carly Rae Jepsen',
    file: 'music/carly-rae-jepsen-call-me-maybe.mp3',
    cover: 'covers/carly-rae-jepsen-call-me-maybe.jpg',
  },
  {
    id: 7,
    title: 'Alto al Fuego',
    artist: 'Guaypes Club',
    file: 'music/guaypes-club-alto-al-fuego.mp3',
    cover: 'covers/guaypes-club-alto-al-fuego.jpg',
  },
  {
    id: 8,
    title: 'Bendiciones',
    artist: 'Guaypes Club',
    file: 'music/guaypes-club-bendiciones.mp3',
    cover: 'covers/guaypes-club-bendiciones.jpg',
  },
  {
    id: 9,
    title: 'Soy Niñita',
    artist: 'Guaypes Club',
    file: 'music/guaypes-club-soy-ninita.mp3',
    cover: 'covers/guaypes-club-soy-ninita.jpg',
  },
  {
    id: 10,
    title: 'Six Seven',
    artist: 'Laurinha Costa',
    file: 'music/laurinha-costa-six-seven.mp3',
    cover: 'covers/laurinha-costa-six-seven.jpg',
  },
  {
    id: 11,
    title: 'Hasta que me enamoro',
    artist: 'María Becerra, TINI, YSY A',
    file: 'music/maria-becerra-tini-ysy-a-hasta-que-me-enamoro.mp3',
    cover: 'covers/maria-becerra-tini-ysy-a-hasta-que-me-enamoro.jpg',
  },
  {
    id: 12,
    title: 'Down Like That (Paw Patrol)',
    artist: 'Bryson Tiller',
    file: 'music/bryson-tiller-down-like-that-paw-patrol.mp3',
    cover: 'covers/bryson-tiller-down-like-that-paw-patrol.jpg',
  },
];

export default songs;
