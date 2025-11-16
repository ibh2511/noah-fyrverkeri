import { Link } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { CONTACT_EMAIL } from "../components/SiteFooter"
import { supabase } from "../supabaseClient"

const DEFAULT_BCC_RECIPIENTS =
  "isabelle.haugan@gmail.com,postkasse2511@gmail.com"
const CAMPAIGN_SLUG = "noah-fyrverkeri-2025"

const HERO_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80",
    alt: "Himmel fylt med fyrverkeri",
  },
  {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    alt: "Frivillige som deler ut kampanjemateriell",
  },
]

export default function LandingPage() {
  const [imageIndex, setImageIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bccRecipients, setBccRecipients] = useState(DEFAULT_BCC_RECIPIENTS)
  const fadeTimeout = useRef(null)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIsFading(true)
      fadeTimeout.current = window.setTimeout(() => {
        setImageIndex((prev) => (prev + 1) % HERO_IMAGES.length)
        setIsFading(false)
      }, 320)
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
      if (fadeTimeout.current) window.clearTimeout(fadeTimeout.current)
    }
  }, [])

  // Fetch up to 100 store emails that sell fireworks for the campaign
  useEffect(() => {
    let isMounted = true
    async function loadBcc() {
      try {
        const { data: campaign, error: campErr } = await supabase
          .from("campaigns")
          .select("id")
          .eq("slug", CAMPAIGN_SLUG)
          .single()
        if (campErr || !campaign) return

        const { data: stats, error: statsErr } = await supabase
          .from("campaign_store_stats")
          .select("store_code")
          .eq("campaign_id", campaign.id)
          .eq("sell_fireworks", true)
        if (statsErr || !stats || stats.length === 0) return

        const storeCodes = Array.from(
          new Set(stats.map((s) => s.store_code).filter(Boolean))
        )
        if (storeCodes.length === 0) return

        // Fetch emails for these stores
        const { data: stores, error: storesErr } = await supabase
          .from("europris_stores")
          .select("email")
          .in("source_code", storeCodes)
        if (storesErr || !stores) return

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const emails = Array.from(
          new Set(
            stores
              .map((s) => s.email)
              .filter((e) => typeof e === "string" && emailRegex.test(e))
          )
        ).slice(0, 100)

        if (isMounted && emails.length > 0) {
          setBccRecipients(emails.join(","))
        }
      } catch {
        // Ignore and keep fallback
      }
    }
    loadBcc()
    return () => {
      isMounted = false
    }
  }, [])

  // IAB: adjust link (strip body) and toggle hints; run on mount only
  useEffect(() => {
    const isIAB = /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(
      navigator.userAgent
    )
    if (!isIAB) return

    const mailA = document.getElementById("mailLink")
    if (mailA) {
      const subj = encodeURIComponent(
        "🚫 Oppfordring om å slutte med salg av fyrverkeri!"
      )
      mailA.setAttribute("href", `mailto:?bcc=${bccRecipients}&subject=${subj}`)
    }

    const pOrig = document.getElementById("emailHintOrig")
    const pIab = document.getElementById("emailHintIAB")
    if (pOrig) pOrig.hidden = true
    if (pIab) pIab.hidden = false

    const MAIL_BODY = `Hei! 🐾

Jeg tar kontakt fordi dere selger fyrverkeri, og ønsker å oppfordre dere til å slutte med dette. 

Hvert år forårsaker fyrverkeri panikk og skader hos både dyr og mennesker, og det har store, negative konsekvenser for natur og miljø. For noen gir det et kort øyeblikk av glede, men for mange andre skaper det frykt, lidelse og skade. Flertallet av nordmenn ønsker å forby privat oppskytning av fyrverkeri. Nå har dere muligheten til å lytte til folket og ta et tydelig, etisk standpunkt for dyrene, menneskene og miljøet ved å slutte med salg av fyrverkeri 🐶

La nyttårsaften bli en tryggere, renere og inkluderende feiring for alle. Dere kan gjøre en viktig forskjell!

Med vennlig hilsen
[ DITT_NAVN ] ❓`

    const copyBtn = document.getElementById("copyFullEmail")
    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(MAIL_BODY)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      } catch {
        const ta = document.createElement("textarea")
        ta.value = MAIL_BODY
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        ta.remove()
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    })

    copyBtn?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        copyBtn.click()
      }
    })
  }, [])

  // When BCC list changes and we're in IAB, update the link
  useEffect(() => {
    const isIAB = /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(
      navigator.userAgent
    )
    if (!isIAB) return
    const mailA = document.getElementById("mailLink")
    if (mailA) {
      const subj = encodeURIComponent(
        "🚫 Oppfordring om å slutte med salg av fyrverkeri!"
      )
      mailA.setAttribute("href", `mailto:?bcc=${bccRecipients}&subject=${subj}`)
    }
  }, [bccRecipients])

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error("Klarte ikke kopiere e-post", error)
    }
  }

  const heroImage = HERO_IMAGES[imageIndex]

  return (
    <>
      <main className="wrap" aria-labelledby="campaign-title">
        <section className="hero">
          <h1 id="campaign-title">🚫 Stopp Fyrverkerisalget!</h1>
          <img
            src={heroImage.src}
            alt={heroImage.alt}
            className={`hero-img ${isFading ? "is-fading" : ""}`}
            loading="lazy"
          />
          <div className="lead">
            <p>
              Hvert år lider dyr på grunn av fyrverkeri. Derfor ønsker vi i NOAH
              å få <span className="brand">Europris</span> til å slutte å selge
              fyrverkeri – og vi er veldig takknemlige for at du vil være med i
              kampanjen.
            </p>
            <p className="lead-italic">
              Kampanjen varer ut november. Hver uke trekker vi én vinner som får
              velge en valgfri premie i NOAH-nettbutikken (unntatt hvalgenseren
              og ulvegenseren). Jo mer du gjør, jo flere lodd får du – og jo
              større sjanse har du til å vinne.
            </p>
            <details className="lottery-details">
              <summary>Slik får du lodd:</summary>
              <div className="lottery-content">
                <ul>
                  <li>Send e-post til 100 Europris-butikker: 1 lodd</li>
                  <li>
                    For meldinger til Europris-butikker på Facebook/Instagram:
                    <ul>
                      <li>5 meldinger til 5 forskjellige butikker: 1 lodd</li>
                      <li>10 meldinger til 10 forskjellige butikker: 2 lodd</li>
                      <li>15 meldinger til 15 forskjellige butikker: 3 lodd</li>
                    </ul>
                  </li>
                  <li>
                    For hver kommentar du skriver på en fyrverkeri-relatert post
                    fra Europris: 1 lodd (maks én kommentar per person per post)
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </section>

        <div className="btns">
          <div className="btn-group">
            <a
              className="button btn-accent"
              id="mailLink"
              href={`mailto:?bcc=${bccRecipients}&subject=${encodeURIComponent(
                "🚫 Oppfordring om å slutte med salg av fyrverkeri!"
              )}&body=${encodeURIComponent(`Hei! 🐾

Jeg tar kontakt fordi dere selger fyrverkeri, og ønsker å oppfordre dere til å slutte med dette. 

Hvert år forårsaker fyrverkeri panikk og skader hos både dyr og mennesker, og det har store, negative konsekvenser for natur og miljø. For noen gir det et kort øyeblikk av glede, men for mange andre skaper det frykt, lidelse og skade. Flertallet av nordmenn ønsker å forby privat oppskytning av fyrverkeri. Nå har dere muligheten til å lytte til folket og ta et tydelig, etisk standpunkt for dyrene, menneskene og miljøet ved å slutte med salg av fyrverkeri 🐶

La nyttårsaften bli en tryggere, renere og inkluderende feiring for alle. Dere kan gjøre en viktig forskjell!

Med vennlig hilsen
[ DITT_NAVN ] ❓`)}`}
            >
              Send e-post til 100 butikker
            </a>
            <p className="hint" id="emailHintOrig">
              Trykk på knappen for å sende e-post til butikkene
            </p>
            <p className="hint inline-email" id="emailHintIAB" hidden>
              <span
                id="copyFullEmail"
                className="copy-badge"
                role="button"
                tabIndex={0}
              >
                📋 Kopier ferdig tekst
              </span>
              &nbsp;og trykk på knappen for å sende e-post til{" "}
              <strong>Europris-butikkene</strong>
            </p>
          </div>

          <div className="btn-group">
            <Link className="button btn-accent" to="/butikker">
              Send melding på Facebook/Instagram
            </Link>
            <p className="hint">
              Vi gir deg liste over butikker og ferdig melding å dele
            </p>
          </div>

          <div className="btn-group">
            <Link className="button" to="/registrer">
              Registrer din innsats
            </Link>
            <p className="hint">
              Fortell oss hva du har gjort så får du lodd i trekningen
            </p>
          </div>

          <div className="btn-group">
            <a
              className="button"
              href="/noah-fyrverkeri/images/qr-lockscreen.png"
              download
            >
              Last ned låseskjermbilde med QR-kode
            </a>
            <p className="hint">
              Sett som bakgrunnsbilde og spre kampanjen videre
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
