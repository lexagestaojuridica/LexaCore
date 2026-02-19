import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RSS_FEEDS = [
  { name: "ConJur", url: "https://www.conjur.com.br/rss.xml" },
  { name: "Migalhas", url: "https://www.migalhas.com.br/rss/quentes.xml" },
];

function extractImageFromContent(content: string): string | null {
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  const enclosureMatch = content.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosureMatch) return enclosureMatch[1];
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function extractFullContent(item: string): string {
  // Try content:encoded first (full article), then description
  const contentEncoded = item.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
  if (contentEncoded) return contentEncoded[1];
  const content = item.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
  if (content) return content[1];
  return "";
}

function parseRSSItems(xml: string, source: string) {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || "";
    const descriptionRaw = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] || "";
    const pubDate = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    const category = item.match(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/i)?.[1]?.trim() || "";

    const fullContentRaw = extractFullContent(item);
    
    // Try to find image from media:content, enclosure, content, or description
    let imageUrl = item.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1]
      || item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1]
      || item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i)?.[1]
      || extractImageFromContent(fullContentRaw || descriptionRaw)
      || null;

    const description = stripHtml(descriptionRaw).slice(0, 300);
    const fullContent = fullContentRaw || descriptionRaw;

    if (title) {
      items.push({
        title: stripHtml(title),
        link,
        description,
        fullContent,
        pubDate,
        source,
        category: category || null,
        imageUrl,
      });
    }
  }
  return items;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const allItems: any[] = [];

    const results = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(feed.url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LexaBot/1.0)' },
          });
          clearTimeout(timeout);
          if (!res.ok) return [];
          const xml = await res.text();
          return parseRSSItems(xml, feed.name);
        } catch {
          clearTimeout(timeout);
          return [];
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') allItems.push(...r.value);
    }

    // Sort by date descending
    allItems.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    });

    // Limit
    const limited = allItems.slice(0, 50);

    return new Response(JSON.stringify({ items: limited }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
