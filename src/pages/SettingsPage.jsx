import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BiLogOut, BiCopy, BiBell } from 'react-icons/bi'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { subscribeUserToPush, unsubscribeUserFromPush } from '../lib/push'

export function SettingsPage() {
  const { user, profile, signOut, updateProfile } = useAuthStore()
  const { showToast } = useUIStore()
  const [name, setName] = useState(profile?.display_name || '')
  const [pushEnabled, setPushEnabled] = useState('Notification' in window && Notification.permission === 'granted')

  const handlePushToggle = async () => {
    if (pushEnabled) {
      await unsubscribeUserFromPush(user.id)
      setPushEnabled(false)
      showToast('Notifications désactivées')
    } else {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const sub = await subscribeUserToPush(user.id)
        if (sub) {
          setPushEnabled(true)
          showToast('Notifications activées !')
        }
      } else {
        showToast('Permission refusée')
      }
    }
  }

  const handleSave = async () => {
    if (!name.trim() || name === profile?.display_name) return
    const { error } = await updateProfile({ display_name: name })
    if (!error) showToast('Profil mis à jour')
  }

  const copyKey = () => {
    navigator.clipboard.writeText(profile?.public_key || '')
    showToast('Clé publique copiée')
  }

  return (
    <>
      <header className="page-header">
        <h1>Réglages</h1>
      </header>
      
      <div style={{ padding: 16 }}>
        <div className="auth-card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="avatar avatar-xl">{profile?.display_name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{profile?.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</div>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Nom d'affichage</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                className="input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                maxLength={30}
              />
              <button 
                className="btn btn-primary" 
                style={{ padding: '0 16px' }}
                onClick={handleSave}
                disabled={name === profile?.display_name}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="section-label" style={{ paddingLeft: 0 }}>Préférences</div>
        <div className="auth-card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(78, 205, 196, 0.1)', color: 'var(--accent-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BiBell size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>Notifications Push</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rester prévenu en arrière-plan</div>
              </div>
            </div>
            <div 
              onClick={handlePushToggle}
              style={{ 
                width: 44, height: 24, borderRadius: 12, 
                background: pushEnabled ? 'var(--accent-1)' : 'rgba(255,255,255,0.1)',
                position: 'relative', cursor: 'pointer', transition: '0.3s'
              }}
            >
              <div style={{ 
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: pushEnabled ? 23 : 3, transition: '0.3s'
              }} />
            </div>
          </div>
        </div>

        <div className="section-label" style={{ paddingLeft: 0 }}>Sécurité E2EE</div>
        <div className="auth-card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Votre clé publique</div>
          <div style={{ 
            background: 'var(--bg-input)', 
            padding: '10px 14px', 
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'monospace',
            fontSize: 11,
            wordBreak: 'break-all',
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ flex: 1 }}>{profile?.public_key}</div>
            <button className="btn-icon" onClick={copyKey} style={{ width: 32, height: 32, fontSize: 14 }}>
              <BiCopy />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>
            Vos messages sont chiffrés de bout en bout. Seuls vous et vos destinataires pouvez les lire.
          </p>
        </div>

        <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={signOut}>
          <BiLogOut /> Se déconnecter
        </button>
      </div>
    </>
  )
}
