import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

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
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Get the calling user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthenticated')

        // 2. Verify SuperAdmin Role (Strictly bounded to the real owner's email)
        const isSuperAdmin = user.email === 'lexagestaojuridica@gmail.com'
        if (!isSuperAdmin) {
            throw new Error('Forbidden: Only the Master Owner can impersonate tenants.')
        }

        const { target_user_id } = await req.json()
        if (!target_user_id) throw new Error('Missing target_user_id')

        // 3. Initialize Admin Client to bypass RLS and Auth rules
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 4. Fetch the target user's email using Admin API
        const { data: targetUserObj, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(target_user_id)

        if (fetchError || !targetUserObj.user) {
            throw new Error('Target user not found')
        }

        const targetEmail = targetUserObj.user.email
        if (!targetEmail) {
            throw new Error('Target user has no email registered')
        }

        // 5. Generate a Magic Link (Action Link) for the target user securely
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: targetEmail,
            options: {
                redirectTo: `${req.headers.get('origin') ?? 'http://localhost:5173'}/dashboard`
            }
        })

        if (linkError) {
            throw linkError
        }

        // Return the generated SSO link
        return new Response(
            JSON.stringify({
                action_link: linkData.properties.action_link,
                message: 'Impersonation link generated. Open it in an Incognito window to avoid losing your Admin session.'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
