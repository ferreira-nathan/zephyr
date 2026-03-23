import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuthStore()
  const showToast = useUIStore(s => s.showToast)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    
    const { error } = isLogin 
      ? await signIn(email, password)
      : await signUp(email, password)
      
    setLoading(false)
    if (error) {
      showToast(error.message)
    }
  }

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-logo grad-text"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        Zephyr
      </motion.div>
      <motion.p 
        className="auth-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.2 } }}
      >
        Messagerie chiffrée de bout en bout.<br/>
        Simple, rapide, privée.
      </motion.p>
      
      <motion.div 
        className="auth-card"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { delay: 0.1 } }}
      >
        <form onSubmit={handleSubmit}>
          <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>
          
          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input
              type="email"
              className="input"
              placeholder="vous@exemple.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: 16 }}
            disabled={loading}
          >
            {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : (isLogin ? 'Se connecter' : 'Créer un compte')}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
            </span>{' '}
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              style={{ color: 'var(--accent-2)', fontWeight: 600 }}
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
