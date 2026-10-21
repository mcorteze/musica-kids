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
};
