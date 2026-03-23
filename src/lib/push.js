import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BNKETw7DrI3j3B2CsgTVG0SEnencIokZCvYP8ju5DQ6Bv9vNqEKbHvj89zkzdxJGS5va2wIw8qiLjEBGV56TjmY'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeUserToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      // Subscribe the user
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    const { endpoint, keys } = subscription.toJSON()
    
    // Save to Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }, { onConflict: 'user_id, endpoint' })

    if (error) throw error
    
    return subscription
  } catch (err) {
    console.error('Failed to subscribe user to push:', err)
    return null
  }
}

export async function unsubscribeUserFromPush(userId) {
  if (!('serviceWorker' in navigator)) return
  
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  
  if (subscription) {
    await subscription.unsubscribe()
    // Remove from Supabase
    await supabase
      .from('push_subscriptions')
      .delete()
      .match({ user_id: userId, endpoint: subscription.endpoint })
  }
}
