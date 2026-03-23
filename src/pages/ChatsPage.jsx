import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BiPlus } from 'react-icons/bi'
import { useAuthStore } from '../stores/authStore'
import { useMessagesStore } from '../stores/messagesStore'

export function ChatsPage() {
  const { user } = useAuthStore()
  const { conversations, fetchConversations } = useMessagesStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) fetchConversations(user.id)
  }, [user])

  return (
    <>
      <header className="page-header">
        <h1>Chats</h1>
        <div className="page-header-actions">
          <button className="btn-icon" onClick={() => navigate('/new-group')} style={{ marginRight: 8 }}>
            👥
          </button>
          <button className="btn-icon" onClick={() => navigate('/contacts')}>
            <BiPlus />
          </button>
        </div>
      </header>
      
      <div className="conv-list">
        {conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>Aucune conversation</h3>
            <p>Allez dans Contacts pour scanner le QR code d'un ami.</p>
            <button className="btn btn-primary" onClick={() => navigate('/contacts')}>
              Voir mes contacts
            </button>
          </div>
        ) : (
          conversations.map((conv, i) => (
            <motion.div 
              key={conv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/chat/${conv.id}`} className="conv-item">
                <div className="avatar avatar-md avatar-online">
                  {conv.type === 'group' ? '👥' : conv.members?.find(m => m.profile?.id !== user.id)?.profile?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="conv-item-info">
                  <div className="conv-item-name">
                    {conv.type === 'group' 
                      ? conv.name || 'Groupe' 
                      : conv.members?.find(m => m.profile?.id !== user.id)?.profile?.display_name || 'Utilisateur'}
                  </div>
                  <div className="conv-item-preview">
                    Tap to view messages
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </>
  )
}
