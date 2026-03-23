import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useUIStore = create((set) => ({
  toast: null,
  showToast: (message, duration = 3000) => {
    set({ toast: message })
    setTimeout(() => set({ toast: null }), duration)
  },
  
  imgViewerSrc: null,
  openImgViewer: (src) => set({ imgViewerSrc: src }),
  closeImgViewer: () => set({ imgViewerSrc: null }),
  
  replyToMessage: null,
  setReplyToMessage: (msg) => set({ replyToMessage: msg }),
}))
