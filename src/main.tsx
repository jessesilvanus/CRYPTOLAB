import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Fonts: Inter (UI) + JetBrains Mono (cryptographic info).
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
document.head.appendChild(fontLink)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
