// Selector "Por afinar" / "Listos" de las paginas de trabajo (catalogo de
// Rompecabezas y Modo desarrollador de Diferencias): separa lo que todavia
// se esta preparando de lo que ya esta en el juego, para que lo nuevo no se
// pierda entre todo lo que ya esta listo. El estado inicial lo decide
// elegirEstadoDev (src/utils/estadoDev.js).

export default function EstadoDevTabs({ estado, cantidades, onChange }) {
  const opciones = [
    { id: 'afinar', nombre: 'Por afinar' },
    { id: 'listos', nombre: 'Listos' },
  ];
  return (
    <div className="dev-estado" role="tablist" aria-label="Estado">
      {opciones.map((o) => (
        <button
          type="button"
          key={o.id}
          role="tab"
          aria-selected={o.id === estado}
          className={`dev-estado-btn${o.id === estado ? ' activo' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.nombre}
          <span>{cantidades[o.id]}</span>
        </button>
      ))}
    </div>
  );
}
