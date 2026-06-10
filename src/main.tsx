import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ChantingProvider } from './context/ChantingContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChantingProvider>
      <App />
    </ChantingProvider>
  </StrictMode>,
)

// Explicitly register PWA Service Worker for local development and production
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Vite PWA serves the dev service worker at '/dev-sw.js?dev-sw' in dev mode
    const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
    navigator.serviceWorker.register(swUrl, {
      type: import.meta.env.DEV ? 'module' : 'classic'
    })
      .then(reg => {
        console.log('Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
  });
}
