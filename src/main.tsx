import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register custom vanilla Service Worker for offline PWA capabilities in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('VocabBloom ServiceWorker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('VocabBloom ServiceWorker registration failed:', err);
      });
  });
}

