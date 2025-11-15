import { useState } from "react"

export const CONTACT_EMAIL = "fyrverkeri@noah.no"
const LAST_UPDATED = "15. november 2025"

export default function SiteFooter() {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.error("Klarte ikke kopiere e-post", error)
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-robot" role="img" aria-label="robotarm">
          🦾
        </div>
        <div className="footer-stats">
          Oppdatert {LAST_UPDATED} · Kontakt{" "}
          <button
            type="button"
            className="copy-inline"
            onClick={handleCopyEmail}
          >
            {copied ? "Kopiert!" : CONTACT_EMAIL}
          </button>
        </div>
        <a
          className="fb-share"
          href="https://www.facebook.com/sharer/sharer.php?u=https://ibh2511.github.io/noah-fyrverkeri/"
          target="_blank"
          rel="noreferrer"
        >
          <span className="fb-icon" role="img" aria-hidden="true">
            🔗
          </span>
          Del kampanjen
        </a>
      </div>
    </footer>
  )
}
