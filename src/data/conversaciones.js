// ============================================
// CONVERSACIONES DE LOS JUGUETES
// ============================================
// El contenido NO se edita aqui: vive en `conversaciones.json`, al lado de
// este archivo. Se separo para poder editarlo desde el telefono en github.com
// sin riesgo de romper el build con un parentesis mal cerrado. Al guardar en
// GitHub, el workflow de .github/workflows/deploy.yml publica solo.
//
// Este archivo guarda lo que casi nunca cambia: personajes, zona horaria,
// respuestas genericas y los remates escondidos.
//
// Reglas de escritura (importan mas que el codigo):
// 1. Los mensajes van en PASADO. Son el registro de lo que paso mientras ella
//    no estaba, no un chat en vivo.
// 2. Los juguetes nunca suenan asustados, tristes ni abandonados.
//    Aburridos, impacientes o chistosos, si.
// 3. Pocos mensajes: 3 o 4 y se cierra. No todos los juguetes participan.
//
// VENTANA DE DISPONIBILIDAD (todo opcional; lo que se omite no se evalua)
//   desde / hasta          -> fechas 'AAAA-MM-DD'
//   desdeHora / hastaHora  -> horas 'HH:MM' en 24h, hora de Chile
// Fuera de la ventana el boton no aparece. Se revisa cada 30 segundos, asi
// que si la app ya esta abierta el boton aparece solo al entrar la ventana.
//
// persistente: true  -> dentro de su ventana NO se oculta nunca, aunque ya la
//                       haya leido. Se puede abrir todas las veces que quiera.
// persistente: false -> se marca leida al cerrarla y desaparece (comportamiento
//                       normal para las conversaciones de una sola vez).
//
// respuestas: propias de cada conversacion. Si no se define, usa las genericas.
// ============================================

import conversaciones from './conversaciones.json';

// EN DESARROLLO: el boton no se oculta nunca. Tiene que quedar en false en lo
// que se publica. Ojo: esto NO salta la ventana de fecha/hora.
export const SIEMPRE_VISIBLE = false;

// Las ventanas se evaluan SIEMPRE en esta zona horaria, no en la del aparato.
// Sin esto, una tablet mal configurada (en UTC, por ejemplo) apagaba el chat
// 4 horas antes de tiempo. Las horas del JSON son hora de Chile, punto.
export const ZONA = 'America/Santiago';

// "lado" es de que lado del chat aparece cada juguete. Repartirlos entre
// izquierda y derecha es lo que hace que se lea como conversacion y no como
// una lista. Ella siempre va a la derecha, en verde.
export const personajes = {
  'gato-loco': { nombre: 'Gato Loco', avatar: 'juguetes/gato-loco.png', lado: 'izq' },
  muneca: { nombre: 'Muñeca', avatar: 'juguetes/muneca.png', lado: 'der' },
  raton: { nombre: 'Ratón', avatar: 'juguetes/raton.png', lado: 'izq' },
  turtle: { nombre: 'Turtle', avatar: 'juguetes/turtle.png', lado: 'der' },
};

// Respuestas genericas, para las conversaciones que no traen las suyas.
// Sin teclado a proposito.
export const respuestas = [
  '¡Ya llegué!',
  'Los extrañé',
  '¡Los descubrí!',
];

// Cuando ella contesta, los juguetes se dan cuenta de que los esta leyendo y
// se quedan tiesos, como en la pelicula. Es lo ultimo del hilo: despues de
// esto no hablan mas. Se elige una al azar y queda guardada, asi que si
// vuelve a abrir la conversacion ve exactamente la misma.
export const escondidas = [
  { de: 'raton', texto: '¡Shhhh! ¡Nos está leyendo!' },
  { de: 'gato-loco', texto: '¡Shhhh! Todos quietos.' },
  { de: 'turtle', texto: '¡Shhhh! Nadie se mueva.' },
  { de: 'muneca', texto: '¡Shhhh! Hagan como que no pasó nada.' },
];

export default conversaciones;
