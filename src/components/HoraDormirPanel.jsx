import { useEffect, useState } from 'react';
import { Switch } from 'antd';
import {
  AUDIOS, AVISOS, LUNA_MIN, NOMBRES_DIAS, ORDEN_DIAS, audioDe, describir, guardarConfig, iniciarEnsayo,
  useHoraDormir, verAviso, verDormir,
} from '../utils/horaDormir';

// Panel del adulto (Actividades > Hora de dormir, solo modo desarrollador):
// encender en este equipo, la hora de dormir de cada dia, la de despertar,
// encender o apagar cada aviso (los minutos son fijos) y probar cada
// pantalla sin esperar a la noche.
// Lo que ve el niño esta en HoraDormir.jsx.
export default function HoraDormirPanel() {
  const { config } = useHoraDormir();
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Cambiar el horario descarta la prorroga y el "apagado por hoy".
  const sinExcepciones = { prorrogaHasta: 0, pausaHasta: 0 };
  const cambiarDia = (dia) => (e) => {
    if (!e.target.value) return;
    const dias = [...config.dias];
    dias[dia] = e.target.value;
    guardarConfig({ dias, ...sinExcepciones });
  };

  const faltan = AUDIOS.filter((a) => !audioDe(a));
  const estadoAudios = faltan.length
    ? `Audios que faltan (src/assets/hora-dormir/): ${faltan.map((a) => `${a}.mp3`).join(', ')}.`
    : 'Están los cuatro audios.';

  return (
    <div className="hd-panel">
      <section className="hd-panel-bloque">
        <div className="hd-panel-fila">
          <span>Activar en este equipo</span>
          <Switch
            checked={config.activo}
            onChange={(activo) => guardarConfig({ activo, ...sinExcepciones })}
          />
        </div>
        <p className="hd-panel-estado">{describir(config, ahora)}</p>
      </section>

      <section className="hd-panel-bloque">
        <h3>Hora de dormir</h3>
        {ORDEN_DIAS.map((dia) => (
          <label key={dia} className="hd-panel-fila">
            <span>{NOMBRES_DIAS[dia]}</span>
            <input
              type="time"
              className="hd-panel-hora"
              value={config.dias[dia]}
              onChange={cambiarDia(dia)}
              aria-label={`Hora de dormir del ${NOMBRES_DIAS[dia].toLowerCase()}`}
            />
          </label>
        ))}
        <label className="hd-panel-fila hd-panel-fila--separada">
          <span>Despertar (todos los días)</span>
          <input
            type="time"
            className="hd-panel-hora"
            value={config.despertar}
            onChange={(e) => e.target.value && guardarConfig({ despertar: e.target.value, ...sinExcepciones })}
            aria-label="Hora de despertar"
          />
        </label>
      </section>

      <section className="hd-panel-bloque">
        <h3>Avisos</h3>
        {AVISOS.map((m, i) => (
          <div key={m} className="hd-panel-fila">
            <span>{m} minutos antes</span>
            <Switch
              checked={config.avisosActivos[i]}
              aria-label={`Aviso ${m} minutos antes`}
              onChange={(activo) => {
                const avisosActivos = [...config.avisosActivos];
                avisosActivos[i] = activo;
                guardarConfig({ avisosActivos });
              }}
            />
          </div>
        ))}
        <p className="hd-panel-nota">
          La luna aparece {LUNA_MIN} minutos antes aunque los avisos estén apagados. En cada
          aviso encendido sale una tarjeta con una campanita y la voz grabada. A la hora de dormir la música se apaga despacio y queda la pantalla de
          buenas noches hasta la hora de despertar. Para dar 15 minutos más o apagarlo por
          hoy, tocar 20 veces seguidas la esquina de abajo a la derecha de esa pantalla.
        </p>
      </section>

      <section className="hd-panel-bloque">
        <h3>Probar</h3>
        <p className="hd-panel-nota">
          Las pruebas no cambian lo guardado. El ensayo recorre todo en un minuto: la luna,
          los avisos y la pantalla de dormir.
        </p>
        <div className="hd-panel-botones">
          <button type="button" className="hd-btn" onClick={iniciarEnsayo}>Ensayo de un minuto</button>
        </div>
        <p className="hd-panel-nota">{estadoAudios}</p>
        <div className="hd-panel-botones">
          {AVISOS.map((m, i) => (
            <button key={m} type="button" className="hd-btn hd-btn--suave" onClick={() => verAviso(i)}>
              Aviso {m} min
            </button>
          ))}
          <button type="button" className="hd-btn hd-btn--suave" onClick={verDormir}>Pantalla de dormir</button>
        </div>
      </section>
    </div>
  );
}
