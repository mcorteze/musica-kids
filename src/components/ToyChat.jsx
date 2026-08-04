import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageFilled, CloseOutlined } from '@ant-design/icons';
import conversaciones, {
  personajes,
  respuestas as respuestasPorDefecto,
  sospechas,
  escondidas,
  SIEMPRE_VISIBLE,
  ZONA,
} from '../data/conversaciones';

const STORAGE_KEY = 'musica-kids-chats-leidos';
// Lo que ella contesto, por conversacion. Se guarda para que al reabrir el
// hilo siga estando su respuesta y el "shhh" de los juguetes.
const STORAGE_RESP = 'musica-kids-chats-respuestas';
// Cada cuanto se revisa la ventana horaria. Si la app quedo abierta antes de
// que empiece, el boton tiene que aparecer solo, sin recargar.
const REVISAR_CADA_MS = 30000;

// Ella manda dos mensajes: uno y le sospechan, otro y la descubren.
const MAX_RESPUESTAS = 2;
// Primero pasa un rato sin absolutamente nada, como si el juguete todavia no
// se decidiera a contestar, y recien despues aparece con los puntitos. Entre
// 7 y 9 segundos en total desde que ella toca. Con menos no se leia como que
// alguien estuviera escribiendo del otro lado.
const PAUSA_MIN_MS = 2000;
const PAUSA_MAX_MS = 3000;
const ESCRIBIENDO_MIN_MS = 5000;
const ESCRIBIENDO_MAX_MS = 6000;

const entre = (min, max) => min + Math.random() * (max - min);

function leerLeidos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function leerRespuestas() {
  try {
    const raw = localStorage.getItem(STORAGE_RESP);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj || typeof obj !== 'object') return {};
    // El formato viejo guardaba un solo mensaje de ella: { texto, escondida }.
    // Se convierte al vuelo para no borrarle las conversaciones que ya leyo.
    const migradas = {};
    for (const [id, v] of Object.entries(obj)) {
      if (!v || typeof v !== 'object') continue;
      migradas[id] = Array.isArray(v.textos)
        ? v
        : {
            textos: v.texto ? [v.texto] : [],
            sospecha: null,
            escondida: v.escondida ?? null,
          };
    }
    return migradas;
  } catch {
    return {};
  }
}

