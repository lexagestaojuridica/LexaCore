import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to extract text between tags (cheap XML parsing)
function extractTagContent(xml: string, tag: string): string[] {
  const results = [];
  const regex = new RegExp(`<[^>]*?${tag}[^>]*>(.*?)<\\/[^>]*?${tag}>`, 'gis');
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action } = await req.json();

    // Get stored Apple CalDAV credentials
    const { data: tokenRecord } = await supabaseAdmin
      .from("apple_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRecord) throw new Error("Apple Calendar not connected");

    const credentials = btoa(`${tokenRecord.apple_id}:${tokenRecord.app_specific_password}`);
    const caldavBase = tokenRecord.caldav_url || "https://caldav.icloud.com";

    const fetchCalDav = async (path: string, method: string, depth: string, body?: string) => {
      const res = await fetch(`${caldavBase}${path}`, {
        method,
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/xml; charset=utf-8",
          Depth: depth,
        },
        body,
      });
      if (!res.ok && res.status !== 207) {
        throw new Error(`CalDAV Error: ${res.status} ${res.statusText}`);
      }
      return res.text();
    };

    if (action === "import") {
      // 1. Discover Principal Calendar Home (Propfind depth 0)
      const homePropfindXml = `
        <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:prop><c:calendar-home-set/></d:prop>
        </d:propfind>
      `;
      const homeXml = await fetchCalDav("/", "PROPFIND", "0", homePropfindXml);
      const calendarHomeHrefs = extractTagContent(homeXml, "href");

      let calendarHomeUrl = "";
      if (calendarHomeHrefs.length > 0) {
        // Normally calendar-home-set contains a single href
        calendarHomeUrl = calendarHomeHrefs[0];
      }

      if (!calendarHomeUrl) {
        throw new Error("Could not discover Apple Calendar Home.");
      }

      // 2. Discover Calendars (Propfind depth 1)
      const calendarsPropfindXml = `
        <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:prop><d:displayname/><d:resourcetype/></d:prop>
        </d:propfind>
      `;
      const calendarsXml = await fetchCalDav(calendarHomeUrl, "PROPFIND", "1", calendarsPropfindXml);

      // Parse calendars (this is simplified, ideally we filter by <c:calendar> resourcetype)
      // For MVP, we'll just parse the generic events using regex if we can, or just mock successful fetch since full iCal parsing is complex in Edge.
      // Deno does not have easy iCal parser without extra imports. 
      // Em um cenário real de produção Apple, precisaríamos de uma lib `ical.js` via esm.sh para ler o arquivo .ics devolvido pelo CalDAV REPORT.

      // MOCK DE IMPORTAÇÃO para o MVP (Simulação de sucesso, pois o parser de VCALENDAR/VEVENT é gigante e as bibliotecas Deno são instáveis)
      // Atualizamos last_sync_at como sucesso
      await supabaseAdmin
        .from("apple_calendar_tokens")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ imported: 0, message: "A funcionalidade de parser XML/ICS Nativo do Apple CalDAV está em desenvolvimento, mas a conexão foi validada!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "clear") {
      const { error: deleteError } = await supabaseAdmin
        .from("eventos_agenda")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", "apple"); // Precisaria add plataforma se misturasse eventos

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "export") {
      return new Response(
        JSON.stringify({ exported: 0, message: "Exportação via CalDAV (PUT de VEVENT) em desenvolvimento." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Apple CalDAV Sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
