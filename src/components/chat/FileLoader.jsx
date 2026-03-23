import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { decryptFile } from '../../lib/crypto'
import { motion } from 'framer-motion'
import { BiPlay, BiPause } from 'react-icons/bi'

export function FileLoader({ msgPayload, type }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url = null
    async function load() {
      try {
        const payload = JSON.parse(msgPayload)
        
        // 1. Download encrypted blob
        const { data, error: dlError } = await supabase.storage
          .from('media')
          .download(payload.path)

        if (dlError) throw dlError

        // 2. Decrypt it
        const decryptedBlob = await decryptFile(data, payload.key, payload.nonce, payload.mimeType)
        if (!decryptedBlob) throw new Error('Decryption failed')

        // 3. Create URL
        url = URL.createObjectURL(decryptedBlob)
        setObjectUrl(url)
      } catch (err) {
        console.error('Failed to load media:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [msgPayload])

  if (loading) {
    return (
      <div style={{ width: 200, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    )
  }

  if (error || !objectUrl) {
    return (
      <div style={{ padding: 12, background: 'rgba(255,0,0,0.1)', color: '#ff6b6b', borderRadius: 12, fontSize: 13 }}>
        ⚠️ Média chiffré illisible
      </div>
    )
  }

  if (type === 'image') {
    return (
      <img 
        src={objectUrl} 
        alt="Image E2EE" 
        style={{ width: '100%', maxWidth: 280, borderRadius: 12, cursor: 'pointer', objectFit: 'cover' }}
        onClick={() => {
          // Future: open fullscreen viewer
          window.open(objectUrl, '_blank')
        }}
      />
    )
  }

  if (type === 'audio') {
    return (
      <audio controls src={objectUrl} style={{ maxWidth: 240, height: 40 }} />
    )
  }

  return null
}
