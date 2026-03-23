import React, { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BottomNav } from '../components/ui/BottomNav'
import { Toast } from '../components/ui/Toast'
import { AuthPage } from './AuthPage'
import { useAuthStore } from '../stores/authStore'

// Placholder imports for other pages
import { ChatsPage } from './ChatsPage'
import { ChatRoomPage } from './ChatRoomPage'
import { ContactsPage } from './ContactsPage'
import { SettingsPage } from './SettingsPage'
import { ScannerPage } from './ScannerPage'
import { NewGroupPage } from './NewGroupPage'

export function Layout({ children }) {
  return (
    <div className="app-layout">
      <div className="page">
        {children}
      </div>
      <BottomNav />
      <Toast />
    </div>
  )
}

export function AppRouter() {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="auth-page">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <>
      <AuthPage />
      <Toast />
    </>
  }

  // Profile setup check (mandatory display name)
  if (!profile?.display_name) {
    // Basic setup screen inline to not clutter routing
    return <ProfileSetupPage />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout><ChatsPage /></Layout>} />
      <Route path="/chat" element={<Layout><ChatsPage /></Layout>} />
      <Route path="/chat/:id" element={<ChatRoomPage />} />
      <Route path="/contacts" element={<Layout><ContactsPage /></Layout>} />
      <Route path="/new-group" element={<NewGroupPage />} />
      <Route path="/calendar" element={<Layout><div className="empty-state"><h3>Calendrier</h3><p>Bientôt disponible</p></div></Layout>} />
      <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
      <Route path="/scan" element={<ScannerPage />} />
    </Routes>
  )
}

function ProfileSetupPage() {
  const [name, setName] = React.useState('')
  const updateProfile = useAuthStore(s => s.updateProfile)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await updateProfile({ display_name: name.trim() })
  }

  return (
    <div className="auth-page">
      <motion.div className="auth-card" initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
        <h2>Comment vous appelez-vous ?</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input 
              className="input" 
              placeholder="Votre nom ou pseudo" 
              value={name} 
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={30}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Commencer à discuter
          </button>
        </form>
      </motion.div>
    </div>
  )
}
