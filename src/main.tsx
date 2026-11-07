import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/mood-palettes.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: solo in produzione (mai in npm run dev)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Registrazione service worker fallita:', err)
    })
  })
}
