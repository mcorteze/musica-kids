// Juego "Pintar pixel art" (experimental): cuadrículas que el usuario
// estableció sobre cada imagen ORIGINAL (src/assets/pintar-pixel/<tema>/originales/).
// Clave: "<tema>/<nombre>". Valores en pixeles del original: x, y = esquina
// superior izquierda del primer cuadro; ancho, alto = tamaño de un cuadro;
// columnas, filas = cantidad de cuadros.
//
// Flujo: Modo desarrollador del juego → "Establecer cuadrícula" → Guardar →
// "Copiar cuadrículas" → pegárselo a Claude, que la anota aquí y recrea la
// lámina con herramientas/pintar_desde_cuadricula.py (ver skills/agregar-pintar.md).
// Aquí queda como registro y para reabrirla en el editor.
export default {
  'frozen/elsa-chibi': { x: 0, y: 0, ancho: 23.29, alto: 23.48, columnas: 24, filas: 29 },
  'paw-patrol/chase': { x: 0, y: 0, ancho: 26.74, alto: 29.13, columnas: 23, filas: 23 },
  'paw-patrol/rocky': { x: 0, y: 0, ancho: 17.17, alto: 17.86, columnas: 30, filas: 28 },
  'paw-patrol/ryder': { x: 0, y: 0, ancho: 15.17, alto: 18.97, columnas: 29, filas: 29 },
  'paw-patrol/skye': { x: 2.5, y: 0, ancho: 10, alto: 8.73, columnas: 30, filas: 30 },
  'bluey/bluey-cara': { x: 0, y: 0, ancho: 20.15, alto: 20.35, columnas: 20, filas: 26 },
  'frozen/anna-cara': { x: 0, y: 0, ancho: 29.57, alto: 23.53, columnas: 23, filas: 30 },
  'frozen/anna-chibi': { x: 0, y: 0, ancho: 25.53, alto: 35.37, columnas: 19, filas: 19 },
  'frozen/elsa': { x: 0, y: 0, ancho: 27.75, alto: 33.45, columnas: 20, filas: 31 },
  'frozen/elsa-vestido': { x: 0, y: 0, ancho: 13.59, alto: 11.67, columnas: 22, filas: 49 },
  'frozen/olaf': { x: 0, y: 0, ancho: 14.3, alto: 11.11, columnas: 23, filas: 46 },
  'frozen/olaf-cara': { x: 0, y: 0, ancho: 6.37, alto: 5.9, columnas: 35, filas: 40 },
  'hello-kitty/hello-kitty': { x: 0, y: 0, ancho: 30, alto: 32.17, columnas: 24, filas: 30 },
  'mickey/donald-cara-azul': { x: 0, y: 0, ancho: 43.08, alto: 40.07, columnas: 13, filas: 15 },
  'mickey/goofy-cara': { x: 0, y: 0, ancho: 31, alto: 34.93, columnas: 18, filas: 14 },
  'mickey/mickey': { x: 0, y: 0, ancho: 28.13, alto: 28.35, columnas: 15, filas: 20 },
  'mickey/mickey-cara': { x: 0, y: 0, ancho: 26.64, alto: 24.62, columnas: 25, filas: 26 },
  'mickey/minnie': { x: 0, y: 0, ancho: 28.27, alto: 30.05, columnas: 15, filas: 19 },
  'mickey/pluto-cara': { x: 0, y: 0, ancho: 37.69, alto: 37.92, columnas: 13, filas: 12 },
  'moana/moana-chibi': { x: 0, y: 0, ancho: 16.46, alto: 17.17, columnas: 24, filas: 30 },
  'paw-patrol/chase-cuerpo': { x: 0, y: 0, ancho: 11, alto: 13.65, columnas: 20, filas: 20 },
  'paw-patrol/rubble': { x: 0, y: 0, ancho: 18.79, alto: 13.33, columnas: 29, filas: 30 },
  'pokemon/pikachu': { x: 0, y: 0, ancho: 22.3, alto: 23.89, columnas: 30, filas: 28 },
  'toy-story/forky': { x: 0, y: 0, ancho: 11.85, alto: 15.12, columnas: 26, filas: 25 },
  'toy-story/marciano': { x: 0, y: 0, ancho: 28.31, alto: 21.35, columnas: 26, filas: 37 },
  'toy-story/senor-cara-de-papa': { x: 0, y: 0, ancho: 18.86, alto: 22.14, columnas: 22, filas: 21 },
  'toy-story/woody': { x: 0, y: 0, ancho: 19.45, alto: 19.86, columnas: 22, filas: 29 },
  'winnie-pooh/igor': { x: 0, y: 0, ancho: 21.67, alto: 23.33, columnas: 30, filas: 24 },
  'winnie-pooh/piglet': { x: 0, y: 0, ancho: 24.32, alto: 23.63, columnas: 22, filas: 27 },
  'winnie-pooh/pooh-abeja': { x: 0, y: 0, ancho: 20.69, alto: 20.89, columnas: 32, filas: 28 },
  'winnie-pooh/pooh-con-miel': { x: 0, y: 0, ancho: 28.5, alto: 34.68, columnas: 20, filas: 19 },
  'bluey/bingo': { x: 0, y: 0, ancho: 17.63, alto: 19.67, columnas: 32, filas: 39 },
  'bluey/bluey': { x: 0, y: 0, ancho: 12.31, alto: 14.91, columnas: 32, filas: 43 },
  'halloween/dracula': { x: 0, y: 0, ancho: 37.13, alto: 29.6, columnas: 16, filas: 20 },
  'halloween/fantasma-bruja': { x: 0, y: 0, ancho: 26.73, alto: 22.5, columnas: 22, filas: 32 },
  'sonic/sonic': { x: 0, y: 0, ancho: 26.7, alto: 30.63, columnas: 20, filas: 27 },
  'unicornio/arcoiris': { x: 0, y: 0, ancho: 32.06, alto: 33.22, columnas: 16, filas: 9 },
  'unicornio/arcoiris-lapiz': { x: 0, y: 0, ancho: 25.05, alto: 25.05, columnas: 20, filas: 20 },
  'unicornio/corazon': { x: 0, y: 0, ancho: 18.18, alto: 17.9, columnas: 22, filas: 20 },
  'unicornio/estrella': { x: 0, y: 0, ancho: 18.55, alto: 16.13, columnas: 22, filas: 24 },
  'unicornio/mariposa': { x: 0, y: 0, ancho: 14.38, alto: 15, columnas: 16, filas: 11 },
  'unicornio/unicornio-arcoiris': { x: 0, y: 0, ancho: 36.67, alto: 42, columnas: 18, filas: 20 },
  'unicornio/unicornio-estrella': { x: 0, y: 0, ancho: 25.56, alto: 25.58, columnas: 25, filas: 26 },
  'unicornio/unicornio-pequeno': { x: 0, y: 0, ancho: 40.92, alto: 28.88, columnas: 13, filas: 17 },
  'unicornio/unicornio-perfil': { x: 0, y: 0, ancho: 40.31, alto: 45.41, columnas: 16, filas: 17 },
  'unicornio/unicornio-pony': { x: 0, y: 0, ancho: 17.59, alto: 17, columnas: 27, filas: 27 },
  'winnie-pooh/pooh-cara': { x: 0, y: 0, ancho: 20.22, alto: 22.15, columnas: 23, filas: 20 },
};
