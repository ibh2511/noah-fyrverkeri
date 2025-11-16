// import-europris-stores.mjs
import fs from "fs"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Last inn miljøvariabler fra .env.local i denne mappa
dotenv.config({ path: "../../.env.local" })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i env.")
  process.exit(1)
}

// Service-role klient – BRUKES KUN I DETTE SCRIPTET, ALDRI I FRONTEND
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// 1) Les JSON-fil
const raw = fs.readFileSync("./europris-stores.json", "utf8")
const json = JSON.parse(raw)

// Forventer { stores: [ ... ] }
if (!json.stores || !Array.isArray(json.stores)) {
  console.error("JSON mangler 'stores'-array")
  process.exit(1)
}

const stores = json.stores

// 2) Map direkte til kolonnene i europris_stores
const rows = stores.map((s) => ({
  source_code: s.source_code,
  name: s.name,
  enabled: s.enabled ?? null,
  description: s.description ?? null,
  latitude: s.latitude ?? null,
  longitude: s.longitude ?? null,
  country_id: s.country_id ?? null,
  region_id: s.region_id ?? null,
  region: s.region ?? null,
  city: s.city ?? null,
  street: s.street ?? null,
  postcode: s.postcode ?? null,
  contact_name: s.contact_name ?? null,
  email: s.email ?? null,
  phone: s.phone ?? null,
  fax: s.fax ?? null,
  use_default_carrier_config: s.use_default_carrier_config ?? null,
  is_pickup_location_active: s.is_pickup_location_active ?? null,
  frontend_name: s.frontend_name ?? null,
  frontend_description: s.frontend_description ?? null,
  inventory_source_id: s.inventory_source_id ?? null,
  carrier_links: s.carrier_links ?? [],
  extension_attributes: s.extension_attributes ?? {},
}))

async function run() {
  console.log(`Skal importere ${rows.length} butikker...`)

  const chunkSize = 200
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const { error } = await supabase
      .from("europris_stores")
      .upsert(chunk, { onConflict: "source_code" })

    if (error) {
      console.error("Feil ved upsert:", error)
      process.exit(1)
    } else {
      console.log(
        `Importert ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`
      )
    }
  }

  console.log("Ferdig 🌱")
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
