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
      <main className="wrap" aria-labelledby="campaign-title">
        <section className="hero">
          <h1 id="campaign-title">🚫 Stopp fyrverkerisalget!</h1>
          <div className="lead">
            <p>
              Hvert år lider dyr på grunn av fyrverkeri. Derfor ønsker vi i{" "}
              <span className="brand">NOAH</span> å få{" "}
              <span className="brand">Europris</span> til å slutte å selge
              fyrverkeri – og vi er veldig takknemlige for at du vil være med i
              kampanjen.
            </p>
            <p>
              Kampanjen varer ut november. Hver uke trekker vi én vinner som får
              velge en valgfri premie i NOAH-nettbutikken (unntatt hvalgenseren
              og ulvegenseren). Jo mer du gjør, jo flere lodd får du – og jo
              større sjanse har du til å vinne.
            </p>
            <p>
              <strong>Slik får du lodd:</strong>
            </p>
            <ul>
              <li>Sender du e-post til alle Europris-butikkene: 1 lodd</li>
              <li>
                For meldinger til Europris-butikker på Facebook/Instagram:
                <ul>
                  <li>5 meldinger til 5 forskjellige butikker: 1 lodd</li>
                  <li>10 meldinger til 10 forskjellige butikker: 2 lodd</li>
                  <li>15 meldinger til 15 forskjellige butikker: 3 lodd</li>
                  <li>osv.</li>
                </ul>
              </li>
              <li>
                For hver kommentar du skriver på en fyrverkeri-relatert post fra
                Europris: 1 lodd (maks én kommentar per person per post)
              </li>
            </ul>
          </div>
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
