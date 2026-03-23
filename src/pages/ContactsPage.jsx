import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { BiScan, BiX, BiCopy } from 'react-icons/bi'
import { useAuthStore } from '../stores/authStore'
import { useContactsStore } from '../stores/contactsStore'
import { useUIStore } from '../stores/uiStore'

export function ContactsPage() {
  const { user, profile } = useAuthStore()
  const { contacts, fetchContacts, createConversationFromContact } = useContactsStore()
  const [showQR, setShowQR] = useState(false)
  const navigate = useNavigate()

  const { showToast } = useUIStore()

  useEffect(() => {
    if (user) fetchContacts(user.id)
  }, [user])

  const qrData = JSON.stringify({
    i: user?.id,
    p: profile?.public_key,
    n: profile?.display_name
  })

  const handleCopyCode = () => {
    // Safer way to base64 with unicode support
    const code = btoa(unescape(encodeURIComponent(qrData)))
    navigator.clipboard.writeText(code)
    showToast('Code contact copié !')
  }

  return (
    <>
      <header className="page-header">
        <h1>Contacts</h1>
        <div className="page-header-actions">
          <button className="btn-icon" onClick={() => navigate('/scan')}>
            <BiScan />
          </button>
        </div>
      </header>
      
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowQR(true)}>
            Mon QR Code
          </button>
          <button className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleCopyCode}>
            <BiCopy /> Copier code
          </button>
        </div>

        <div className="section-label" style={{ paddingLeft: 0 }}>Mes contacts ({contacts.length})</div>
        
        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>Scannez le QR code d'un ami pour l'ajouter.</p>
          </div>
        ) : (
          <div className="conv-list" style={{ margin: '0 -16px' }}>
            {contacts.map((c, i) => (
              <motion.div 
                key={c.id} 
                className="conv-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={async () => {
                  const convId = await createConversationFromContact(user.id, c.id)
                  if (convId) navigate(`/chat/${convId}`)
                }}
              >
                <div className="avatar avatar-md">{c.display_name?.[0]?.toUpperCase()}</div>
                <div className="conv-item-info">
                  <div className="conv-item-name">{c.display_name}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showQR && (
          <div className="modal-backdrop" onClick={() => setShowQR(false)}>
            <motion.div 
              className="modal"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
              style={{ textAlign: 'center', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 className="modal-title" style={{ margin: 0 }}>Mon QR Code</h2>
                <button className="btn-icon" onClick={() => setShowQR(false)}><BiX /></button>
              </div>
              <div className="qr-wrapper">
                <QRCodeSVG value={qrData} size={240} level="M" includeMargin />
              </div>
              <p style={{ marginTop: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
                Faites scanner ce code pour qu'on puisse vous envoyer des messages chiffrés.
              </p>
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: 16, width: '100%' }}
                onClick={handleCopyCode}
              >
                Copier le code manuel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
