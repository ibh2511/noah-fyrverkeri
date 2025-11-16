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
    | "bcc_mail_send"
    | "click_register"
    | "click_qr_download"
    | "click_social_cta"
    | "copy_email_text"
  campaignSlug: string // f.eks. "noah-fyrverkeri-2024"
  storeCode?: string | null // "ep629" osv. (kan være null for pageview)
  visitorId?: string | null
  sessionId?: string | null
  path?: string | null
  linkTarget?: string | null
  referrer?: string | null
  emails?: string[] // ved bcc_mail_send: liste av mottaker-eposter
}

function corsHeaders(req?: Request) {
  const acrh =
    req?.headers.get("Access-Control-Request-Headers") ||
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization, x-requested-with"
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": acrh,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) })
  }

  // Vi tillater kun POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      },
    })
  }

  // Allow apikey from query param (for no-cors clients) or header
  const url = new URL(req.url)
  const apikeyFromQuery = url.searchParams.get("apikey")
  if (apikeyFromQuery) {
    // Validate it's the anon key (optional check; Supabase will validate service actions)
    // For now, just accept it to allow no-cors requests
  }

  try {
    const body = (await req.json()) as EventPayload

    if (!body.eventType || !body.campaignSlug) {
      return new Response(
        JSON.stringify({ error: "Missing eventType or campaignSlug" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(req),
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
          ...corsHeaders(req),
          "Content-Type": "application/json",
        },
      })
    }

    const campaignId = campaign.id as number
    const userAgent = req.headers.get("user-agent") || null

    // 2) bcc_mail_send: slå opp butikker via epost og skriv én event per butikk
    if (body.eventType === "bcc_mail_send" && Array.isArray(body.emails)) {
      const rawEmails = body.emails
        .filter((e) => typeof e === "string")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)

      const unique = Array.from(new Set(rawEmails)).slice(0, 200)

      if (unique.length === 0) {
        return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
          status: 200,
          headers: {
            ...corsHeaders(req),
            "Content-Type": "application/json",
          },
        })
      }

      const { data: stores, error: storesErr } = await supabase
        .from("europris_stores")
        .select("source_code,email")
        .in("email", unique)

      if (storesErr) {
        console.error("Feil ved lookup av europris_stores:", storesErr)
        return new Response(
          JSON.stringify({ error: "Failed to resolve stores from emails" }),
          {
            status: 500,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          }
        )
      }

      const rows = (stores || []).map((s) => ({
        event_type: "bcc_mail_send",
        campaign_id: campaignId,
        store_code: s.source_code,
        visitor_id: body.visitorId ?? null,
        session_id: body.sessionId ?? null,
        path: body.path ?? null,
        link_target: body.linkTarget ?? null,
        user_agent: userAgent,
        referrer: body.referrer ?? null,
      }))

      if (rows.length > 0) {
        const { error: insertManyErr } = await supabase
          .from("events")
          .insert(rows)
        if (insertManyErr) {
          console.error("Feil ved batch insert i events:", insertManyErr)
          return new Response(
            JSON.stringify({ error: "Failed to insert bcc events" }),
            {
              status: 500,
              headers: {
                ...corsHeaders(req),
                "Content-Type": "application/json",
              },
            }
          )
        }
      }

      // DB-triggeren handle_event_increment oppdaterer campaign_store_stats.antall_mail_bcc
      return new Response(
        JSON.stringify({ ok: true, inserted: rows.length || 0 }),
        {
          status: 200,
          headers: {
            ...corsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      )
    }

    // 2b) Standard: skriv enkelt-event
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
          ...corsHeaders(req),
          "Content-Type": "application/json",
        },
      })
    }

    // DB-triggeren handle_event_increment kjører nå og oppdaterer campaign_store_stats
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      },
    })
  } catch (err) {
    console.error("Uventet feil i track-event:", err)
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      },
    })
  }
})
