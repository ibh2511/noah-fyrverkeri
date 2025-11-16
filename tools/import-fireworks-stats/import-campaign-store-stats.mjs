import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

// Finn rotmappa og last .env.local fra /noah-fyrverkeri/.env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootEnvPath = path.resolve(__dirname, "../../.env.local")

dotenv.config({ path: rootEnvPath })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CAMPAIGN_SLUG = process.env.CAMPAIGN_SLUG || "noah-fyrverkeri-2025"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local"
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function normalize(str) {
  return (str || "").toLowerCase().trim()
}

async function main() {
  console.log("🔭 Leser fireworks-stores.json ...")

  const jsonPath = path.resolve(__dirname, "fireworks-stores.json")
  const raw = fs.readFileSync(jsonPath, "utf8")
  const storeNames = JSON.parse(raw)

  if (!Array.isArray(storeNames) || storeNames.length === 0) {
    console.error(
      "❌ fireworks-stores.json må være en ikke-tom liste med butikknavn."
    )
    process.exit(1)
  }

  console.log(`📍 Antall butikker i fyrverkeri-lista: ${storeNames.length}`)

  // 1) Finn campaign_id basert på slug
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id")
    .eq("slug", CAMPAIGN_SLUG)
    .single()

  if (campErr || !campaign) {
    console.error(
      `❌ Fant ikke kampanje for slug='${CAMPAIGN_SLUG}' i campaigns-tabellen:`,
      campErr
    )
    process.exit(1)
  }

  const campaignId = campaign.id
  console.log(`✅ Bruker campaign_id=${campaignId} for slug='${CAMPAIGN_SLUG}'`)

  // 2) Hent alle butikker fra europris_stores (vi matcher lokalt på navn)
  const { data: allStores, error: storesErr } = await supabase
    .from("europris_stores")
    .select("source_code,name,frontend_name")

  if (storesErr) {
    console.error("❌ Feil ved henting av europris_stores:", storesErr)
    process.exit(1)
  }

  console.log(`🏬 Antall butikker i europris_stores: ${allStores.length}`)

  // Normaliser butikkutvalget
  const normalizedStores = allStores.map((s) => ({
    ...s,
    _name: normalize(s.name),
    _frontend: normalize(s.frontend_name),
  }))

  const rows = []
  const missing = []

  for (const rawName of storeNames) {
    const n = normalize(rawName)

    const matches = normalizedStores.filter(
      (s) => s._name === n || s._frontend === n
    )

    if (matches.length === 0) {
      missing.push(rawName)
      continue
    }

    if (matches.length > 1) {
      console.warn(
        `⚠️ Flere butikker matcher navnet '${rawName}', bruker første:`,
        matches.map((m) => m.source_code).join(", ")
      )
    }

    const store = matches[0]

    rows.push({
      campaign_id: campaignId,
      store_code: store.source_code,
      sell_fireworks: true,
      success: false,
    })
  }

  console.log(
    `✅ Antall butikker som matcher i europris_stores: ${rows.length}`
  )

  if (missing.length > 0) {
    console.warn(
      `⚠️ ${missing.length} butikker i lista ble ikke funnet i europris_stores (sjekk stavemåte/navn):`
    )
    missing.forEach((m) => console.warn("   -", m))
  }

  if (rows.length === 0) {
    console.error("❌ Ingen gyldige butikker å importere. Avbryter.")
    process.exit(1)
  }

  // 3) Upsert til campaign_store_stats (på campaign_id + store_code)
  const chunkSize = 200
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    console.log(
      `⬆️ Upserter rader ${i + 1}–${Math.min(i + chunkSize, rows.length)} ...`
    )

    const { error } = await supabase
      .from("campaign_store_stats")
      .upsert(chunk, {
        onConflict: "campaign_id,store_code",
      })

    if (error) {
      console.error("❌ Feil ved upsert til campaign_store_stats:", error)
      process.exit(1)
    }
  }

  console.log(
    "🎉 Ferdig! campaign_store_stats er oppdatert for alle fyrverkeri-butikker."
  )
  process.exit(0)
}

main().catch((err) => {
  console.error("❌ Uventet feil i import-script:", err)
  process.exit(1)
})
