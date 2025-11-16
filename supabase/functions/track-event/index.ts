// supabase/functions/track-event/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 🔐 Disse kommer fra Supabase "Secrets" (Project Settings → Functions → Secrets)
// NB: navnene er SB_URL og SB_SERVICE_ROLE_KEY (ikke SUPABASE_*)
const supabaseUrl = Deno.env.get("SB_URL")!
const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_KEY")!

// Service-role klient – brukes KUN her, aldri i frontend
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

type EventPayload = {
  eventType:
    | "pageview"
    | "click_mail"
    | "click_btn_mail"
    | "click_facebook"
    | "click_instagram"
  campaignSlug: string // f.eks. "noah-fyrverkeri-2024"
  storeCode?: string | null // "ep629" osv. (kan være null for pageview)
  visitorId?: string | null
  sessionId?: string | null
  path?: string | null
  linkTarget?: string | null
  referrer?: string | null
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() })
  }

  // Vi tillater kun POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
      },
    })
  }

  try {
    const body = (await req.json()) as EventPayload

    if (!body.eventType || !body.campaignSlug) {
      return new Response(
        JSON.stringify({ error: "Missing eventType or campaignSlug" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json",
          },
        }
      )
    }

    // 1) Finn campaign_id fra campaigns.slug
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id")
      .eq("slug", body.campaignSlug)
      .single()

    if (campErr || !campaign) {
      console.error("Fant ikke campaign:", campErr)
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json",
        },
      })
    }

    const campaignId = campaign.id as number
    const userAgent = req.headers.get("user-agent") || null

    // 2) Skriv event til events-tabellen
    const { error: insertErr } = await supabase.from("events").insert({
      event_type: body.eventType,
      campaign_id: campaignId,
      store_code: body.storeCode ?? null,
      visitor_id: body.visitorId ?? null,
      session_id: body.sessionId ?? null,
      path: body.path ?? null,
      link_target: body.linkTarget ?? null,
      user_agent: userAgent,
      referrer: body.referrer ?? null,
    })

    if (insertErr) {
      console.error("Feil ved insert i events:", insertErr)
      return new Response(JSON.stringify({ error: "Failed to insert event" }), {
        status: 500,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json",
        },
      })
    }

    // DB-triggeren handle_event_increment kjører nå og oppdaterer campaign_store_stats
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
      },
    })
  } catch (err) {
    console.error("Uventet feil i track-event:", err)
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
      },
    })
  }
})
