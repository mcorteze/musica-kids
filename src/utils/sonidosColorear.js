// Sonidos de "Colorear", generados con Web Audio (sin archivos): cada
// herramienta suena distinto mientras pinta y el sello hace "pop". Volumen bajo (es una app infantil
// que suele sonar junto a la musica). Se silencian con silenciar(true).
//
// El AudioContext se crea recien con el primer toque (los navegadores no
// dejan sonar antes de una interaccion).

let ctx = null;
let ruido = null;
let silencio = false;

export function silenciar(valor) {
  silencio = valor;
}

// Crea el contexto y el ruido de antemano (al abrir la hoja): crearlos en el
// primer trazo lo trababa un momento. Queda suspendido hasta el primer toque.
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
      // 1 s de ruido blanco, reutilizado por todos los sonidos de roce.
      ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const datos = ruido.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Rafaga corta de ruido filtrado (roce de crayon, susurro de plumon...).
function rafaga({ tipo, frecuencia, q = 1, volumen, ms }) {
  const a = audio();
  if (!a) return;
  const fuente = a.createBufferSource();
  fuente.buffer = ruido;
  const filtro = a.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = frecuencia * (0.85 + Math.random() * 0.3);
  filtro.Q.value = q;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  fuente.connect(filtro).connect(g).connect(a.destination);
  fuente.start(t, Math.random() * 0.5);
  fuente.stop(t + ms / 1000 + 0.02);
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

const TINTINEO = [1318, 1568, 1760, 2093, 2349, 2637];

// Sonido de cada herramienta al moverse: { cada: ms minimo entre sonidos, sonar }.
const AL_MOVER = {
  roce: { cada: 70, sonar: () => rafaga({ tipo: 'bandpass', frecuencia: 3000, q: 0.9, volumen: 0.05, ms: 45 }) },
  susurro: { cada: 120, sonar: () => rafaga({ tipo: 'lowpass', frecuencia: 900, volumen: 0.035, ms: 90 }) },
  goma: { cada: 90, sonar: () => rafaga({ tipo: 'bandpass', frecuencia: 850, q: 1.2, volumen: 0.06, ms: 70 }) },
  tintineo: { cada: 95, sonar: () => nota(TINTINEO[Math.floor(Math.random() * TINTINEO.length)], { volumen: 0.04, ms: 320 }) },
};

const SONIDO_DE = {
  crayon: 'roce',
  lapiz: 'roce',
  tiza: 'roce',
  goma: 'goma',
  brillos: 'tintineo',
  spray: null,
  sellos: null,
};

// Sonido mientras dura un trazo. Devuelve { mover(), parar() }.
export function sonidoDeTrazo(herramienta) {
  const nada = { mover() {}, parar() {} };
  if (silencio) return nada;
  if (herramienta === 'spray') {
    const a = audio();
    if (!a) return nada;
    const fuente = a.createBufferSource();
    fuente.buffer = ruido;
    fuente.loop = true;
    const filtro = a.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 2500;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.035, a.currentTime + 0.05);
    fuente.connect(filtro).connect(g).connect(a.destination);
    fuente.start();
    return {
      mover() {},
      parar() {
        g.gain.setTargetAtTime(0.0001, a.currentTime, 0.04);
        fuente.stop(a.currentTime + 0.2);
      },
    };
  }
  const clave = herramienta in SONIDO_DE ? SONIDO_DE[herramienta] : 'susurro';
  if (!clave) return nada;
  const { cada, sonar } = AL_MOVER[clave];
  let ultimo = 0;
  return {
    mover() {
      const ahora = performance.now();
      if (ahora - ultimo < cada) return;
      ultimo = ahora;
      sonar();
    },
    parar() {},
  };
}

export function sonidoPop() {
  nota(620, { volumen: 0.07, ms: 110, hasta: 180 });
  nota(1250, { volumen: 0.025, ms: 70, cuando: 0.01 });
}

// Un toque suave al elegir herramienta, color o forma.
export function sonidoClic() {
  nota(880, { volumen: 0.025, ms: 60 });
}
