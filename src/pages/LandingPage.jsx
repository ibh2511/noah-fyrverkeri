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
      </main>
    </>
  )
}
