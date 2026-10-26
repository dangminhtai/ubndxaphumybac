import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import SystemReadiness from './components/SystemReadiness'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemReadiness><App /></SystemReadiness>
  </StrictMode>,
)
