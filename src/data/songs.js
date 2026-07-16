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
    cover: null,
  },
];

export default songs;
