import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BiArrowBack } from 'react-icons/bi'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useContactsStore } from '../stores/contactsStore'
import { useUIStore } from '../stores/uiStore'

export function NewGroupPage() {
  const navigate = useNavigate()
  const { user, keypair } = useAuthStore()
  const { contacts, fetchContacts, createGroupConversation } = useContactsStore()
  const { showToast } = useUIStore()
  
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) fetchContacts(user.id)
  }, [user])

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id))
    else setSelectedIds([...selectedIds, id])
  }

  const handleCreate = async () => {
    if (!name.trim()) return showToast('Veuillez entrer un nom de groupe')
    if (selectedIds.length === 0) return showToast('Veuillez sélectionner au moins un contact')
    
    setLoading(true)
    const convId = await createGroupConversation(user.id, keypair, name.trim(), selectedIds)
    setLoading(false)
    
    if (convId) {
      navigate(`/chat/${convId}`)
    } else {
      showToast('Erreur lors de la création du groupe')
    }
  }

  return (
    <>
      <header className="page-header" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <button className="btn-icon" onClick={() => navigate(-1)}><BiArrowBack /></button>
        <h1>Nouveau Groupe</h1>
        <div className="page-header-actions">
          <button 
            className="btn btn-primary" 
            style={{ padding: '6px 16px', fontSize: 14 }}
            onClick={handleCreate}
            disabled={loading || !name.trim() || selectedIds.length === 0}
          >
            {loading ? '...' : 'Créer'}
          </button>
        </div>
      </header>

      <div style={{ padding: 16 }}>
        <div className="form-group">
          <label className="form-label">Nom du groupe</label>
          <input
            type="text"
            className="input"
            placeholder="Les copains, Projet Secret..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="section-label" style={{ paddingLeft: 0, marginTop: 24 }}>
          Sélectionner les membres ({selectedIds.length}/{contacts.length})
        </div>

        {contacts.length === 0 ? (
          <div className="empty-state">
            <p>Vous n'avez pas encore de contacts.</p>
          </div>
        ) : (
          <div className="conv-list" style={{ margin: '0 -16px' }}>
            {contacts.map((c, i) => {
              const checked = selectedIds.includes(c.id)
              return (
                <motion.div 
                  key={c.id} 
                  className="conv-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleSelect(c.id)}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <div className="avatar avatar-md">{c.display_name?.[0]?.toUpperCase()}</div>
                  <div className="conv-item-info" style={{ flex: 1 }}>
                    <div className="conv-item-name">{c.display_name}</div>
                  </div>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--accent-1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: checked ? 'var(--accent-1)' : 'transparent',
                    color: '#fff', fontSize: 14, fontWeight: 'bold'
                  }}>
                    {checked && '✓'}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
