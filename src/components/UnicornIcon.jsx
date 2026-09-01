// No existe un icono de unicornio en @ant-design/icons, asi que es un SVG
// propio: cabeza redonda + orejas + un unico cuerno centrado (mas alto que
// las orejas para no leerse como una corona de puntas parejas).
export default function UnicornIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
      <polygon points="10.5,9 12,-3 13.5,9" />
      <ellipse cx="5.5" cy="12" rx="2.3" ry="3.2" transform="rotate(-20 5.5 12)" />
      <ellipse cx="18.5" cy="12" rx="2.3" ry="3.2" transform="rotate(20 18.5 12)" />
      <circle cx="12" cy="15" r="7" />
    </svg>
  );
}
