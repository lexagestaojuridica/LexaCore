import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action } = await req.json();

    // Get stored tokens
    const { data: tokenRecord } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRecord) throw new Error("Google Calendar not connected");

    // Refresh access token if expired
    let accessToken = tokenRecord.access_token;
    if (new Date(tokenRecord.token_expires_at) <= new Date()) {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenRecord.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) throw new Error("Token refresh failed");

      accessToken = refreshData.access_token;
      const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      await supabaseAdmin
        .from("google_calendar_tokens")
        .update({ access_token: accessToken, token_expires_at: expiresAt })
        .eq("user_id", user.id);
    }

    if (action === "import") {
      // Fetch events from Google Calendar (next 30 days)
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const calendarId = tokenRecord.calendar_id || "primary";

      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now}&timeMax=${future}&singleEvents=true&orderBy=startTime&maxResults=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const gcalData = await gcalRes.json();
      if (!gcalRes.ok) throw new Error(`Google API error: ${gcalData.error?.message}`);

      const events = (gcalData.items || [])
        .filter((e: any) => e.start?.dateTime && e.end?.dateTime)
        .map((e: any) => ({
          title: e.summary || "Sem título",
          description: e.description || null,
          start_time: e.start.dateTime,
          end_time: e.end.dateTime,
          category: "compromisso",
          user_id: user.id,
          organization_id: tokenRecord.organization_id,
        }));

      if (events.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("eventos_agenda")
          .insert(events);
        if (insertError) throw insertError;
      }

      // Update last sync
      await supabaseAdmin
        .from("google_calendar_tokens")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ imported: events.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "export") {
      // Export local events to Google Calendar
      const calendarId = tokenRecord.calendar_id || "primary";

      const { data: localEvents } = await supabaseAdmin
        .from("eventos_agenda")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(50);

      let exported = 0;
      for (const ev of localEvents || []) {
        const gcalEvent = {
          summary: ev.title,
          description: ev.description || "",
          start: { dateTime: ev.start_time, timeZone: "America/Sao_Paulo" },
          end: { dateTime: ev.end_time, timeZone: "America/Sao_Paulo" },
        };

        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(gcalEvent),
          }
        );
        if (res.ok) exported++;
      }

      await supabaseAdmin
        .from("google_calendar_tokens")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ exported }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
