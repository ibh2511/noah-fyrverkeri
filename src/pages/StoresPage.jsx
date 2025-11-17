import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"

const CAMPAIGN_SLUG = "noah-fyrverkeri-2025"
const MESSAGE_TEMPLATE = `Hei Europris [[BUTIKKNAVN]]! 🐾\n\nJeg håper dere vil droppe salget av fyrverkeri i år. Det skaper panikk og skader for dyr, mennesker og natur – og flertallet i Norge ønsker strengere regler. Dere kan være forbildet som velger dyrevelferd og sikkerhet foran støy og søppel.\n\nLa nyttårsaften bli tryggere og roligere for alle ved å si nei til fyrverkerisalg. Det betyr enormt mye for oss som jobber for dyrene.\n\nHilsen [DITT NAVN]`

const HQ_CONTACT = {
  title: "Ta kontakt med hovedkontoret",
  body: [
    "Kommenter på fyrverkeri-postene deres på Facebook eller Instagram for 1 ekstra lodd.",
    "Jo flere ganger de hører fra oss, jo vanskeligere blir det å ignorere kampanjen.",
    "Send dem gjerne en ekstra mail når du har lagt igjen noen kommentarer.",
  ],
  email: "kundeservice@europris.no",
  messenger: "https://m.me/Europris",
  facebook: "https://www.facebook.com/Europris",
  instagram: "https://www.instagram.com/europris/",
  instagramDm: "https://www.instagram.com/direct/t/europris",
}

const POINTS_LIST = [
  "5 meldinger til forskjellige butikker = 1 lodd",
  "10 meldinger = 2 lodd",
  "15 meldinger = 3 lodd",
  "Kommenter på Europris hovedkontor sine fyrverkeri-poster = 1 lodd",
]

const HERO_PARAGRAPHS = [
  "Send korte, vennlige meldinger til Europris-butikkene og min dem på hvor store konsekvenser fyrverkeri har for dyr og mennesker.",
  "Listen under blir generert tilfeldig hver gang slik at alle butikker får oppmerksomhet.",
]

const SUBJECT_LINE = "🚫 Slutt å selge fyrverkeri"
const HQ_STORE_CODE = "hovedkontor"

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

async function fetchStoresByCodes(codes, chunkSize = 80) {
  const uniqueCodes = Array.from(new Set(codes)).filter(Boolean)
  const collected = []
  for (let i = 0; i < uniqueCodes.length; i += chunkSize) {
    const chunk = uniqueCodes.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from("europris_stores")
      .select(
        "source_code,name,frontend_name,city,street,region,postcode,email,phone,extension_attributes"
      )
      .in("source_code", chunk)
    if (error) {
      console.error("fetchStoresByCodes chunk error", { error, chunk })
      return { data: null, error }
    }
    if (data && data.length > 0) {
      collected.push(...data)
    }
  }
  return { data: collected, error: null }
}

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function slugifyStoreHandle(store) {
  const value =
    store?.frontend_name || store?.name || store?.source_code || "butikk"
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

function ensureHttps(url) {
  if (!url || typeof url !== "string") return ""
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function getMessengerLink(store, stats) {
  if (stats?.messenger_url) {
    const resolved = ensureHttps(stats.messenger_url)
    if (resolved) return resolved
  }
  const handle = slugifyStoreHandle(store)
  return `https://m.me/${handle || "Europris"}`
}

function getInstagramDmLink(store, stats) {
  if (stats?.insta_dm) {
    const resolved = ensureHttps(stats.insta_dm)
    if (resolved) return resolved
  }
  const handle = slugifyStoreHandle(store)
  return `https://www.instagram.com/direct/t/${handle || "Europris"}`
}

function formatAddress(store) {
  const line1 = store?.street || ""
  const line2 = [store?.postcode, store?.city].filter(Boolean).join(" ")
  return { line1, line2 }
}

export default function StoresPage() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [visitorId, setVisitorId] = useState("")
  const [copiedStoreCode, setCopiedStoreCode] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [visibleCount, setVisibleCount] = useState(15)

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

        const { data: storeRows, error: storesErr } = await fetchStoresByCodes(
          storeCodes
        )

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
  const visibleStores = stores.slice(0, visibleCount)
  const hasMore = visibleCount < storesCount

  return (
    <div className="stores-page">
      <div className="wrap stores-wrap">
        <Link to="/" className="stores-back-link">
          ← Tilbake til forsiden
        </Link>
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
              onClick={() => trackEvent("click_mail", HQ_STORE_CODE, "hq_mail")}
            >
              Send e-post til hovedkontoret
            </a>
            <a
              className="button"
              href={HQ_CONTACT.facebook}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackEvent("click_facebook", HQ_STORE_CODE, "hq_facebook")
              }
            >
              Europris på Facebook
            </a>
            <a
              className="button"
              href={HQ_CONTACT.instagram}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackEvent("click_instagram", HQ_STORE_CODE, "hq_instagram")
              }
            >
              Europris på Instagram
            </a>
          </div>
        </section>

        <section className="stores-grid-section">
          <header>
            <div>
              <p className="eyebrow">{storesCount} butikker</p>
              <h2>Butikker som fortsatt selger fyrverkeri</h2>
              <p className="stores-lead">
                Rekkefølgen endres for hver innlasting.
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
            <>
              <div className="stores-grid">
                {visibleStores.map((store) => {
                  const stats = store.stats || {}
                  const storeId = store.id ?? stats.store_id ?? null
                  const messengerUrl = getMessengerLink(store, stats)
                  const instagramDmUrl = getInstagramDmLink(store, stats)
                  const address = formatAddress(store)

                  return (
                    <article key={store.source_code} className="store-card">
                      <header>
                        {store.city && (
                          <p className="store-tag">{store.city}</p>
                        )}
                        <h3>{store.frontend_name || store.name}</h3>
                      </header>
                      <div className="store-address">
                        {address.line1 && <div>{address.line1}</div>}
                        {address.line2 && <div>{address.line2}</div>}
                      </div>

                      <div className="store-actions">
                        <a
                          className="store-btn store-btn--messenger"
                          href={messengerUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            trackEvent(
                              "messenger_click",
                              store.source_code,
                              messengerUrl,
                              storeId
                            )
                          }
                        >
                          Messenger
                        </a>
                        <a
                          className="store-btn store-btn--instagram"
                          href={instagramDmUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            trackEvent(
                              "instagram_dm_click",
                              store.source_code,
                              instagramDmUrl,
                              storeId
                            )
                          }
                        >
                          Insta DM
                        </a>
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
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: "2rem" }}>
                  <button
                    className="button btn-accent"
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 15)}
                  >
                    Vis flere butikker ({storesCount - visibleCount} gjenstår)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
