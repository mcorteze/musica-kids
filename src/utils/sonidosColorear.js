// Sonidos de "Colorear", generados con Web Audio (sin archivos): el sello
// hace "pop" y elegir algo hace "clic". Los lapices NO suenan al pintar
// (pedido 2026-10-24: el spray se quedaba sonando y cargaba la tablet).
// Volumen bajo (es una app infantil que suele sonar junto a la musica). Se
// silencian con silenciar(true).
//
// El AudioContext se crea recien con el primer toque (los navegadores no
// dejan sonar antes de una interaccion).

let ctx = null;
let silencio = false;

export function silenciar(valor) {
  silencio = valor;
}

// Crea el contexto de antemano (al abrir la hoja): crearlo en el primer
// toque lo trababa un momento. Queda suspendido hasta el primer toque.
export function prepararAudio() {
  const s = silencio;
  silencio = false;
  audio();
  silencio = s;
}

function audio() {
  if (silencio) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function nota(frecuencia, { volumen = 0.05, ms = 260, tipo = 'sine', cuando = 0, hasta = null } = {}) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  o.type = tipo;
  const t = a.currentTime + cuando;
  o.frequency.setValueAtTime(frecuencia, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + ms / 1000);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volumen, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + ms / 1000 + 0.02);
}

export function sonidoPop() {
  nota(620, { volumen: 0.07, ms: 110, hasta: 180 });
  nota(1250, { volumen: 0.025, ms: 70, cuando: 0.01 });
}

// Un toque suave al elegir herramienta, color o forma.
export function sonidoClic() {
  nota(880, { volumen: 0.025, ms: 60 });
}
