import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { generateGroupKey, encryptGroupKeyForMember, saveGroupKey } from '../lib/crypto'

export const useContactsStore = create((set, get) => ({
  contacts: [],    // Array of full profiles of people we have a conversation with
  loading: false,

  fetchContacts: async (userId) => {
    set({ loading: true })
    
    // Pour simplifier en Phase 1: nos contacts sont tous les gens avec qui 
    // on partage une conversation de type 'direct'
    const { data } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        conversation:conversations!inner(type),
        user_id
        // On va devoir récupérer les profils séparément ou via une vue
      `)
      .eq('user_id', userId)

    if (data && data.length > 0) {
      const convIds = data.filter(d => d.conversation.type === 'direct').map(d => d.conversation_id)
      if (convIds.length > 0) {
        const { data: others } = await supabase
          .from('conversation_members')
          .select('user_id, profile:profiles(*)')
          .in('conversation_id', convIds)
          .neq('user_id', userId)
          
        if (others) {
          // deduplicate
          const uniqueContacts = Array.from(new Map(others.map(c => [c.user_id, c.profile])).values())
          set({ contacts: uniqueContacts })
        }
      }
    }
    set({ loading: false })
  },
  
  createConversationFromContact: async (myUserId, contactId) => {
     // Check if direct conv already exists
     const { data: existing } = await supabase.rpc('get_direct_conversation', {
       user1_id: myUserId,
       user2_id: contactId
     })
     
     if (existing && existing.length > 0) return existing[0].id
     
      // Otherwise create new
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ type: 'direct' })
        .select()
        .single()

      if (error || !newConv) {
        alert("Erreur création conversation: " + (error?.message || "Inconnue"));
        console.error("Error creating conversation:", error);
        return null;
      }
     
     // Add members
     const { error: memberError } = await supabase.from('conversation_members').insert([
       { conversation_id: newConv.id, user_id: myUserId, role: 'admin' },
       { conversation_id: newConv.id, user_id: contactId, role: 'member' }
     ])
     
     if (memberError) {
       alert("Erreur membres: " + memberError.message + " (Contact ID: " + contactId + ")");
       return null;
     }
     
     return newConv.id;
  },

  createGroupConversation: async (myUserId, myKeyPair, name, memberIds) => {
    // 1. Generate new group symmetric key
    const groupKeyB64 = await generateGroupKey()

    // 2. Create group conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ type: 'group', name, created_by: myUserId })
      .select()
      .single()

    if (error || !newConv) return null

    // 3. Insert members
    const membersData = [
      { conversation_id: newConv.id, user_id: myUserId, role: 'admin' },
      ...memberIds.map(id => ({ conversation_id: newConv.id, user_id: id, role: 'member' }))
    ]
    await supabase.from('conversation_members').insert(membersData)

    // 4. Save key locally for admin
    saveGroupKey(newConv.id, groupKeyB64)

    // 5. Compute individually encrypted keys for each member to distribute
    const groupKeyMap = {}
    const contacts = get().contacts
    for (const id of memberIds) {
      const contact = contacts.find(c => c.id === id)
      if (contact && contact.public_key) {
        const encKey = await encryptGroupKeyForMember(groupKeyB64, contact.public_key, myKeyPair.privateKey)
        groupKeyMap[id] = encKey // { ciphertext, nonce }
      }
    }

    // 6. Send initial system message containing the encrypted keys
    await supabase.from('messages').insert({
      conversation_id: newConv.id,
      sender_id: myUserId,
      type: 'group_invite',
      ciphertext: JSON.stringify(groupKeyMap),
      iv: 'none'
    })

    return newConv.id
  }
}))
