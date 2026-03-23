import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from "https://esm.sh/web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { record } = payload // From DB Webhook

    if (!record) throw new Error('No record found')

    // 1. Get sender info
    const { data: sender } = await supabaseClient
      .from('profiles')
      .select('display_name')
      .eq('id', record.sender_id)
      .single()

    // 2. Get recipients (members of the conversation except sender)
    const { data: members } = await supabaseClient
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', record.conversation_id)
      .neq('user_id', record.sender_id)

    if (!members || members.length === 0) return new Response('No recipients', { status: 200 })

    const recipientIds = members.map(m => m.user_id)

    // 3. Get push subscriptions
    const { data: subscriptions } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', recipientIds)

    if (!subscriptions || subscriptions.length === 0) return new Response('No subscriptions', { status: 200 })

    // 4. Configure web-push
    webpush.setVapidDetails(
      'mailto:admin@zephyr.app',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const notificationPayload = JSON.stringify({
      title: sender?.display_name || 'Nouveau message',
      body: '🔒 Message chiffré reçu',
      url: `/chat/${record.conversation_id}`
    })

    // 5. Send pushes
    const pushPromises = subscriptions.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }
      return webpush.sendNotification(pushConfig, notificationPayload)
        .catch(err => {
          console.error('Push failed for sub:', sub.id, err)
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired, should delete
            return supabaseClient.from('push_subscriptions').delete().eq('id', sub.id)
          }
        })
    })

    await Promise.all(pushPromises)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
