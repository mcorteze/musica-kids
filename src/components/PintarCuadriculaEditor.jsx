import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, InputNumber, Slider } from 'antd';
import { recrearConGrilla } from '../utils/pintarPixel';

// Lado máximo (px) del lienzo ampliado: más grande, el navegador sufre.
const LIENZO_MAX = 6000;
// Tamaño de la vista previa del resultado.
const PREVIA_MAX = 300;

function grillaInicialDe(img) {
  // Sin ajuste previo: una cuadrícula de 20x20 sobre toda la imagen, para
  // tener algo que mover.
  return { x: 0, y: 0, ancho: img.naturalWidth / 20, alto: img.naturalHeight / 20, columnas: 20, filas: 20 };
}

// EDITOR DE CUADRÍCULA (Modo desarrollador de "Pintar pixel art"): el usuario
// ajusta a mano la cuadrícula sobre una imagen que ya es pixel art o patrón,
// para que cada cuadro del dibujo sea una celda del juego.
// 1. "Marcar esquinas": clic en la esquina superior izquierda del PRIMER
//    cuadro y en la inferior derecha del ÚLTIMO; con las columnas y filas
//    escritas, la cuadrícula se reparte sola entre esas dos esquinas.
// 2. Ajuste fino: arrastrar la cuadrícula sobre la imagen o corregir los
//    números (origen, tamaño de cuadro). Cambiar columnas/filas reparte el
//    mismo espacio en más o menos cuadros.
// A la derecha se ve en vivo cómo queda la lámina en el juego.
export default function PintarCuadriculaEditor({ img, nombre, grillaGuardada, onGuardar, onQuitar, onVolver }) {
  const [grilla, setGrilla] = useState(() => grillaGuardada ?? grillaInicialDe(img));
  const zoomMax = Math.max(1, Math.floor(LIENZO_MAX / Math.max(img.naturalWidth, img.naturalHeight)));
  const [zoom, setZoom] = useState(() => Math.min(zoomMax, Math.max(1, Math.round(900 / img.naturalWidth))));
  // 'mover' | 'esquina1' | 'esquina2'
  const [modo, setModo] = useState('mover');
  const [esquina1, setEsquina1] = useState(null);
  const arrastreRef = useRef(null);
  const lienzoRef = useRef(null);
  const previaRef = useRef(null);

  // Imagen ampliada + cuadrícula encima.
  useEffect(() => {
    const cv = lienzoRef.current;
    cv.width = img.naturalWidth * zoom;
    cv.height = img.naturalHeight * zoom;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const { x, y, ancho, alto, columnas, filas } = grilla;
    ctx.strokeStyle = 'rgba(230, 0, 60, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= columnas; c++) {
      const px = Math.round((x + c * ancho) * zoom) + 0.5;
      ctx.moveTo(px, y * zoom);
      ctx.lineTo(px, (y + filas * alto) * zoom);
    }
    for (let f = 0; f <= filas; f++) {
      const py = Math.round((y + f * alto) * zoom) + 0.5;
      ctx.moveTo(x * zoom, py);
      ctx.lineTo((x + columnas * ancho) * zoom, py);
    }
    ctx.stroke();
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * zoom, y * zoom, columnas * ancho * zoom, filas * alto * zoom);
    if (esquina1) {
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.arc(esquina1.x * zoom, esquina1.y * zoom, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [img, zoom, grilla, esquina1]);

  // Resultado en vivo (mismo cálculo que el juego).
  // Lo mismo que hará herramientas/pintar_desde_cuadricula.py al recrear la lámina.
  const resultado = useMemo(() => recrearConGrilla(img, grilla), [img, grilla]);
  useEffect(() => {
    const l = resultado;
    const celda = Math.max(1, Math.floor(PREVIA_MAX / Math.max(l.columnas, l.filas)));
    const cv = previaRef.current;
    cv.width = l.columnas * celda;
    cv.height = l.filas * celda;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    l.celdas.forEach((n, i) => {
      if (n === null) return;
      ctx.fillStyle = l.paleta[n - 1];
      ctx.fillRect((i % l.columnas) * celda, Math.floor(i / l.columnas) * celda, celda, celda);
    });
  }, [resultado]);

  // Punto de la imagen (px originales) bajo el puntero.
  const puntoDe = (e) => {
    const r = lienzoRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };

  const alPresionar = (e) => {
    const p = puntoDe(e);
    if (modo === 'esquina1') {
      setEsquina1(p);
      setModo('esquina2');
      return;
    }
    if (modo === 'esquina2') {
      const x0 = Math.min(esquina1.x, p.x);
      const y0 = Math.min(esquina1.y, p.y);
      const x1 = Math.max(esquina1.x, p.x);
      const y1 = Math.max(esquina1.y, p.y);
      setGrilla((g) => ({ ...g, x: x0, y: y0, ancho: (x1 - x0) / g.columnas, alto: (y1 - y0) / g.filas }));
      setEsquina1(null);
      setModo('mover');
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastreRef.current = { desde: p, x: grilla.x, y: grilla.y };
  };

  const alMover = (e) => {
    const a = arrastreRef.current;
    if (!a) return;
    const p = puntoDe(e);
    setGrilla((g) => ({ ...g, x: a.x + (p.x - a.desde.x), y: a.y + (p.y - a.desde.y) }));
  };

  const alSoltar = () => {
    arrastreRef.current = null;
  };

  // Cambiar la cantidad de cuadros reparte el MISMO espacio (las esquinas
  // marcadas no se mueven).
  const cambiarColumnas = (n) => {
    if (!Number.isFinite(n) || n < 1) return;
    setGrilla((g) => ({ ...g, columnas: n, ancho: (g.ancho * g.columnas) / n }));
  };
  const cambiarFilas = (n) => {
    if (!Number.isFinite(n) || n < 1) return;
    setGrilla((g) => ({ ...g, filas: n, alto: (g.alto * g.filas) / n }));
  };
  const cambiar = (campo) => (v) => {
    if (!Number.isFinite(v) || (campo !== 'x' && campo !== 'y' && v <= 0)) return;
    setGrilla((g) => ({ ...g, [campo]: v }));
  };

  const instruccion = modo === 'esquina1'
    ? 'Haz clic en la esquina SUPERIOR IZQUIERDA del primer cuadro.'
    : modo === 'esquina2'
      ? 'Ahora en la esquina INFERIOR DERECHA del último cuadro.'
      : 'Arrastra la cuadrícula para moverla.';

  return (
    <div className="pintar-editor">
      <div className="pintar-editor-lienzo-wrap">
        <canvas
          ref={lienzoRef}
          className={`pintar-editor-lienzo${modo === 'mover' ? '' : ' marcando'}`}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        />
      </div>

      <aside className="pintar-editor-panel">
        <h3>{nombre}</h3>
        <p className="pintar-editor-instruccion">{instruccion}</p>

        <Button
          type={modo === 'mover' ? 'primary' : 'default'}
          onClick={() => {
            setEsquina1(null);
            setModo(modo === 'mover' ? 'esquina1' : 'mover');
          }}
        >
          {modo === 'mover' ? 'Marcar esquinas' : 'Cancelar'}
        </Button>

        <div className="pintar-editor-campos">
          <label>Columnas<InputNumber min={1} max={200} value={grilla.columnas} onChange={cambiarColumnas} /></label>
          <label>Filas<InputNumber min={1} max={200} value={grilla.filas} onChange={cambiarFilas} /></label>
          <label>Origen X<InputNumber step={0.5} precision={2} value={grilla.x} onChange={cambiar('x')} /></label>
          <label>Origen Y<InputNumber step={0.5} precision={2} value={grilla.y} onChange={cambiar('y')} /></label>
          <label>Ancho cuadro<InputNumber min={0.5} step={0.05} precision={2} value={grilla.ancho} onChange={cambiar('ancho')} /></label>
          <label>Alto cuadro<InputNumber min={0.5} step={0.05} precision={2} value={grilla.alto} onChange={cambiar('alto')} /></label>
        </div>

        <label className="pintar-editor-zoom">
          Zoom {zoom}x
          <Slider min={1} max={zoomMax} value={zoom} onChange={setZoom} />
        </label>

        <figure className="pintar-dev-vista">
          <figcaption>Así queda en el juego</figcaption>
          <canvas ref={previaRef} className="pintar-dev-canvas" />
          <div className="pintar-dev-datos">
            <span>{resultado.columnas}×{resultado.filas} · {resultado.paleta.length} colores · {resultado.celdas.filter((n) => n !== null).length} celdas</span>
          </div>
        </figure>

        <div className="pintar-editor-acciones">
          <Button type="primary" onClick={() => onGuardar(grilla)}>Guardar</Button>
          {grillaGuardada && <Button danger onClick={onQuitar}>Quitar cuadrícula</Button>}
          <Button onClick={onVolver}>Volver</Button>
        </div>
      </aside>
    </div>
  );
}
