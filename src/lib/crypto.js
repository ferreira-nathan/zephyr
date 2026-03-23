import sodium from 'libsodium-wrappers'

let _ready = false

export async function initCrypto() {
  if (_ready) return
  await sodium.ready
  _ready = true
}

/** Generate a new X25519 keypair and return { publicKey, privateKey } as base64 */
export async function generateKeypair() {
  await initCrypto()
  const kp = sodium.crypto_box_keypair()
  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  }
}

/** Encrypt a message for a recipient. Returns { ciphertext, nonce } as base64 */
export async function encryptMessage(plaintext, recipientPublicKeyB64, senderPrivateKeyB64) {
  await initCrypto()
  const recipientPK = sodium.from_base64(recipientPublicKeyB64)
  const senderSK = sodium.from_base64(senderPrivateKeyB64)
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
  const message = sodium.from_string(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext))
  const ciphertext = sodium.crypto_box_easy(message, nonce, recipientPK, senderSK)
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  }
}

/** Decrypt a message. Returns the plaintext string */
export async function decryptMessage(ciphertextB64, nonceB64, senderPublicKeyB64, recipientPrivateKeyB64) {
  await initCrypto()
  const ct = sodium.from_base64(ciphertextB64)
  const nonce = sodium.from_base64(nonceB64)
  const senderPK = sodium.from_base64(senderPublicKeyB64)
  const recipientSK = sodium.from_base64(recipientPrivateKeyB64)
  try {
    const plaintext = sodium.crypto_box_open_easy(ct, nonce, senderPK, recipientSK)
    return sodium.to_string(plaintext)
  } catch {
    return null // decryption failed
  }
}

/** Encrypt a group message with a group symmetric key */
export async function encryptGroupMessage(plaintext, groupKeyB64) {
  await initCrypto()
  const key = sodium.from_base64(groupKeyB64)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const message = sodium.from_string(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext))
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key)
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  }
}

/** Decrypt a group message with a group symmetric key */
export async function decryptGroupMessage(ciphertextB64, nonceB64, groupKeyB64) {
  await initCrypto()
  const ct = sodium.from_base64(ciphertextB64)
  const nonce = sodium.from_base64(nonceB64)
  const key = sodium.from_base64(groupKeyB64)
  try {
    const plaintext = sodium.crypto_secretbox_open_easy(ct, nonce, key)
    return sodium.to_string(plaintext)
  } catch {
    return null
  }
}

/** Generate a random group symmetric key */
export async function generateGroupKey() {
  await initCrypto()
  return sodium.to_base64(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES))
}

/** Encrypt a group key for a specific member (using their public key) */
export async function encryptGroupKeyForMember(groupKeyB64, memberPublicKeyB64, senderPrivateKeyB64) {
  return encryptMessage(groupKeyB64, memberPublicKeyB64, senderPrivateKeyB64)
}

/** Decrypt a group key received from another member */
export async function decryptGroupKey(ciphertextB64, nonceB64, senderPublicKeyB64, recipientPrivateKeyB64) {
  return decryptMessage(ciphertextB64, nonceB64, senderPublicKeyB64, recipientPrivateKeyB64)
}

// ── File encryption (Images, Audio) ──────────────────────────────

export async function encryptFile(fileBlob) {
  await initCrypto()
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  
  const buffer = await fileBlob.arrayBuffer()
  const message = new Uint8Array(buffer)
  
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key)
  
  return {
    encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    keyB64: sodium.to_base64(key),
    nonceB64: sodium.to_base64(nonce)
  }
}

export async function decryptFile(encryptedBlob, keyB64, nonceB64, mimeType) {
  await initCrypto()
  try {
    const key = sodium.from_base64(keyB64)
    const nonce = sodium.from_base64(nonceB64)
    
    const buffer = await encryptedBlob.arrayBuffer()
    const ciphertext = new Uint8Array(buffer)
    
    const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key)
    return new Blob([plaintext], { type: mimeType })
  } catch (error) {
    console.error('Failed to decrypt file:', error)
    return null
  }
}

// ── Local key storage ────────────────────────────────────────────
const KEY_STORE = 'zephyr_keys'

export function saveKeypair(userId, publicKey, privateKey) {
  const store = JSON.parse(localStorage.getItem(KEY_STORE) || '{}')
  store[userId] = { publicKey, privateKey }
  localStorage.setItem(KEY_STORE, JSON.stringify(store))
}

export function loadKeypair(userId) {
  const store = JSON.parse(localStorage.getItem(KEY_STORE) || '{}')
  return store[userId] || null
}

export function saveGroupKey(groupId, groupKey) {
  const storeKey = `zephyr_group_keys`
  const store = JSON.parse(localStorage.getItem(storeKey) || '{}')
  store[groupId] = groupKey
  localStorage.setItem(storeKey, JSON.stringify(store))
}

export function loadGroupKey(groupId) {
  const store = JSON.parse(localStorage.getItem('zephyr_group_keys') || '{}')
  return store[groupId] || null
}