// Fecha y hora en la zona horaria del proyecto, NO en la del aparato.
// Una tablet configurada en otra zona apagaba el chat a destiempo.
export function partesEnZona(d) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const p = {};
    for (const parte of fmt.formatToParts(d)) p[parte.type] = parte.value;
    if (p.year && p.hour) {
      return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
    }
  } catch {
    // Navegador sin soporte de zonas horarias: se cae al reloj del aparato.
  }
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return {
    fecha: `${d.getFullYear()}-${mes}-${dia}`,
    hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

export function dentroDeVentana(conv, ahora) {
  const { fecha, hora } = partesEnZona(ahora);
  if (conv.desde && fecha < conv.desde) return false;
  if (conv.hasta && fecha > conv.hasta) return false;
  if (conv.desdeHora && hora < conv.desdeHora) return false;
  if (conv.hastaHora && hora > conv.hastaHora) return false;
  return true;
}

// El avatar va antes o despues de la burbuja segun el lado, para que siempre
// quede pegado al borde de la pantalla.
function Fila({ personaje, texto, esMia, seguido, puntos }) {
  const derecha = esMia || personaje?.lado === 'der';

  const avatar = (
    <span className={`chat-avatar ${esMia ? 'mia' : ''}`}>
      {!esMia && !seguido && personaje && <img src={personaje.avatar} alt="" />}
    </span>
  );

  return (
    <div
      className={`chat-fila ${derecha ? 'der' : 'izq'} ${esMia ? 'mia' : ''} ${seguido ? 'seguido' : ''}`}
    >
      {!derecha && avatar}
      <div className="chat-burbuja">
        {!esMia && !seguido && personaje && (
          <span className="chat-nombre">{personaje.nombre}</span>
        )}
        {puntos ? (
          <span className="chat-puntos" role="status" aria-label="Está escribiendo">
            <i /><i /><i />
          </span>
        ) : (
          <span className="chat-texto">{texto}</span>
        )}
      </div>
      {derecha && avatar}
    </div>
  );
}

export default function ToyChat() {
  const [leidos, setLeidos] = useState(leerLeidos);
  const [guardadas, setGuardadas] = useState(leerRespuestas);
  const [ahora, setAhora] = useState(() => new Date());
  const [abierta, setAbierta] = useState(null);
  // Quien esta "escribiendo" en este momento, o null. Es solo del momento: no
  // se guarda, asi que al reabrir el hilo ya esta todo puesto.
  const [escribiendo, setEscribiendo] = useState(null);
  // Se levanta apenas ella toca, no cuando aparecen los puntitos: en los
  // segundos de silencio previos alcanzaba a tocar el segundo y se disparaban
  // dos respuestas a la vez.
  const [esperando, setEsperando] = useState(false);
  const finRef = useRef(null);
  const desfaseRef = useRef(0);
  // Los temporizadores escriben despues de que ella toco, cuando el estado ya
  // quedo viejo. Se lee de la ref para no pisar lo guardado.
  const guardadasRef = useRef(guardadas);
  const temporizadoresRef = useRef([]);

  // Lo que ella ya contesto en esta conversacion, si es que contesto.
  const respondido = abierta ? guardadas[abierta.id] : null;

  const persistir = useCallback((id, datos) => {
    const nuevas = { ...guardadasRef.current, [id]: datos };
    guardadasRef.current = nuevas;
    setGuardadas(nuevas);
    try {
      localStorage.setItem(STORAGE_RESP, JSON.stringify(nuevas));
    } catch {
      // Sin localStorage la respuesta vive solo mientras el drawer este abierto.
    }
  }, []);

  useEffect(() => () => temporizadoresRef.current.forEach(clearTimeout), []);

  const responder = useCallback((texto) => {
    if (!abierta || esperando) return;
    const id = abierta.id;
    const previo = guardadasRef.current[id] ?? {
      textos: [],
      sospecha: null,
      escondida: null,
    };
    if (previo.escondida || previo.textos.length >= MAX_RESPUESTAS) return;

    const textos = [...previo.textos, texto];
    const ultima = textos.length >= MAX_RESPUESTAS;

    // Primero sospechan y recien con el segundo mensaje la descubren. El del
    // shhh no puede ser el mismo que sospecho, o parece que hablara solo.
    const candidatos = ultima
      ? escondidas.filter((e) => e.de !== previo.sospecha?.de)
      : sospechas;
    const lista = candidatos.length ? candidatos : escondidas;
    const proximo = lista[Math.floor(Math.random() * lista.length)];

    // Su mensaje se ve al toque; el del juguete se hace esperar.
    persistir(id, { ...previo, textos });
    setEsperando(true);

    const t1 = setTimeout(() => {
      setEscribiendo(proximo);
      const espera = entre(ESCRIBIENDO_MIN_MS, ESCRIBIENDO_MAX_MS);
      // Si cierra el chat mientras escriben, el temporizador igual termina y
      // deja el mensaje guardado: al volver a entrar lo encuentra puesto.
      const t2 = setTimeout(() => {
        setEscribiendo(null);
        setEsperando(false);
        const actual = guardadasRef.current[id] ?? { textos, sospecha: null, escondida: null };
        persistir(
          id,
          ultima ? { ...actual, escondida: proximo } : { ...actual, sospecha: proximo }
        );
      }, espera);
      temporizadoresRef.current.push(t2);
    }, entre(PAUSA_MIN_MS, PAUSA_MAX_MS));
    temporizadoresRef.current.push(t1);
  }, [abierta, esperando, persistir]);

  // El reloj del aparato tampoco es de fiar: si esta corrido, la ventana se
  // corre con el. Se toma la hora real del servidor (cabecera Date de la
  // respuesta) y se guarda la diferencia. Si falla, se sigue con la del aparato.
  useEffect(() => {
    let vivo = true;
    fetch('./', { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        const cabecera = r.headers.get('date');
        if (!vivo || !cabecera) return;
        const t = Date.parse(cabecera);
        if (!Number.isNaN(t)) {
          desfaseRef.current = t - Date.now();
          setAhora(new Date(Date.now() + desfaseRef.current));
        }
      })
      .catch(() => {});

    const t = setInterval(
      () => setAhora(new Date(Date.now() + desfaseRef.current)),
      REVISAR_CADA_MS
    );
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  const conversacion = useMemo(() => {
    const disponibles = conversaciones.filter(
      (c) => c.activa && dentroDeVentana(c, ahora)
    );
    // En desarrollo no se filtra por leidas. Las persistentes tampoco:
    // dentro de su ventana se pueden abrir todas las veces que quiera.
    if (SIEMPRE_VISIBLE) return disponibles[0];
    return disponibles.find((c) => c.persistente || !leidos.includes(c.id));
  }, [leidos, ahora]);

  const cerrar = useCallback(() => {
    if (abierta && !SIEMPRE_VISIBLE && !abierta.persistente) {
      const nuevos = [...leidos, abierta.id];
      setLeidos(nuevos);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
      } catch {
        // Si no hay localStorage, la conversacion volveria a aparecer. No es grave.
      }
    }
    setAbierta(null);
  }, [abierta, leidos]);

  useEffect(() => {
    if (!abierta) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [abierta, cerrar]);

  // Con cada burbuja nueva, incluidos los puntitos, bajar hasta el final
  useEffect(() => {
    if ((respondido || escribiendo) && finRef.current) {
      finRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [respondido, escribiendo]);

  if (!conversacion && !abierta) return null;

  const enviadas = respondido?.textos ?? [];
  // El hilo se cierra con el shhh, no con su segundo mensaje.
  const cerrado = Boolean(respondido?.escondida);
  // Se lee de "abierta" para que la ventana no le cierre el drawer en la cara
  // si vence justo mientras lo esta leyendo. Lo que ya mando no se le vuelve
  // a ofrecer.
  const opciones = (abierta?.respuestas ?? respuestasPorDefecto).filter(
    (o) => !enviadas.includes(o)
  );

  return (
    <>
      {conversacion && (
        <button
          type="button"
          onClick={() => setAbierta(conversacion)}
          className="theme-trigger-btn chat-trigger-btn"
          aria-label="Mensajes de los juguetes"
        >
          <MessageFilled />
          <span className="chat-trigger-dot" aria-hidden="true" />
        </button>
      )}

      {abierta && createPortal(
        <div className="chat-overlay">
          <div className="chat-drawer">
            <div className="chat-drawer-header">
              <h2>Los juguetes</h2>
              <button
                type="button"
                className="chat-cerrar-x"
                onClick={cerrar}
                aria-label="Cerrar"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className="chat-hilo">
              <div className="chat-hilo-interior">
                {abierta.mensajes.map((m, i) => {
                  const anterior = abierta.mensajes[i - 1];
                  return (
                    <Fila
                      key={i}
                      personaje={personajes[m.de]}
                      texto={m.texto}
                      seguido={Boolean(anterior && anterior.de === m.de)}
                    />
                  );
                })}

                {enviadas[0] && <Fila texto={enviadas[0]} esMia />}

                {/* Con el primero solo sospechan: escucharon algo pero todavia
                    no la ven. */}
                {respondido?.sospecha && (
                  <Fila
                    personaje={personajes[respondido.sospecha.de]}
                    texto={respondido.sospecha.texto}
                  />
                )}

                {enviadas[1] && <Fila texto={enviadas[1]} esMia />}

                {/* Con el segundo la descubren y se quedan tiesos. Con eso se
                    cierra el hilo. */}
                {respondido?.escondida && (
                  <Fila
                    personaje={personajes[respondido.escondida.de]}
                    texto={respondido.escondida.texto}
                  />
                )}

                {escribiendo && <Fila personaje={personajes[escribiendo.de]} puntos />}
                <div ref={finRef} />
              </div>
            </div>

            <div className="chat-respuestas">
              {!cerrado ? (
                opciones.map((r) => (
                  <button
                    type="button"
                    key={r}
                    className="chat-respuesta-btn"
                    // Mientras escriben no puede adelantarse: si toca el
                    // segundo antes de que llegue la sospecha, se desordena.
                    disabled={esperando}
                    onClick={() => responder(r)}
                  >
                    {r}
                  </button>
                ))
              ) : (
                <button type="button" className="chat-cerrar-btn" onClick={cerrar}>
                  Listo
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
