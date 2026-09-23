import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyThemeMode, resolveActualMode } from './contexts/ThemeContext'

// Try to mount to XenForo container first, fallback to standalone root
const rootElement = document.getElementById('windows-builds-root') || document.getElementById('root');

if (rootElement) {
  // Theme first, so React's first paint is already in the right mode.
  applyThemeMode(resolveActualMode());
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  console.error('Could not find root element to mount React app');
}
