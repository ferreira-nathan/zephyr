import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BiCalendar, BiX, BiTime, BiDetail } from 'react-icons/bi'
import { useMessagesStore } from '../../stores/messagesStore'
import { format, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'

export function EventBubble({ msg }) {
  if (!msg.decryptedContent) return <div style={{ fontStyle: 'italic', opacity: 0.6 }}>Événement chiffré illisible</div>
  
  try {
    const event = JSON.parse(msg.decryptedContent)
    const startDate = new Date(event.startsAt)
    const isPast = !isAfter(startDate, new Date())

    return (
      <div style={{ width: 240, opacity: isPast ? 0.6 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ background: 'var(--accent-1)', color: '#fff', borderRadius: 8, padding: '4px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase' }}>{format(startDate, 'MMM', { locale: fr })}</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }}>{format(startDate, 'dd')}</div>
          </div>
          <div style={{ fontWeight: 'bold', fontSize: 15, flex: 1, wordBreak: 'break-word' }}>
            {event.title}
          </div>
        </div>
        
        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <BiTime /> {format(startDate, 'HH:mm')}
        </div>
        
        {event.description && (
          <div style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-secondary)', marginTop: 8 }}>
            <BiDetail style={{ marginTop: 2 }} />
            <span style={{ flex: 1, wordBreak: 'break-word' }}>{event.description}</span>
          </div>
        )}
      </div>
    )
  } catch (e) {
    return <div style={{ color: '#ff6b6b' }}>Événement corrompu</div>
  }
}

export function CalendarModal({ convId, msgs, onClose, onOpenCreate }) {
  // Extract all event messages
  const events = msgs
    .filter(m => m.type === 'event' && m.decryptedContent)
    .map(m => {
      try {
        const data = JSON.parse(m.decryptedContent)
        return { ...m, eventData: data, date: new Date(data.startsAt) }
      } catch { return null }
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date)

  const upcoming = events.filter(e => isAfter(e.date, new Date()))
  const past = events.filter(e => !isAfter(e.date, new Date()))

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
      <motion.div 
        className="modal"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
        style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BiCalendar /> Calendrier
          </h2>
          <button className="btn-icon" onClick={onClose}><BiX /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="section-label" style={{ paddingLeft: 0 }}>À venir</div>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Aucun événement prévu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcoming.map(e => (
                <div key={e.id} style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
                  <EventBubble msg={e} />
                </div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <>
              <div className="section-label" style={{ paddingLeft: 0, marginTop: 24 }}>Passés</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {past.map(e => (
                  <div key={e.id} style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
                    <EventBubble msg={e} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { onClose(); onOpenCreate(); }}>
          Nouvel Événement
        </button>
      </motion.div>
    </div>
  )
}

export function EventCreator({ convId, keypair, recipientProfile, conv, onCancel }) {
  const { sendMessage } = useMessagesStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() || !date || !time) return

    const startsAt = new Date(`${date}T${time}`).toISOString()
    
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      startsAt
    }

    await sendMessage({
      convId,
      content: JSON.stringify(eventData),
      type: 'event',
      keypair,
      recipientProfile,
      conv
    })
    
    onCancel()
  }

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 200 }}>
      <motion.div 
        className="modal"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Nouvel Événement</h2>
          <button className="btn-icon" onClick={onCancel}><BiX /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Titre</label>
          <input className="input" placeholder="Dîner, Réunion..." value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Heure</label>
            <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description (optionnel)</label>
          <textarea className="input" rows={3} placeholder="Détails, lieu..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: 8 }} 
          onClick={handleSubmit}
          disabled={!title.trim() || !date || !time}
        >
          Créer l'événement
        </button>
      </motion.div>
    </div>
  )
}
