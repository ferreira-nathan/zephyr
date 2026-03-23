import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  encryptMessage, decryptMessage,
  encryptGroupMessage, decryptGroupMessage,
  loadGroupKey, encryptFile, decryptGroupKey, saveGroupKey
} from '../lib/crypto'

export const useMessagesStore = create((set, get) => ({
  conversations: [],
  messages: {},       // { conversationId: [msg, ...] }
  contacts: {},       // { userId: profile }
  activeConvId: null,
  realtimeSub: null,

  // ── Conversations ────────────────────────────────────────────
  fetchConversations: async (userId) => {
    const { data } = await supabase
      .from('conversation_members')
      .select(`
        conversation:conversations(
          id, type, name, avatar_url, created_at,
          members:conversation_members(user_id, role,
            profile:profiles(id, display_name, avatar_url, public_key))
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { referencedTable: 'conversations', ascending: false })

    if (data) {
      const convs = data.map(d => d.conversation).filter(Boolean)
      set({ conversations: convs })
    }
  },

  // ── Messages ─────────────────────────────────────────────────
  fetchMessages: async (convId, keypair, contacts) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, display_name, avatar_url, public_key)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!data) return

    const convs = get().conversations
    const conv = convs.find(c => c.id === convId)
    const isGroup = conv?.type === 'group'

    const decrypted = await Promise.all(data.map(async (msg) => {
      try {
        let plain = null
        if (msg.type === 'group_invite') {
          // Process group key distribution
          const map = JSON.parse(msg.ciphertext)
          const myKeyData = map[keypair.userId]
          if (myKeyData) {
            const groupKey = await decryptGroupKey(myKeyData.ciphertext, myKeyData.nonce, msg.sender.public_key, keypair.privateKey)
            if (groupKey) saveGroupKey(convId, groupKey)
          }
          return { ...msg, decryptedContent: 'Vous avez été ajouté au groupe.' }
        }

        if (isGroup) {
          const groupKey = loadGroupKey(convId)
          if (groupKey && msg.ciphertext && msg.iv && msg.iv !== 'none') {
            plain = await decryptGroupMessage(msg.ciphertext, msg.iv, groupKey)
          }
        } else {
          const senderProfile = msg.sender
          if (senderProfile && msg.ciphertext && msg.iv) {
            const senderPK = senderProfile.id === keypair?.userId
              ? keypair.publicKey
              : senderProfile.public_key
            if (senderPK) {
              plain = await decryptMessage(msg.ciphertext, msg.iv, senderPK, keypair.privateKey)
            }
          }
        }
        return { ...msg, decryptedContent: plain }
      } catch {
        return { ...msg, decryptedContent: null }
      }
    }))

    set(state => ({
      messages: { ...state.messages, [convId]: decrypted }
    }))
  },

  // ── Send Message ─────────────────────────────────────────────
  sendMessage: async ({ convId, content, type = 'text', replyToId = null, keypair, recipientProfile, conv, autoDeleteAt = null }) => {
    try {
      if (!keypair || !keypair.privateKey) throw new Error('Private key required to send')
      
      let ciphertext, iv
      
      if (conv.type === 'group') {
      const groupKey = loadGroupKey(convId)
      if (!groupKey) { console.error('No group key'); return }
      const enc = await encryptGroupMessage(content, groupKey)
      ciphertext = enc.ciphertext; iv = enc.nonce
    } else {
      if (!recipientProfile?.public_key) return
      const enc = await encryptMessage(content, recipientProfile.public_key, keypair.privateKey)
      ciphertext = enc.ciphertext; iv = enc.nonce
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: keypair.userId,
      ciphertext,
      iv,
        type,
        reply_to_id: replyToId,
        auto_delete_at: autoDeleteAt
      })

      if (error) throw error('Send error:', error)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  },

  // ── Send File Message ────────────────────────────────────────
  sendFileMessage: async ({ convId, fileBlob, mimeType, type = 'image', keypair, recipientProfile, conv }) => {
    const { encryptedBlob, keyB64, nonceB64 } = await encryptFile(fileBlob)
    const fileName = `${convId}/${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, encryptedBlob, { contentType: 'application/octet-stream' })
      
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { error: uploadError }
    }
    
    const content = JSON.stringify({
      path: fileName,
      mimeType,
      key: keyB64,
      nonce: nonceB64
    })
    
    await get().sendMessage({ convId, content, type, keypair, recipientProfile, conv })
  },

  // ── Realtime subscription ─────────────────────────────────────
  subscribeToConversation: (convId, keypair, conv) => {
    const existing = get().realtimeSub
    if (existing) { supabase.removeChannel(existing) }

    const channel = supabase
      .channel(`conv:${convId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        async (payload) => {
          const msg = payload.new
          // Fetch sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, public_key')
            .eq('id', msg.sender_id)
            .single()

          let plain = null
          try {
            if (msg.type === 'group_invite') {
              const map = JSON.parse(msg.ciphertext)
              const myKeyData = map[keypair.userId]
              if (myKeyData) {
                const groupKey = await decryptGroupKey(myKeyData.ciphertext, myKeyData.nonce, sender?.public_key, keypair.privateKey)
                if (groupKey) saveGroupKey(convId, groupKey)
              }
              plain = 'Vous avez été ajouté au groupe.'
            } else if (conv?.type === 'group') {
              const groupKey = loadGroupKey(convId)
              if (groupKey && msg.iv !== 'none') plain = await decryptGroupMessage(msg.ciphertext, msg.iv, groupKey)
            } else {
              const senderPK = sender?.id === keypair?.userId ? keypair.publicKey : sender?.public_key
              if (senderPK && msg.iv !== 'none') plain = await decryptMessage(msg.ciphertext, msg.iv, senderPK, keypair.privateKey)
            }
          } catch { }

          const enriched = { ...msg, sender, decryptedContent: plain }
          set(state => {
            const existing = state.messages[convId] || []
            // avoid duplicate
            if (existing.find(m => m.id === enriched.id)) return state
            return { messages: { ...state.messages, [convId]: [...existing, enriched] } }
          })
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          set(state => {
            const msgs = (state.messages[convId] || []).map(m =>
              m.id === payload.new.id ? { ...m, reactions: payload.new.reactions } : m
            )
            return { messages: { ...state.messages, [convId]: msgs } }
          })
        }
      )
      .subscribe()

    set({ realtimeSub: channel })
  },

  unsubscribe: () => {
    const sub = get().realtimeSub
    if (sub) supabase.removeChannel(sub)
    set({ realtimeSub: null })
  },

  // ── React to a message ────────────────────────────────────────
  reactToMessage: async (msgId, convId, emoji, userId) => {
    const msgs = get().messages[convId] || []
    const msg = msgs.find(m => m.id === msgId)
    if (!msg) return
    const reactions = { ...(msg.reactions || {}) }
    if (!reactions[emoji]) reactions[emoji] = []
    if (reactions[emoji].includes(userId)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId)
      if (reactions[emoji].length === 0) delete reactions[emoji]
    } else {
      reactions[emoji] = [...reactions[emoji], userId]
    }
    await supabase.from('messages').update({ reactions }).eq('id', msgId)
  },

  setActiveConv: (id) => set({ activeConvId: id }),
}))
