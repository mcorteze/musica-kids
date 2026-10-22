import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { iniciarCaducidad } from './utils/caducidad.js'

// Antes de montar la app: que ningun componente alcance a leer algo vencido.
iniciarCaducidad()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
