-- 8. DATABASE WEBHOOK FOR PUSH
-- This will call the Supabase Edge Function whenever a new message is inserted.
-- Note: Replace 'URL_DE_VOTRE_FONCTION' with your actual function URL after deployment.

-- First, ensure the net extension is enabled (for http calls)
-- CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

/*
-- Trigger to notify on new messages
CREATE OR REPLACE FUNCTION public.on_new_message_push()
RETURNS TRIGGER AS $$
BEGIN
  -- We use the supabase edge function call
  PERFORM
    net.http_post(
      url := 'https://epphxuqucguwivgxpnut.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::jsonb->>'apikey'
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_message_push
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.on_new_message_push();
*/

-- NOTE: Instead of raw SQL for the webhook, it's often easier to use the 
-- Supabase Dashboard -> Database -> Webhooks UI.
-- This SQL is provided as a reference.
