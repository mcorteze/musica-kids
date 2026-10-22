// Modo liviano (pedido 2026-10-22: en la tablet del niño los efectos se
// sentian pesados). Al abrir la app se mide un momento cuantos cuadros por
// segundo logra el equipo; si no alcanza, se agrega la clase "modo-liviano"
// al <html> y el CSS apaga lo decorativo (desenfoques del fondo, animaciones
// que no paran, sombras luminosas, brillos que titilan, estela) y los
// festejos usan menos chispas. En un equipo bueno todo se ve igual.
//
// El resultado se recuerda (se aplica apenas abre la proxima vez, sin
// esperar la medicion) y se vuelve a medir en cada apertura.

const CLAVE = 'musica-kids-modo-liviano';
// Espera a que la app termine de cargar antes de medir (cargar ensucia la medicion).
const ESPERA_MS = 2500;
const MEDICION_MS = 1500;
// Por debajo de esto el equipo no da para los efectos.
const FPS_MINIMO = 48;
const CUADROS_LENTOS_MAX = 4;

let liviano = false;

function aplicar(valor) {
  liviano = valor;
  document.documentElement.classList.toggle('modo-liviano', valor);
}

export const esLiviano = () => liviano;

function medir() {
  return new Promise((resolve) => {
    const tiempos = [];
    const inicio = performance.now();
    const cuadro = (t) => {
      tiempos.push(t);
      if (t - inicio < MEDICION_MS) requestAnimationFrame(cuadro);
      else {
        const huecos = tiempos.slice(1).map((x, i) => x - tiempos[i]);
        const fps = (tiempos.length - 1) / ((tiempos[tiempos.length - 1] - tiempos[0]) / 1000);
        resolve({ fps, lentos: huecos.filter((h) => h > 50).length });
      }
    };
    requestAnimationFrame(cuadro);
  });
}

// FORZADO ('1' o '0') fija el modo a mano y no se mide (pruebas, o una
// tablet que quede justo en el limite).
const FORZADO = 'musica-kids-modo-liviano-forzado';

const leer = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

export function iniciarModoLiviano() {
  const forzado = leer(FORZADO);
  if (forzado === '1' || forzado === '0') {
    aplicar(forzado === '1');
    return;
  }
  // Pistas del equipo: poca memoria = liviano siempre.
  const porMemoria = Boolean(navigator.deviceMemory && navigator.deviceMemory <= 2);
  // Lo medido la vez anterior se aplica de entrada (sin esperar).
  aplicar(porMemoria || leer(CLAVE) === '1');
  if (porMemoria) return;
  setTimeout(() => {
    // Con la pestaña oculta el navegador frena los cuadros: no se mide.
    if (document.visibilityState !== 'visible') return;
    medir().then(({ fps, lentos }) => {
      const resultado = fps < FPS_MINIMO || lentos > CUADROS_LENTOS_MAX;
      aplicar(resultado);
      try {
        localStorage.setItem(CLAVE, resultado ? '1' : '0');
      } catch {
        // nada
      }
    });
  }, ESPERA_MS);
}
