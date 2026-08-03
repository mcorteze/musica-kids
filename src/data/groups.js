// ============================================
// GRUPOS / FILTROS - EDITAR AQUI
// ============================================
// Cada tarjeta del carrusel filtra la lista Y aplica un tema de color.
//
// id     -> valor que va en el campo "groups" de cada cancion en songs.js
// name   -> lo que se lee bajo la portada
// cover  -> imagen en public/theme-covers/
// theme  -> clave de src/themes/index.js.
//           Los grupos que no tienen paleta propia usan 'sky' (el tema por defecto).
// fit    -> 'contain' cuando la portada es un logo y recortarla lo cortaria.
//           Detras se pinta la misma imagen difuminada para rellenar el cuadrado.
//
// El grupo 'all' es especial: no filtra nada y no tiene portada.
// El orden de este arreglo es el orden del carrusel (de mas a menos canciones).
// ============================================

export const ALL_GROUPS = 'all';

const groups = [
  {
    id: 'all',
    name: 'Todas',
    cover: null,
    theme: 'sky',
  },
  {
    id: 'efecto-n',
    name: 'Efecto N',
    cover: 'theme-covers/efecto-n.jpg',
    theme: 'sky',
    fit: 'contain',
  },
  {
    id: 'papelina',
    name: 'Papelina y Papelón',
    cover: 'theme-covers/papelina.jpg',
    theme: 'sky',
  },
  {
    id: '31-minutos',
    name: '31 Minutos',
    cover: 'theme-covers/trece.avif',
    theme: 'trece',
  },
  {
    id: 'guaypes-club',
    name: 'Guaypes Club',
    cover: 'theme-covers/guaypes-club.jpg',
    theme: 'sky',
    fit: 'contain',
  },
  {
    id: 'munecas',
    name: 'Casa de Munecas',
    cover: 'theme-covers/munecas.avif',
    theme: 'munecas',
  },
  {
    id: 'paw-patrol',
    name: 'Paw Patrol',
    cover: 'theme-covers/sky.avif',
    theme: 'sky',
  },
  {
    id: 'bluey',
    name: 'Bluey',
    cover: 'theme-covers/bluey.avif',
    theme: 'bluey',
  },
  {
    id: 'ruedas',
    name: 'Ruedas y Aventuras',
    cover: 'theme-covers/ruedas.jpg',
    theme: 'sky',
  },
  {
    id: 'gummibar',
    name: 'Gummibär',
    cover: 'theme-covers/gummibar.jpg',
    theme: 'sky',
  },
];

export default groups;
