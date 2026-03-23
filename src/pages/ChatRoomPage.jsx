import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BiArrowBack, BiSend, BiImageAlt, BiMicrophone, BiPlus, BiCalendar, BiTimeFive } from 'react-icons/bi'
import { useAuthStore } from '../stores/authStore'
import { useMessagesStore } from '../stores/messagesStore'
import { useUIStore } from '../stores/uiStore'
import { FileLoader } from '../components/chat/FileLoader'
import { PollCreator, PollBubble } from '../components/chat/Polls'
import { EventBubble, CalendarModal, EventCreator } from '../components/chat/Events'
import { format } from 'date-fns'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function ChatRoomPage() {
  const { id: convId } = useParams()
  const navigate = useNavigate()
  const { user, keypair } = useAuthStore()
  const { messages, conversations, fetchMessages, sendMessage, sendFileMessage, subscribeToConversation, unsubscribe, reactToMessage } = useMessagesStore()
  const { replyToMessage, setReplyToMessage } = useUIStore()
  
  const [text, setText] = useState('')
  const [pickerMsgId, setPickerMsgId] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showEventCreator, setShowEventCreator] = useState(false)
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false)

  const msgsEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const pressTimer = useRef(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  
  const conv = conversations.find(c => c.id === convId)
  const roomMsgs = messages[convId] || []
  const otherMember = conv?.members?.find(m => m.profile?.id !== user?.id)
  const recipientProfile = otherMember?.profile

  useEffect(() => {
    if (convId && user && keypair) {
      if (conversations.length === 0) {
        useMessagesStore.getState().fetchConversations(user.id)
      }
      fetchMessages(convId, keypair, {})
      subscribeToConversation(convId, keypair, conv)
    }
    return () => unsubscribe()
  }, [convId, user, keypair, conv, conversations.length])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMsgs])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!text.trim()) return
    const content = text.trim()
    const currentReplyId = replyToMessage?.id
    setText('')
    setReplyToMessage(null)
    await sendMessage({
      convId,
      content,
      type: 'text',
      replyToId: currentReplyId,
      keypair,
      recipientProfile,
      conv,
      autoDeleteAt: autoDeleteEnabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
    })
  }

  const handlePointerDown = (msgId) => {
    pressTimer.current = setTimeout(() => {
      setPickerMsgId(msgId)
    }, 500) // 500ms long press
  }

  const handlePointerUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const handleReaction = async (msgId, emoji) => {
    setPickerMsgId(null)
    await reactToMessage(msgId, convId, emoji, user.id)
  }

  const closePicker = () => setPickerMsgId(null)

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await sendFileMessage({
      convId,
      fileBlob: file,
      mimeType: file.type,
      type: 'image',
      keypair,
      recipientProfile,
      conv
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      mediaRecorder.current.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        audioChunks.current = []
        await sendFileMessage({
          convId,
          fileBlob: audioBlob,
          mimeType: 'audio/webm',
          type: 'audio',
          keypair,
          recipientProfile,
          conv
        })
        stream.getTracks().forEach(t => t.stop()) // close mic
      }
      setIsRecording(true)
      setRecordingTime(0)
      audioChunks.current = []
      mediaRecorder.current.start()
    } catch (e) {
      console.error('Failed to start recording', e)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  useEffect(() => {
    let interval
    if (isRecording) interval = setInterval(() => setRecordingTime(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [isRecording])

  if (!conv || !user) return <div className="full-spinner"><div className="spinner" /></div>

  const displayName = conv.type === 'group' ? conv.name || 'Groupe' : recipientProfile?.display_name || 'Utilisateur'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header */}
      <header className="page-header" style={{ paddingBottom: 12 }}>
        <button className="btn-icon" onClick={() => navigate('/chat')} style={{ marginRight: 8 }}>
          <BiArrowBack />
        </button>
        <div className="avatar avatar-sm avatar-online">
          {displayName[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--accent-2)' }}>E2EE Actif 🔒</div>
        </div>
      </header>

      {/* Messages Wrapper */}
      <div 
        style={{ flex: 1, overflowY: 'auto', padding: '16px 0', scrollBehavior: 'smooth' }}
        onPointerDown={closePicker} // Click outside closes picker
      >
        {roomMsgs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <p>Début de la conversation chiffrée de bout en bout avec {displayName}.</p>
          </div>
        ) : (
          roomMsgs.filter(m => !m.auto_delete_at || new Date(m.auto_delete_at) > new Date()).map((msg, i) => {
            const isMe = msg.sender_id === user.id
            const showPicker = pickerMsgId === msg.id
            const repliedMsg = msg.reply_to_id ? roomMsgs.find(m => m.id === msg.reply_to_id) : null

            return (
              <motion.div 
                key={msg.id} 
                className={`bubble-row ${isMe ? 'me' : 'them'}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ marginTop: i > 0 && roomMsgs[i-1].sender_id !== msg.sender_id ? 12 : 2 }}
                // Swipe to reply
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(e, info) => {
                  if (Math.abs(info.offset.x) > 50) setReplyToMessage(msg)
                }}
              >
                {/* Swipe Indicator (opacity mapped conceptually, but simplified here) */}
                <div className="swipe-reply-indicator" style={{ opacity: 0 }}>↩</div>

                {!isMe && conv.type === 'group' && (
                  <div className="avatar avatar-sm" style={{ alignSelf: 'flex-end', width: 24, height: 24, fontSize: 10 }}>
                    {msg.sender?.display_name?.[0]?.toUpperCase()}
                  </div>
                )}
                
                <div 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}
                  onPointerDown={() => handlePointerDown(msg.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onContextMenu={(e) => { e.preventDefault(); setPickerMsgId(msg.id) }} // PC specific
                >
                  {showPicker && (
                    <motion.div 
                      className="reaction-picker"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                    >
                      {EMOJIS.map(e => (
                        <button key={e} onClick={(ev) => { ev.stopPropagation(); handleReaction(msg.id, e) }}>{e}</button>
                      ))}
                    </motion.div>
                  )}

                  <div className={`bubble ${isMe ? 'me' : 'them'}`}>
                    {repliedMsg && (
                      <div className="bubble-reply-preview" onClick={() => {
                        // In a real app we'd scroll to replied message
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)' }}>
                          {repliedMsg.sender_id === user.id ? 'Vous' : (repliedMsg.sender?.display_name || 'Utilisateur')}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {repliedMsg.decryptedContent || <span style={{ fontStyle:'italic' }}>Message chiffré</span>}
                        </div>
                      </div>
                    )}

                    {msg.type === 'poll' ? (
                      <PollBubble msg={msg} userId={user.id} />
                    ) : msg.type === 'event' ? (
                      <EventBubble msg={msg} />
                    ) : msg.type === 'image' || msg.type === 'audio' ? (
                      msg.decryptedContent ? (
                        <FileLoader msgPayload={msg.decryptedContent} type={msg.type} />
                      ) : (
                        <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Média chiffré illisible</span>
                      )
                    ) : (
                      <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {msg.decryptedContent || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Message chiffré illisible</span>}
                      </div>
                    )}
                    
                    <div className="bubble-time">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </div>
                  </div>

                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="bubble-reactions" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <div key={emoji} className="reaction-chip" onClick={() => handleReaction(msg.id, emoji)}>
                          {emoji} <span>{users.length}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={msgsEndRef} />
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {replyToMessage && (
          <div className="composer-reply">
            <div className="composer-reply-inner">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Réponse à {replyToMessage.sender_id === user.id ? 'Vous' : (replyToMessage.sender?.display_name || 'Utilisateur')}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {replyToMessage.decryptedContent || 'Message chiffré'}
                </div>
              </div>
              <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 16 }} onClick={() => setReplyToMessage(null)}>
                ×
              </button>
            </div>
          </div>
        )}
        
        {isRecording && (
          <div style={{ padding: '8px 16px', color: '#ff6b6b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 8, height: 8, borderRadius: 4, background: '#ff6b6b' }} />
            Enregistrement... 0:{recordingTime.toString().padStart(2, '0')}
          </div>
        )}

        {showPollCreator && (
          <PollCreator 
            convId={convId} 
            keypair={keypair} 
            recipientProfile={recipientProfile} 
            conv={conv} 
            onCancel={() => setShowPollCreator(false)} 
          />
        )}

        {showCalendarModal && (
          <CalendarModal 
            convId={convId} 
            msgs={roomMsgs} 
            onClose={() => setShowCalendarModal(false)}
            onOpenCreate={() => setShowEventCreator(true)}
          />
        )}

        {showEventCreator && (
          <EventCreator 
            convId={convId} 
            keypair={keypair} 
            recipientProfile={recipientProfile} 
            conv={conv} 
            onCancel={() => setShowEventCreator(false)}
          />
        )}

        <div className="composer">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleImageSelect}
          />
          <button 
            className="btn-icon" 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
            onClick={() => setShowPollCreator(!showPollCreator)}
            disabled={isRecording}
          >
            <BiPlus size={24} />
          </button>
          <button 
            className="btn-icon" 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording}
          >
            <BiImageAlt size={22} />
          </button>
          <textarea
            className="composer-input"
            placeholder={isRecording ? "" : "Message chiffré..."}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={1}
            disabled={isRecording}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); handleSend()
              }
            }}
          />
          {text.trim() || replyToMessage ? (
            <button className="composer-send" onClick={handleSend} disabled={isRecording}>
              <BiSend />
            </button>
          ) : (
            <button 
              className="btn-icon" 
              style={{ background: 'transparent', border: 'none', color: isRecording ? '#ff6b6b' : 'var(--text-secondary)' }}
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerCancel={stopRecording}
              onPointerLeave={stopRecording}
              onContextMenu={e => e.preventDefault()} // prevent context menu on long press
            >
              <BiMicrophone size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
