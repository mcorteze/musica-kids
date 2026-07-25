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
    id: 12,
    title: 'Down Like That (Paw Patrol)',
    artist: 'Bryson Tiller',
    file: 'music/bryson-tiller-down-like-that-paw-patrol.mp3',
    cover: 'covers/bryson-tiller-down-like-that-paw-patrol.jpg',
  },
  {
    id: 13,
    title: 'Dance Mode',
    artist: 'Bluey',
    file: 'music/bluey-dance-mode.mp3',
    cover: 'covers/bluey-dance-mode.jpg',
  },
  {
    id: 14,
    title: 'DJ Musicat',
    artist: 'Gabby Dollhouse',
    file: 'music/dj-musicat-el-gato-del-dia.mp3',
    cover: 'covers/dj-musicat-el-gato-del-dia.png',
  },
  {
    id: 15,
    title: "Everest is the Best (Skye's Music Party)",
    artist: 'PAW Patrol',
    file: 'music/paw-patrol-everest-is-the-best.mp3',
    cover: 'covers/paw-patrol-everest-is-the-best.jpg',
  },
  {
    id: 16,
    title: 'Gabriela',
    artist: 'KATSEYE',
    file: 'music/katseye-gabriela.mp3',
    cover: 'covers/katseye-gabriela.jpg',
  },
  {
    id: 17,
    title: 'Golden',
    artist: 'KPop Demon Hunters',
    file: 'music/golden-kpop-demon-hunters.mp3',
    cover: 'covers/golden-kpop-demon-hunters.jpg',
  },
  {
    id: 18,
    title: 'Pollypocket',
    artist: 'Martinwhite & Katteyes',
    file: 'music/martinwhite-katteyes-pollypocket.mp3',
    cover: 'covers/martinwhite-katteyes-pollypocket.jpg',
  },
  {
    id: 19,
    title: 'Pastelillo',
    artist: 'Gabby Dollhouse',
    file: 'music/pastelillo-el-gato-del-dia.mp3',
    cover: 'covers/pastelillo-el-gato-del-dia.jpg',
  },
  {
    id: 20,
    title: 'Dai Dai',
    artist: 'Shakira, Burna Boy',
    file: 'music/shakira-burna-boy-dai-dai.mp3',
    cover: 'covers/shakira-burna-boy-dai-dai.jpg',
  },
  {
    id: 21,
    title: 'Tropicoqueta',
    artist: 'KAROL G',
    file: 'music/karol-g-tropicoqueta.mp3',
    cover: 'covers/karol-g-tropicoqueta.jpg',
  },
  {
    id: 22,
    title: 'ALO',
    artist: 'Katteyes, SINAKA',
    file: 'music/katteyes-sinaka-alo.mp3',
    cover: 'covers/katteyes-sinaka-alo.jpg',
  },
  {
    id: 23,
    title: 'Otono Los mas congelados del genero',
    artist: 'NTV',
    file: 'music/otono-los-mas-congelados-del-genero.mp3',
    cover: 'covers/otono-los-mas-congelados-del-genero.png',
  },
  {
    id: 24,
    title: 'Osito Gominola',
    artist: 'Gummibär',
    file: 'music/gummibar-osito-gominola.mp3',
    cover: 'covers/gummibar-osito-gominola.jpg',
  },
];

export default songs;
