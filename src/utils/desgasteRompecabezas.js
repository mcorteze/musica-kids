// Reinicio PROGRESIVO del avance del Rompecabezas por inactividad (pedido
// explicito, reemplaza al vaciado de armados cada 24 h). Va por tema:
//  - Si pasan 7 dias sin armar NINGUN rompecabezas del tema, se reinicia su
//    nivel mas alto alcanzado: queda bloqueado de nuevo (baja el nivel
//    maximo) y se borran los armados de ese nivel y del que pasa a ser el
//    mas alto, para que haya que volver a completarlo para recuperarlo.
//  - Si sigue sin actividad, se reinicia el siguiente nivel hacia abajo a
//    los 4 dias, despues a los 2 y despues de a 1 dia cada uno.
//  - El nivel 1 nunca se bloquea: al llegar a el solo se borran sus armados.
//  - Armar cualquier rompecabezas del tema detiene todo y el reloj vuelve a
//    empezar (ultima actividad = ahora, ningun reinicio aplicado).

const DIA_MS = 24 * 60 * 60 * 1000;
// Dias de espera antes de cada reinicio sucesivo; despues del ultimo, 1 dia.
export const DIAS_ENTRE_REINICIOS = [7, 4, 2];

// Cuantos reinicios corresponden despues de "ms" sin actividad
// (0 antes de 7 dias, 1 a los 7, 2 a los 11, 3 a los 13, 4 a los 14...).
export function reiniciosCorrespondientes(ms) {
  let dias = ms / DIA_MS;
  let n = 0;
  for (const espera of DIAS_ENTRE_REINICIOS) {
    if (dias < espera) return n;
    dias -= espera;
    n += 1;
  }
  return n + Math.floor(dias);
}

// estado: { nivelMaximo, ids, ultima, aplicados }, idsPorNivel: [[ids del
// nivel 1], [ids del nivel 2], ...]. Devuelve el estado con los reinicios
// que falten aplicar (los ya aplicados no se repiten).
export function aplicarDesgaste(estado, idsPorNivel, ahora = Date.now()) {
  const debidos = reiniciosCorrespondientes(ahora - estado.ultima);
  let { nivelMaximo, ids, aplicados } = estado;
  const borrarNivel = (n) => {
    const delNivel = new Set(idsPorNivel[n] ?? []);
    ids = ids.filter((id) => !delNivel.has(id));
  };
  while (aplicados < debidos) {
    if (nivelMaximo > 0) {
      borrarNivel(nivelMaximo);
      nivelMaximo -= 1;
    }
    borrarNivel(nivelMaximo);
    aplicados += 1;
  }
  return { nivelMaximo, ids, ultima: estado.ultima, aplicados };
}
