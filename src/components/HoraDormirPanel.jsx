import { useEffect, useState } from 'react';
import { Switch } from 'antd';
import {
  describir, guardarConfig, iniciarEnsayo, useHoraDormir, verFase,
} from '../utils/horaDormir';

// Panel del adulto (Actividades > Hora de dormir, solo modo desarrollador):
// encender en este equipo, elegir las horas y probar cada pantalla sin
// esperar a la noche. Lo que ve el niño esta en HoraDormir.jsx.
export default function HoraDormirPanel() {
  const { config } = useHoraDormir();
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Cambiar el horario descarta la prorroga y el "apagado por hoy".
  const cambiarHora = (campo) => (e) => {
    if (e.target.value) guardarConfig({ [campo]: e.target.value, prorrogaHasta: 0, pausaHasta: 0 });
  };

  return (
    <div className="hd-panel">
      <section className="hd-panel-bloque">
        <div className="hd-panel-fila">
          <span>Activar en este equipo</span>
          <Switch
            checked={config.activo}
            onChange={(activo) => guardarConfig({ activo, prorrogaHasta: 0, pausaHasta: 0 })}
          />
        </div>
        <label className="hd-panel-fila">
          <span>Hora de dormir</span>
          <input type="time" className="hd-panel-hora" value={config.dormir} onChange={cambiarHora('dormir')} />
        </label>
        <label className="hd-panel-fila">
          <span>Hora de despertar</span>
          <input type="time" className="hd-panel-hora" value={config.despertar} onChange={cambiarHora('despertar')} />
        </label>
        <p className="hd-panel-estado">{describir(config, ahora)}</p>
        <p className="hd-panel-nota">
          Avisa 30, 10 y 2 minutos antes (luna en la esquina y campanita). A la hora de
          dormir la música se apaga despacio y queda la pantalla de buenas noches hasta la
          hora de despertar. Un adulto puede dar 15 minutos más o apagarlo por hoy con el
          botón «Adulto».
        </p>
      </section>

      <section className="hd-panel-bloque">
        <h3>Probar</h3>
        <p className="hd-panel-nota">
          Las pruebas no cambian lo guardado. El ensayo recorre todo en un minuto: los tres
          avisos y la pantalla de dormir.
        </p>
        <div className="hd-panel-botones">
          <button type="button" className="hd-btn" onClick={iniciarEnsayo}>Ensayo de un minuto</button>
        </div>
        <div className="hd-panel-botones">
          <button type="button" className="hd-btn hd-btn--suave" onClick={() => verFase('aviso30')}>Aviso 30 min</button>
          <button type="button" className="hd-btn hd-btn--suave" onClick={() => verFase('aviso10')}>Aviso 10 min</button>
          <button type="button" className="hd-btn hd-btn--suave" onClick={() => verFase('ultimo')}>Aviso 2 min</button>
          <button type="button" className="hd-btn hd-btn--suave" onClick={() => verFase('dormir')}>Pantalla de dormir</button>
        </div>
      </section>
    </div>
  );
}
