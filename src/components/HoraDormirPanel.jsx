import { useEffect, useState } from 'react';
import { Switch } from 'antd';
import {
  AVISOS_MAX_MIN, LUNA_MIN, NOMBRES_DIAS, ORDEN_DIAS, describir, guardarConfig, iniciarEnsayo,
  normalizarAvisos, useHoraDormir, verAviso, verDormir,
} from '../utils/horaDormir';

// Panel del adulto (Actividades > Hora de dormir, solo modo desarrollador):
// encender en este equipo, la hora de dormir de cada dia, la de despertar,
// los minutos de los avisos y probar cada pantalla sin esperar a la noche.
// Lo que ve el niño esta en HoraDormir.jsx.
export default function HoraDormirPanel() {
  const { config } = useHoraDormir();
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Los avisos se editan como texto y se guardan al salir del campo, solo
  // si los tres son validos (si no, vuelven a lo guardado).
  const [avisos, setAvisos] = useState(() => config.avisos.map(String));
  const [errorAvisos, setErrorAvisos] = useState(false);
  const guardarAvisos = () => {
    const validos = normalizarAvisos(avisos);
    setErrorAvisos(!validos);
    if (!validos) {
      setAvisos(config.avisos.map(String));
      return;
    }
    setAvisos(validos.map(String));
    guardarConfig({ avisos: validos });
  };

  // Cambiar el horario descarta la prorroga y el "apagado por hoy".
  const sinExcepciones = { prorrogaHasta: 0, pausaHasta: 0 };
  const cambiarDia = (dia) => (e) => {
    if (!e.target.value) return;
    const dias = [...config.dias];
    dias[dia] = e.target.value;
    guardarConfig({ dias, ...sinExcepciones });
  };

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
        <h3>Avisos (minutos antes)</h3>
        <div className="hd-panel-avisos">
          {avisos.map((valor, i) => (
            <input
              key={i}
              className="hd-panel-hora hd-panel-minutos"
              inputMode="numeric"
              value={valor}
              aria-label={`Aviso ${i + 1}`}
              onChange={(e) => {
                const otros = [...avisos];
                otros[i] = e.target.value.replace(/\D/g, '').slice(0, 3);
                setAvisos(otros);
              }}
              onBlur={guardarAvisos}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          ))}
        </div>
        {errorAvisos && (
          <p className="hd-panel-error">Tienen que ser tres números distintos, entre 1 y {AVISOS_MAX_MIN}.</p>
        )}
        <p className="hd-panel-nota">
          La luna aparece {LUNA_MIN} minutos antes y en cada aviso sale una tarjeta con una
          campanita. A la hora de dormir la música se apaga despacio y queda la pantalla de
          buenas noches hasta la hora de despertar. Un adulto puede dar 15 minutos más o
          apagarlo por hoy con el botón «Adulto».
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
        <div className="hd-panel-botones">
          {config.avisos.map((m, i) => (
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
