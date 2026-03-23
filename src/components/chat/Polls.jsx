import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BiPlus, BiX, BiPieChartAlt } from 'react-icons/bi'
import { useMessagesStore } from '../../stores/messagesStore'

export function PollCreator({ convId, keypair, recipientProfile, conv, onCancel }) {
  const { sendMessage } = useMessagesStore()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const handleAddOption = () => {
    if (options.length < 5) setOptions([...options, ''])
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    const validOptions = options.filter(o => o.trim() !== '')
    if (!question.trim() || validOptions.length < 2) return

    const pollData = {
      question: question.trim(),
      options: validOptions.map((text, i) => ({ id: i.toString(), text }))
    }

    await sendMessage({
      convId,
      content: JSON.stringify(pollData),
      type: 'poll',
      keypair,
      recipientProfile,
      conv
    })
    
    onCancel()
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
      style={{
        position: 'absolute', bottom: '100%', left: 0, right: 0, 
        background: 'var(--bg-secondary)', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', zIndex: 10
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BiPieChartAlt /> Créer un Sondage (E2EE)
        </h3>
        <button className="btn-icon" onClick={onCancel} style={{ padding: 4 }}><BiX /></button>
      </div>

      <input 
        className="input" 
        placeholder="Posez votre question..." 
        value={question} 
        onChange={e => setQuestion(e.target.value)}
        style={{ marginBottom: 16 }}
        autoFocus
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input 
              className="input" 
              placeholder={`Option ${i + 1}`} 
              value={opt} 
              onChange={e => handleOptionChange(i, e.target.value)}
              style={{ flex: 1, padding: '8px 12px' }}
            />
            {options.length > 2 && (
              <button className="btn-icon" onClick={() => handleRemoveOption(i)} style={{ color: 'var(--text-secondary)' }}>
                <BiX />
              </button>
            )}
          </div>
        ))}
        {options.length < 5 && (
          <button 
            className="btn btn-secondary" 
            onClick={handleAddOption}
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <BiPlus /> Ajouter option
          </button>
        )}
      </div>

      <button 
        className="btn btn-primary" 
        onClick={handleSubmit} 
        style={{ width: '100%' }}
        disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
      >
        Envoyer le sondage
      </button>
    </motion.div>
  )
}

export function PollBubble({ msg, userId }) {
  const { reactToMessage } = useMessagesStore()
  
  if (!msg.decryptedContent) return <div style={{ fontStyle: 'italic', opacity: 0.6 }}>Sondage chiffré illisible</div>
  
  try {
    const poll = JSON.parse(msg.decryptedContent)
    const reactions = msg.reactions || {}
    
    // Calculate total votes
    let totalVotes = 0
    poll.options.forEach(opt => {
      totalVotes += (reactions[`poll_${opt.id}`] || []).length
    })

    const handleVote = (optionId) => {
      // In a real app we might want to restrict to 1 vote per user, 
      // but here we just toggle the specific option.
      reactToMessage(msg.id, msg.conversation_id, `poll_${optionId}`, userId)
    }

    return (
      <div style={{ width: 240 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 12, fontSize: 15 }}>📊 {poll.question}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {poll.options.map(opt => {
            const votes = reactions[`poll_${opt.id}`] || []
            const hasVoted = votes.includes(userId)
            const percentage = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0
            
            return (
              <div 
                key={opt.id} 
                onClick={() => handleVote(opt.id)}
                style={{
                  position: 'relative',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: hasVoted ? '1px solid var(--accent-1)' : '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {/* Progress Bar Background */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, 
                    background: hasVoted ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255,255,255,0.05)',
                    zIndex: 0
                  }}
                />
                
                {/* Content */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: hasVoted ? 'bold' : 'normal' }}>{opt.text}</span>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{votes.length > 0 ? `${votes.length} (${percentage}%)` : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8, textAlign: 'right' }}>
          {totalVotes} vote{totalVotes > 1 ? 's' : ''}
        </div>
      </div>
    )
  } catch (e) {
    return <div style={{ color: '#ff6b6b' }}>Sondage corrompu</div>
  }
}
