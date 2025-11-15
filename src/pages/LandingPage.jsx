import { Link } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { CONTACT_EMAIL } from "../components/SiteFooter"

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

const NAV_LINKS = [
  {
    title: "Registrer innsats",
    copy: "Logg ukens aktiviteter og få lodd.",
    to: "/registrer",
    label: "Åpne skjema",
  },
  {
    title: "Butikker",
    copy: "Finn Europris-butikkene du skal kontakte.",
    to: "/butikker",
    label: "Se listen",
  },
  {
    title: "Admin",
    copy: "Se statistikk og klikkdata i sanntid.",
    to: "/admin",
    label: "Gå til admin",
  },
]

const CTA_BLOCKS = [
  {
    title: "Spre kampanjen",
    body: "Del NOAH sitt budskap på egne kanaler og tagg Europris for ekstra trykk.",
    actions: [
      {
        label: "Last ned grafikk",
        href: "https://www.noah.no/aktuelt/fyrverkeri/",
      },
      {
        label: "Ferdig tekst",
        href: "https://www.noah.no/aktuelt/fyrverkeri/",
      },
    ],
  },
  {
    title: "Kontakt lokal presse",
    body: "Pitch historien om hvorfor Europris må slutte å selge fyrverkeri i din kommune.",
    actions: [
      { label: "Last ned fakta", href: "https://www.noah.no/om-noah/presse" },
    ],
  },
  {
    title: "Planlegg neste uke",
    body: "Bruk aksjonsplanen så du vet hvilke butikker som får oppfølging.",
    actions: [{ label: "Åpne planen", href: "https://www.noah.no/stott-oss/" }],
  },
]

const CAMPAIGN_STATS = [
  { label: "Lokallag aktiv", value: "42" },
  { label: "Butikker kontaktet", value: "318" },
  { label: "Meldinger sendt", value: "1 540" },
]

export default function LandingPage() {
  const [imageIndex, setImageIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [copied, setCopied] = useState(false)
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
      <div className="top-meta-outer">
        <div className="top-meta">
          <div className="meta-line">
            🇳🇴 Trykkbølge: 150+ kommuner har fått NOAH-brev denne uka
          </div>
        </div>
      </div>

      <main className="wrap" aria-labelledby="campaign-title">
        <section className="hero">
          <h1 id="campaign-title">
            Stopp fyrverkerisalget <span className="brand">NOAH</span>
          </h1>
          <p className="lead">
            Vi legger press på <span className="brand">Europris</span> og andre
            kjeder for å få dem til å avslutte salget av fyrverkeri. Koordiner
            innsatsen, registrer aksjonene dine og få lodd i ukentlige
            trekninger for frivillige.
          </p>
          <img
            src={heroImage.src}
            alt={heroImage.alt}
            className={`hero-img ${isFading ? "is-fading" : ""}`}
            loading="lazy"
          />
        </section>

        <div className="btns">
          <Link className="button email-btn" to="/registrer">
            <span role="img" aria-hidden="true">
              📝
            </span>
            Registrer innsats nå
          </Link>
          <a className="button" href={`mailto:${CONTACT_EMAIL}`}>
            <span role="img" aria-hidden="true">
              ✉️
            </span>
            Send oppdatering på e-post
          </a>
          <Link className="button" to="/butikker">
            <span role="img" aria-hidden="true">
              🗺️
            </span>
            Finn din butikk-liste
          </Link>
          <Link className="button" to="/admin">
            <span role="img" aria-hidden="true">
              📊
            </span>
            Se statusdashboard
          </Link>
        </div>

        <p className="hint inline-email">
          Kontaktpunkt:{" "}
          <button
            type="button"
            className="copy-inline"
            onClick={handleCopyEmail}
          >
            {copied ? "Kopiert!" : CONTACT_EMAIL}
          </button>
        </p>

        <section className="info-panels" aria-label="Kampanjestatus">
          <article className="panel">
            <h2>Ukens fokus</h2>
            <p>
              Ta direkte kontakt med Europris-butikkene i region øst. Husk å
              loggføre alle meldinger, telefoner og e-poster i skjemaet slik at
              vi kan måle trykket.
            </p>
            <div className="progress-row">
              <span className="progress-chip">🎯 78 % av målet nådd</span>
              <span className="progress-chip">⏱️ 3 dager igjen</span>
            </div>
          </article>

          <article className="panel">
            <h2>Rask tilgang</h2>
            <div className="nav-grid">
              {NAV_LINKS.map((nav) => (
                <div key={nav.title} className="nav-card">
                  <div>
                    <h3>{nav.title}</h3>
                    <p>{nav.copy}</p>
                  </div>
                  <Link to={nav.to}>{nav.label}</Link>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="cta-grid" aria-label="Handlinger du kan ta nå">
          {CTA_BLOCKS.map((cta) => (
            <article key={cta.title} className="cta-card">
              <h3>{cta.title}</h3>
              <p>{cta.body}</p>
              <div className="cta-actions">
                {cta.actions.map((action) => (
                  <a
                    key={action.href}
                    className="mini-btn"
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section aria-label="Kampanjedata">
          <div className="stats-grid">
            {CAMPAIGN_STATS.map((stat) => (
              <div key={stat.label} className="stats-card">
                <div className="value">{stat.value}</div>
                <div className="label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="status">Live oppdateringer hver 6. time</div>
    </>
  )
}
