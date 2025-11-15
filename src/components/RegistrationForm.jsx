import { useEffect, useRef, useState } from "react"

// Lokale utility funksjoner (som du hadde)
function setupFloatingLabels() {
  const FIELDS = ".form-group input, .form-group textarea"

  function toggleHasContent(field) {
    if (field.value.trim()) field.classList.add("has-content")
    else field.classList.remove("has-content")
  }

  const fields = Array.from(document.querySelectorAll(FIELDS))
  const cleanups = fields.map((field) => {
    const handler = () => toggleHasContent(field)
    handler()
    field.addEventListener("input", handler)
    field.addEventListener("blur", handler)
    return () => {
      field.removeEventListener("input", handler)
      field.removeEventListener("blur", handler)
    }
  })
  return () => cleanups.forEach((off) => off())
}

function setupFaqAccordion() {
  const allDetails = document.querySelectorAll(".faq-section details")
  const cleanups = []

  allDetails.forEach((details) => {
    const summary = details.querySelector("summary")
    if (!summary) return

    const handler = (event) => {
      event.preventDefault()

      if (details.open) {
        details.open = false
        return
      }

      allDetails.forEach((otherDetails) => {
        if (otherDetails !== details && otherDetails.open) {
          otherDetails.open = false
        }
      })

      details.open = true
    }

    summary.addEventListener("click", handler)
    cleanups.push(() => summary.removeEventListener("click", handler))
  })

  return () => cleanups.forEach((off) => off())
}

function setupVisitorTracking() {
  console.log("📊 Visitor tracking setup (simplified)")
  return { isFirstVisit: false, visitCount: 1, visitorId: "local-visitor" }
}

// TODO: sett inn din ekte Apps Script URL her
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbz_iaoLpREXQjDHt4r0CJnyrzm-i15xU6hfKb1NM8u-v4Gd5tFdWB74rCGl1KuhfzVY/exec"

const IMAGES = [
  "https://images.unsplash.com/photo-1549068106-b024baf5062d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80",
]

// Lokale konstanter for lodd
const LOTTERY_ACTIONS = [
  {
    id: "MailAlle",
    label: "Sendt mail til alle Europris-butikkene",
    tickets: 1,
  },
  {
    id: "Meldinger5",
    label:
      "Sendt 5 meldinger til 10 Europris-butikker på Facebook eller Instagram",
    tickets: 1,
  },
  {
    id: "Meldinger10",
    label:
      "Sendt 10 meldinger til 10 Europris-butikker på Facebook eller Instagram",
    tickets: 2,
  },
  {
    id: "Meldinger15",
    label:
      "Sendt 15 meldinger til 15 Europris-butikker på Facebook eller Instagram",
    tickets: 3,
  },
  {
    id: "KommentarPost",
    label:
      "Kommentert på en fyrverkeri-relatert post til Europris på Facebook eller Instagram",
    tickets: 1,
  },
]

