import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './pages/AppRouter'
import { useAuthStore } from './stores/authStore'
import './index.css'

// Register PWA service worker (vite-plugin-pwa)
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

function Root() {
  const initAuth = useAuthStore(s => s.init)

  useEffect(() => {
    initAuth()
  }, [])

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
