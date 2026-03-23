import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { BiArrowBack } from 'react-icons/bi'
import { useAuthStore } from '../stores/authStore'
import { useContactsStore } from '../stores/contactsStore'
import { useUIStore } from '../stores/uiStore'

export function ScannerPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createConversationFromContact } = useContactsStore()
  const { showToast } = useUIStore()
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let scanner = new Html5QrcodeScanner("reader", { 
      fps: 10, qrbox: { width: 250, height: 250 } 
    }, false)
    
    scanner.render(async (text) => {
      try {
        const payload = JSON.parse(text)
        if (payload.i && payload.p) {
          if (payload.i === user.id) {
            showToast("Vous ne pouvez pas vous ajouter vous-même.")
            return
          }
          scanner.clear()
          const convId = await createConversationFromContact(user.id, payload.i)
          if (convId) navigate(`/chat/${convId}`)
          else showToast("Erreur lors de la création de la conversation.")
        }
      } catch (e) {
        console.error("Invalid QR code", e)
        // No toast here to avoid spamming during scan
      }
    }, (err) => {
      // Ignorer les erreurs pendant le scan continu
    })

    return () => {
      scanner.clear().catch(console.error)
    }
  }, [navigate, createConversationFromContact, user])

  const handleManualCode = async (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    try {
      const decoded = decodeURIComponent(escape(atob(manualCode.trim())))
      const payload = JSON.parse(decoded)
      console.log("Manual decode payload:", payload)
      if (payload.i && payload.p) {
        if (payload.i === user.id) {
          showToast("C'est votre propre code !")
          return
        }
        const convId = await createConversationFromContact(user.id, payload.i)
        console.log("Created conv from manual code:", convId)
        if (convId) navigate(`/chat/${convId}`)
        else {
          showToast("Échec de l'ajout du contact.")
          alert("Erreur DB lors de l'ajout du contact")
        }
      } else {
        throw new Error('Code invalide (données manquantes)')
      }
    } catch (err) {
      console.error("Manual add error:", err)
      showToast('Code contact invalide ou corrompu.')
      alert("Erreur de décodage : " + err.message)
    }
  }

  return (
    <>
      <header className="page-header" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <button className="btn-icon" onClick={() => navigate(-1)}><BiArrowBack /></button>
        <h1>Scanner</h1>
      </header>
      <div style={{ padding: 16 }}>
        <div id="reader" style={{ background: '#fff', color: '#000', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 24 }}></div>
        
        <div className="section-label">Ou saisir un code manuellement</div>
        <form onSubmit={handleManualCode} style={{ display: 'flex', gap: 8 }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Coller le code contact..." 
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </form>
      </div>
    </>
  )
}
