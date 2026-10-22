import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { iniciarCaducidad } from './utils/caducidad.js'
import { iniciarModoLiviano } from './utils/rendimiento.js'

// Antes de montar la app: que ningun componente alcance a leer algo vencido.
iniciarCaducidad()
// Efectos livianos en equipos que no dan para mas (ver utils/rendimiento.js).
iniciarModoLiviano()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
