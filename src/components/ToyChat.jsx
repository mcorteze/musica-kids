import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageFilled, CloseOutlined } from '@ant-design/icons';
import conversaciones, {
  personajes,
  respuestas as respuestasPorDefecto,
  escondidas,
  SIEMPRE_VISIBLE,
} from '../data/conversaciones';

const STORAGE_KEY = 'musica-kids-chats-leidos';
// Lo que ella contesto, por conversacion. Se guarda para que al reabrir el
// hilo siga estando su respuesta y el "shhh" de los juguetes.
const STORAGE_RESP = 'musica-kids-chats-respuestas';
// Cada cuanto se revisa la ventana horaria. Si la app quedo abierta antes de
// que empiece, el boton tiene que aparecer solo, sin recargar.
const REVISAR_CADA_MS = 30000;

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
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

// Fecha y hora LOCALES (no UTC: de noche en Chile daria el dia equivocado)
function fechaLocal(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function horaLocal(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dentroDeVentana(conv, ahora) {
  const fecha = fechaLocal(ahora);
  const hora = horaLocal(ahora);
  if (conv.desde && fecha < conv.desde) return false;
  if (conv.hasta && fecha > conv.hasta) return false;
  if (conv.desdeHora && hora < conv.desdeHora) return false;
  if (conv.hastaHora && hora > conv.hastaHora) return false;
  return true;
}

// El avatar va antes o despues de la burbuja segun el lado, para que siempre
// quede pegado al borde de la pantalla.
function Fila({ personaje, texto, esMia, seguido }) {
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
        <span className="chat-texto">{texto}</span>
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
  const finRef = useRef(null);

  // Lo que ella ya contesto en esta conversacion, si es que contesto.
  const respondido = abierta ? guardadas[abierta.id] : null;

  const responder = useCallback((texto) => {
    if (!abierta) return;
    // La reaccion se elige una sola vez y se guarda con la respuesta, para que
    // al reabrir el hilo vea siempre la misma.
    const escondida = escondidas[Math.floor(Math.random() * escondidas.length)];
    const nuevas = { ...guardadas, [abierta.id]: { texto, escondida } };
    setGuardadas(nuevas);
    try {
      localStorage.setItem(STORAGE_RESP, JSON.stringify(nuevas));
    } catch {
      // Sin localStorage la respuesta vive solo mientras el drawer este abierto.
    }
  }, [abierta, guardadas]);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), REVISAR_CADA_MS);
    return () => clearInterval(t);
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

  // Al responder, bajar hasta el ultimo mensaje
  useEffect(() => {
    if (respondido && finRef.current) {
      finRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [respondido]);

  if (!conversacion && !abierta) return null;

  // Se lee de "abierta" para que la ventana no le cierre el drawer en la cara
  // si vence justo mientras lo esta leyendo.
  const opciones = abierta?.respuestas ?? respuestasPorDefecto;

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

                {respondido && (
                  <>
                    <Fila texto={respondido.texto} esMia />
                    {/* Unica respuesta: se dan cuenta de que los esta leyendo
                        y se quedan tiesos. Con eso se cierra el hilo. */}
                    {respondido.escondida && (
                      <Fila
                        personaje={personajes[respondido.escondida.de]}
                        texto={respondido.escondida.texto}
                      />
                    )}
                  </>
                )}
                <div ref={finRef} />
              </div>
            </div>

            <div className="chat-respuestas">
              {!respondido ? (
                opciones.map((r) => (
                  <button
                    type="button"
                    key={r}
                    className="chat-respuesta-btn"
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
