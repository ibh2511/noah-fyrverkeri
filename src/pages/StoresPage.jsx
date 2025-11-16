import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "../supabaseClient"

const CAMPAIGN_SLUG = "noah-fyrverkeri-2025"
const MESSAGE_TEMPLATE = `Hei Europris [[BUTIKKNAVN]]! 🐾\n\nJeg håper dere vil droppe salget av fyrverkeri i år. Det skaper panikk og skader for dyr, mennesker og natur – og flertallet i Norge ønsker strengere regler. Dere kan være forbildet som velger dyrevelferd og sikkerhet foran støy og søppel.\n\nLa nyttårsaften bli tryggere og roligere for alle ved å si nei til fyrverkerisalg. Det betyr enormt mye for oss som jobber for dyrene.\n\nHilsen [DITT NAVN]`

const HQ_CONTACT = {
  title: "Ta kontakt med hovedkontoret",
  body: [
    "Send dem gjerne en ekstra melding når du har skrevet til noen butikker.",
    "Jo flere ganger de hører fra oss, jo vanskeligere blir det å ignorere kampanjen.",
    "Kommenter også på fyrverkeri-postene deres for 1 ekstra lodd hver gang.",
  ],
  email: "kundeservice@europris.no",
  messenger: "https://m.me/Europris",
  facebook: "https://www.facebook.com/Europris",
  instagram: "https://www.instagram.com/europris/",
}

const POINTS_LIST = [
  "5 meldinger til forskjellige butikker = 1 lodd",
  "10 meldinger = 2 lodd",
  "15 meldinger = 3 lodd",
  "Kommenter på Europris hovedkontor sine fyrverkeri-poster for 1 ekstra lodd",
]

const HERO_PARAGRAPHS = [
  "Send korte, vennlige meldinger til butikkene og min dem på hvor store konsekvenser fyrverkeri har for dyr og mennesker.",
  "Vi foreslår å starte med Europris-butikkene som fortsatt selger fyrverkeri. Listen under blir tilfeldig hver gang slik at alle butikker får oppmerksomhet.",
]

const SUBJECT_LINE = "🚫 Slutt å selge fyrverkeri"

async function fetchAllRows(createQuery, chunkSize = 1000) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await createQuery().range(
      from,
      from + chunkSize - 1
    )
    if (error) {
      return { data: null, error }
    }
    if (data && data.length > 0) {
      rows.push(...data)
    }
    if (!data || data.length < chunkSize) {
      break
    }
    from += chunkSize
  }
  return { data: rows, error: null }
}

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalizeUrl(url) {
  if (!url || typeof url !== "string") return ""
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function buildSocialUrl(candidates, platform) {
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (trimmed.includes(".") || trimmed.includes("/")) {
      return normalizeUrl(trimmed)
    }
    const handle = trimmed.replace(/^@/, "")
    if (!handle) continue
    if (platform === "instagram") {
      return `https://www.instagram.com/${handle}`
    }
    if (platform === "facebook") {
      return `https://www.facebook.com/${handle}`
    }
  }
  return ""
}

function formatAddress(store) {
  const parts = [store?.street, store?.postcode, store?.city]
  return parts.filter(Boolean).join(", ") || "Adresse ikke oppgitt"
}

