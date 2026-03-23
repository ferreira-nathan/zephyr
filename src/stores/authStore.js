import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { generateKeypair, saveKeypair, loadKeypair } from '../lib/crypto'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  keypair: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().loadProfile(session.user)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().loadProfile(session.user)
      } else {
        set({ user: null, profile: null, keypair: null })
      }
    })
  },

  loadProfile: async (user) => {
    // Load or create E2EE keypair
    let kp = loadKeypair(user.id)
    if (!kp) {
      kp = await generateKeypair()
      saveKeypair(user.id, kp.publicKey, kp.privateKey)
    }

    // Fetch profile from DB
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Upsert profile with public key (always keep public key fresh)
    if (!profile || profile.public_key !== kp.publicKey) {
      const { data: upserted } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: profile?.display_name || user.email?.split('@')[0] || 'Utilisateur',
          avatar_url: profile?.avatar_url || null,
          public_key: kp.publicKey,
        })
        .select()
        .single()
      profile = upserted
    }

    set({ user, profile, keypair: { ...kp, userId: user.id } })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, keypair: null })
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) set({ profile: data })
    return { error }
  },
}))