export default function RegistrationForm() {
  const [status, setStatus] = useState(null) // null | "ok" | "duplicate" | "error"
  const [sending, setSending] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [visitorInfo, setVisitorInfo] = useState(null)
  const [ukevalg, setUkevalg] = useState("")
  const [actions, setActions] = useState(() =>
    LOTTERY_ACTIONS.reduce(
      (acc, action) => ({ ...acc, [action.id]: false }),
      {}
    )
  )
  const [frontendLodd, setFrontendLodd] = useState(0)

  const iframeRef = useRef(null)

  // Bilde-slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Floating labels + visitor tracking (FAQ kan du bruke senere hvis du vil)
  useEffect(() => {
    const teardownLabels = setupFloatingLabels()
    const teardownFaq = setupFaqAccordion()
    const visitor = setupVisitorTracking()
    setVisitorInfo(visitor)

    return () => {
      teardownLabels?.()
      teardownFaq?.()
    }
  }, [])

  // Reberegn lodd lokalt når checkbokser endres
  useEffect(() => {
    const total = LOTTERY_ACTIONS.reduce((sum, action) => {
      return actions[action.id] ? sum + action.tickets : sum
    }, 0)
    setFrontendLodd(total)
  }, [actions])

  // Lytte på Apps Script-respons (postMessage + iframe fallback)
  useEffect(() => {
    function onMessage(evt) {
      if (!/script\.google\.com|googleusercontent\.com/.test(evt.origin)) return

      const data = evt.data || {}
      setSending(false)

      if (data.duplicate) setStatus("duplicate")
      else if (data.ok) setStatus("ok")
      else setStatus("error")
    }

    function checkIframeContent() {
      if (!iframeRef.current || !sending) return

      try {
        const iframeDoc =
          iframeRef.current.contentDocument ||
          iframeRef.current.contentWindow?.document

        if (iframeDoc) {
          const bodyText = iframeDoc.body?.innerText || ""

          if (bodyText.includes("duplicate")) {
            setSending(false)
            setStatus("duplicate")
          } else if (bodyText.includes("ok") || bodyText.includes("success")) {
            setSending(false)
            setStatus("ok")
          } else if (bodyText.includes("error")) {
            setSending(false)
            setStatus("error")
          }
        }
      } catch (error) {
        console.log("Iframe content check failed, using timeout fallback")
      }
    }

    window.addEventListener("message", onMessage)

    let pollInterval
    if (sending) {
      pollInterval = setInterval(checkIframeContent, 500)

      setTimeout(() => {
        if (sending) {
          setSending(false)
          setStatus("ok")
        }
      }, 10000)
    }

    return () => {
      window.removeEventListener("message", onMessage)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [sending])

  const handleFormSubmit = (e) => {
    // Frontend-validering: minst én handling + uke valgt
    if (!ukevalg) {
      e.preventDefault()
      alert("Velg hvilken uke innsatsen din gjelder.")
      return
    }
    if (frontendLodd === 0) {
      e.preventDefault()
      alert("Kryss av minst én handling for å få lodd.")
      return
    }

    setSending(true)

    if (iframeRef.current) {
      const handleIframeLoad = () => {
        setTimeout(() => {
          try {
            const iframeDoc =
              iframeRef.current?.contentDocument ||
              iframeRef.current?.contentWindow?.document
            if (iframeDoc) {
              const bodyText = iframeDoc.body?.innerText || ""

              if (bodyText.includes("duplicate")) {
                setSending(false)
                setStatus("duplicate")
              } else if (
                bodyText.includes("ok") ||
                bodyText.includes("success")
              ) {
                setSending(false)
                setStatus("ok")
              } else if (bodyText.includes("error")) {
                setSending(false)
                setStatus("error")
              }
            }
          } catch (error) {
            setTimeout(() => {
              if (sending) {
                setSending(false)
                setStatus("ok")
              }
            }, 5000)
          }
        }, 1000)
      }

      iframeRef.current.onload = handleIframeLoad
    }
  }

  const handleActionChange = (id) => {
    setActions((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="register-page">
      <div className="container">
        {/* Bilde/hero */}
        <div className="booking-image">
          {IMAGES.map((src, index) => (
            <img
              key={src}
              className={`booking-img ${
                index === currentImageIndex ? "active" : ""
              }`}
              src={src}
              alt="NOAH fyrverkerikampanje"
              loading="lazy"
            />
          ))}
        </div>

        {/* Skjema */}
        <div className="booking-form">
          <h2>🚫 Fyrverkeri – flere lodd, mer press</h2>
          <div className="subheader">
            Registrer innsatsen din mot Europris denne uka og få lodd i
            trekningen.
          </div>

          {status === "duplicate" && (
            <div className="msg error">
              <h3>⚠️ Allerede registrert denne uka</h3>
              <p>
                Denne e-posten er allerede registrert for valgt uke. Du kan
                delta på flere uker, men bare én gang per uke.
              </p>
            </div>
          )}

          {status === "ok" && (
            <div className="msg thanks">
              <h3>🎉 Takk – innsatsen din er registrert!</h3>
              <p>Du får en bekreftelse på e-post med antall lodd du har.</p>
            </div>
          )}

          {status === "error" && (
            <div className="msg error">
              <h3>⚠️ Noe gikk galt</h3>
              <p>Prøv igjen senere eller kontakt oss.</p>
            </div>
          )}

          {/* Skjult iframe: mottar Apps Script-responsen */}
          <iframe
            name="hidden_iframe"
            title="hidden_iframe"
            ref={iframeRef}
            style={{ display: "none", width: 0, height: 0, border: 0 }}
          />

          {GAS_URL ? (
            <form
              action={GAS_URL}
              method="POST"
              target="hidden_iframe"
              onSubmit={handleFormSubmit}
              style={{ display: status ? "none" : "block" }}
            >
              {/* Navn / etternavn / e-post */}
              <div className="form-group-row">
                <div className="form-group">
                  <input type="text" name="Fornavn" id="firstName" required />
                  <label htmlFor="firstName" className="form-label">
                    Fornavn
                  </label>
                </div>
                <div className="form-group">
                  <input type="text" name="Etternavn" id="lastName" required />
                  <label htmlFor="lastName" className="form-label">
                    Etternavn
                  </label>
                </div>
              </div>

              <div className="form-group">
                <input type="email" name="Email" id="email" required />
                <label htmlFor="email" className="form-label">
                  E-post
                </label>
              </div>

              {/* Ukevalg (radio) */}
              <div className="form-group">
                <div className="form-label-static">
                  Hvilken uke gjelder innsatsen?
                </div>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="Ukevalg"
                      value="UKE 1 (10–16. november)"
                      checked={ukevalg === "UKE 1 (10–16. november)"}
                      onChange={(e) => setUkevalg(e.target.value)}
                      required
                    />
                    <span>UKE 1 (10–16. november)</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="Ukevalg"
                      value="UKE 2 (17–23. november)"
                      checked={ukevalg === "UKE 2 (17–23. november)"}
                      onChange={(e) => setUkevalg(e.target.value)}
                    />
                    <span>UKE 2 (17–23. november)</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="Ukevalg"
                      value="UKE 3 (24–30. november)"
                      checked={ukevalg === "UKE 3 (24–30. november)"}
                      onChange={(e) => setUkevalg(e.target.value)}
                    />
                    <span>UKE 3 (24–30. november)</span>
                  </label>
                </div>
              </div>

              {/* Lodd-handlinger (checkbokser) */}
              <div className="form-group">
                <div className="form-label-static">
                  Hva har du gjort mot Europris? <br />
                  <small>
                    (kryss av alt som gjelder, lodd per handling står til høyre)
                  </small>
                </div>
                <div className="checkbox-group">
                  {LOTTERY_ACTIONS.map((action) => (
                    <label key={action.id} className="checkbox-option">
                      <input
                        type="checkbox"
                        name={action.id}
                        id={action.id}
                        checked={actions[action.id]}
                        onChange={() => handleActionChange(action.id)}
                      />
                      <span>
                        {action.label} <b>– {action.tickets} lodd</b>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Oppsummering av lodd */}
              <div className="lottery-summary">
                <p>
                  Du har foreløpig <b>{frontendLodd}</b>{" "}
                  {frontendLodd === 1 ? "lodd" : "lodd"} for valgt uke.
                </p>
              </div>

              <div className="form-submit">
                <button type="submit" disabled={sending}>
                  {sending ? "Sender…" : "Registrer lodd"}
                </button>
              </div>
            </form>
          ) : (
            <div className="msg error">
              <h3>⚠️ Skjema ikke konfigurert</h3>
              <p>Google Apps Script URL (GAS_URL) mangler i koden.</p>
            </div>
          )}
        </div>

        <div className="map-container" aria-label="Aktive byer kart">
          <iframe
            title="NOAH fyrverkerikart"
            src="https://www.openstreetmap.org/export/embed.html?bbox=4.3%2C58%2C31.5%2C71.5&layer=mapnik"
            loading="lazy"
          />
        </div>

        <section className="faq-section" aria-label="Ofte stilte spørsmål">
          <details open>
            <summary>
              Hvem kan registrere innsats?
              <span className="icon" aria-hidden="true"></span>
            </summary>
            <div className="faq-body">
              Alle frivillige som kontakter Europris på vegne av NOAH kan logge
              handlingene sine. Vi bruker innsendingene til å vise hvor trykket
              er størst og hvor vi trenger flere.
            </div>
          </details>
          <details>
            <summary>
              Hvordan teller lodd?
              <span className="icon" aria-hidden="true"></span>
            </summary>
            <div className="faq-body">
              Hver handling gir mellom ett og tre lodd. Vi trekker ukentlig og
              kontakter vinnerne på e-post. Du kan levere skjema én gang per uke
              per frivillig.
            </div>
          </details>
          <details>
            <summary>
              Hvor sendes dataen?
              <span className="icon" aria-hidden="true"></span>
            </summary>
            <div className="faq-body">
              Skjemaet går til Google Sheets via Apps Script. Data deles kun med
              kampanjeteamet og brukes til statistikk og premiering.
            </div>
          </details>
        </section>
      </div>

      <div className="robot-footer" aria-hidden="true">
        🦾
      </div>
    </div>
  )
}