export default function StoresPage() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [visitorId, setVisitorId] = useState("")
  const [copiedStoreCode, setCopiedStoreCode] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const isDebugSb = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get("debug") === "sb") return true
      const hash = new URLSearchParams(
        (window.location.hash || "").replace(/^#/, "")
      )
      if (hash.get("debug") === "sb") return true
    } catch {}
    return false
  }, [])

  useEffect(() => {
    const key = "visitorId"
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
      localStorage.setItem(key, id)
    }
    setVisitorId(id)
  }, [])

  const postFunction = useCallback(async (payload) => {
    const functionsUrl = `${
      import.meta.env.VITE_SUPABASE_URL
    }/functions/v1/track-event`
    const isGitHubPages = window.location.hostname.endsWith("github.io")
    if (isGitHubPages) {
      fetch(functionsUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
      return true
    }
    try {
      await supabase.functions.invoke("track-event", { body: payload })
      return true
    } catch {
      fetch(functionsUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
      return true
    }
  }, [])

  const trackEvent = useCallback(
    async (eventType, storeCode = null, linkTarget = null, storeId = null) => {
      if (isDebugSb) {
        if (import.meta.env.DEV) {
          console.info(
            "[debug=sb] tracking disabled",
            eventType,
            storeCode,
            linkTarget,
            storeId
          )
        }
        return
      }

      await postFunction({
        eventType,
        campaignSlug: CAMPAIGN_SLUG,
        visitorId,
        storeCode,
        storeId,
        path: window.location.pathname,
        linkTarget,
        referrer: document.referrer || null,
      })
    },
    [isDebugSb, postFunction, visitorId]
  )

  useEffect(() => {
    let isMounted = true
    async function loadStores() {
      setLoading(true)
      setError("")
      try {
        const { data: campaign, error: campErr } = await supabase
          .from("campaigns")
          .select("id")
          .eq("slug", CAMPAIGN_SLUG)
          .single()

        if (campErr || !campaign) {
          throw new Error("Fant ikke kampanjen i databasen.")
        }

        const { data: statsRows, error: statsErr } = await fetchAllRows(() =>
          supabase
            .from("campaign_store_stats")
            .select("*")
            .eq("campaign_id", campaign.id)
            .eq("sell_fireworks", true)
        )

        if (statsErr) {
          throw new Error("Klarte ikke hente butikkene akkurat nå.")
        }

        const storeCodes = (statsRows || [])
          .map((row) => row.store_code)
          .filter((code) => typeof code === "string" && code.trim().length > 0)

        if (storeCodes.length === 0) {
          if (isMounted) setStores([])
          return
        }

        const { data: storeRows, error: storesErr } = await supabase
          .from("europris_stores")
          .select(
            "id,source_code,name,frontend_name,city,street,region,postcode,email,phone,extension_attributes"
          )
          .in("source_code", storeCodes)

        if (storesErr) {
          throw new Error("Butikklisten kunne ikke lastes.")
        }

        const statsMap = new Map(
          (statsRows || []).map((row) => [row.store_code, row])
        )

        const combined = storeCodes
          .map((code) => {
            const store = (storeRows || []).find((s) => s.source_code === code)
            if (!store) return null
            return { ...store, stats: statsMap.get(code) || {} }
          })
          .filter(Boolean)

        if (isMounted) {
          setStores(shuffle(combined))
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Ukjent feil. Prøv igjen senere.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadStores()

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const handleCopyForStore = useCallback(
    async (store) => {
      const storeName = store?.frontend_name || store?.name || "butikken"
      const personalised = MESSAGE_TEMPLATE.replace("[[BUTIKKNAVN]]", storeName)
      try {
        await navigator.clipboard.writeText(personalised)
      } catch {
        const textarea = document.createElement("textarea")
        textarea.value = personalised
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        textarea.remove()
      }
      setCopiedStoreCode(store.source_code)
      window.setTimeout(() => setCopiedStoreCode(""), 1600)
      trackEvent(
        "copy_email_text",
        store.source_code,
        "store_message",
        store.id ?? store.stats?.store_id ?? null
      )
    },
    [trackEvent]
  )

  const storesCount = stores.length

  return (
    <div className="stores-page">
      <div className="wrap stores-wrap">
        <section className="stores-hero">
          <p className="eyebrow">Slik bruker du sosiale medier</p>
          <h1>Send melding til Europris-butikkene</h1>
          {HERO_PARAGRAPHS.map((text) => (
            <p key={text} className="stores-lead">
              {text}
            </p>
          ))}
          <ul className="impact-list">
            {POINTS_LIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="hq-card">
          <div>
            <p className="eyebrow">Ekstra trykk</p>
            <h2>{HQ_CONTACT.title}</h2>
            {HQ_CONTACT.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="hq-actions">
            <a
              className="button btn-accent"
              href={`mailto:${HQ_CONTACT.email}?subject=${encodeURIComponent(
                SUBJECT_LINE
              )}`}
              onClick={() => trackEvent("click_mail", null, "hq_mail")}
            >
              Send e-post til hovedkontoret
            </a>
            <a
              className="button"
              href={HQ_CONTACT.messenger}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_facebook", null, "hq_messenger")}
            >
              Send melding på Messenger
            </a>
            <a
              className="button"
              href={HQ_CONTACT.facebook}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_facebook", null, "hq_facebook")}
            >
              Besøk Europris på Facebook
            </a>
            <a
              className="button"
              href={HQ_CONTACT.instagram}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackEvent("click_instagram", null, "hq_instagram")
              }
            >
              Følg Europris på Instagram
            </a>
          </div>
        </section>

        <section className="stores-grid-section">
          <header>
            <div>
              <p className="eyebrow">{storesCount} butikker</p>
              <h2>Butikker som fortsatt selger fyrverkeri</h2>
              <p className="stores-lead">
                Rekkefølgen endres for hver innlasting slik at flere butikker
                får meldinger først.
              </p>
            </div>
            <button
              className="mini-btn"
              type="button"
              onClick={() => setRefreshKey((v) => v + 1)}
            >
              Last en ny rekkefølge
            </button>
          </header>

          {loading && <p className="stores-state">Laster butikker ...</p>}
          {error && !loading && (
            <div className="stores-state error">
              <p>{error}</p>
              <button
                type="button"
                className="mini-btn"
                onClick={() => setRefreshKey((v) => v + 1)}
              >
                Prøv igjen
              </button>
            </div>
          )}

          {!loading && !error && stores.length === 0 && (
            <p className="stores-state">Ingen butikker å vise akkurat nå.</p>
          )}

          {!loading && !error && stores.length > 0 && (
            <div className="stores-grid">
              {stores.map((store) => {
                const ext = store.extension_attributes || {}
                const stats = store.stats || {}
                const storeId = store.id ?? stats.store_id ?? null
                const facebookUrl = buildSocialUrl(
                  [
                    ext.facebook_url,
                    ext.facebook,
                    ext.facebook_page,
                    stats.facebook_url,
                    stats.facebook_page,
                    stats.facebook_handle,
                  ],
                  "facebook"
                )
                const instagramUrl = buildSocialUrl(
                  [
                    ext.instagram_url,
                    ext.instagram,
                    stats.instagram_url,
                    stats.instagram_handle,
                  ],
                  "instagram"
                )
                const hasFacebook = facebookUrl.length > 8
                const hasInstagram = instagramUrl.length > 8
                const emailHref = store.email
                  ? `mailto:${store.email}?subject=${encodeURIComponent(
                      SUBJECT_LINE
                    )}`
                  : null
                const phoneHref = store.phone
                  ? `tel:${store.phone.replace(/\s+/g, "")}`
                  : null

                return (
                  <article key={store.source_code} className="store-card">
                    <header>
                      <p className="store-tag">
                        {store.region || store.city || "Europris"}
                      </p>
                      <h3>{store.frontend_name || store.name}</h3>
                    </header>
                    <p className="store-address">{formatAddress(store)}</p>

                    <dl className="store-contact">
                      {store.email && (
                        <div>
                          <dt>E-post</dt>
                          <dd>
                            <a
                              href={emailHref}
                              className="store-contact-link"
                              onClick={() =>
                                trackEvent(
                                  "click_mail",
                                  store.source_code,
                                  store.email,
                                  storeId
                                )
                              }
                            >
                              {store.email}
                            </a>
                          </dd>
                        </div>
                      )}
                      {store.phone && (
                        <div>
                          <dt>Telefon</dt>
                          <dd>
                            <a
                              href={phoneHref}
                              className="store-contact-link"
                              onClick={() =>
                                trackEvent(
                                  "click_social_cta",
                                  store.source_code,
                                  store.phone,
                                  storeId
                                )
                              }
                            >
                              {store.phone}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="store-actions">
                      {hasFacebook && (
                        <a
                          className="store-btn store-btn--facebook"
                          href={facebookUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            trackEvent(
                              "click_facebook",
                              store.source_code,
                              facebookUrl,
                              storeId
                            )
                          }
                        >
                          Facebook
                        </a>
                      )}
                      {hasInstagram && (
                        <a
                          className="store-btn store-btn--instagram"
                          href={instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            trackEvent(
                              "click_instagram",
                              store.source_code,
                              instagramUrl,
                              storeId
                            )
                          }
                        >
                          Instagram
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className="store-copy"
                      onClick={() => handleCopyForStore(store)}
                    >
                      {copiedStoreCode === store.source_code
                        ? "Kopiert!"
                        : "Kopier melding til butikken"}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
