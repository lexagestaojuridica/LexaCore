import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Usamos Service Role Key para bypassar RLS na criação/update via Webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook received for user ${id} with type ${eventType}`);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const {
      id: clerkId,
      first_name,
      last_name,
      image_url,
      email_addresses
    } = evt.data;

    const email = email_addresses[0]?.email_address;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();

    const profileData = {
      user_id: clerkId,
      full_name: fullName || email,
      avatar_url: image_url,
      updated_at: new Date().toISOString(),
    };

    // UPSERT no banco (agora compatível com Clerk String ID)
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' });

    if (error) {
      console.error('Error upserting profile:', error);
      return new Response('Error updating database', { status: 500 });
    }

    return new Response('Profile synced', { status: 200 });
  }

  if (eventType === 'user.deleted') {
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', id);

    if (error) {
      console.error('Error deleting profile:', error);
      return new Response('Error updating database', { status: 500 });
    }

    return new Response('User deleted', { status: 200 });
  }

  return new Response('', { status: 200 });
}
