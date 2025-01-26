import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.js'
import { TransportProvider } from './providers/TransportContext.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TransportProvider>
      <App />
    </TransportProvider>
  </StrictMode>,
)
