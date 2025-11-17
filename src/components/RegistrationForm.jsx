import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

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
  "https://script.google.com/macros/s/AKfycbzi9PovdqmMmo_t2gLGmko2uB4RE0t0jLgb-vAOQ4uggmfLp7LNyRlRsUoe6XDQgC75bA/exec"
// Removed hero images: registration page no longer displays slideshow

// Lokale konstanter for lodd
const LOTTERY_ACTIONS = [
  {
    id: "MailAlle",
    label: "Sendt mail til 100 Europris-butikker",
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
  // slideshow removed: no image state required
  const [visitorInfo, setVisitorInfo] = useState(null)
  const [ukevalg, setUkevalg] = useState("")
  const [actions, setActions] = useState(() =>
    LOTTERY_ACTIONS.reduce(
      (acc, action) => ({ ...acc, [action.id]: false }),
      {}
    )
  )
  const [frontendLodd, setFrontendLodd] = useState(0)

  // Control whether the server-side script should actually send emails.
  // Set `VITE_SEND_EMAILS=true` in your environment to enable (defaults to "false").
  const SEND_EMAILS =
    import.meta.env.VITE_SEND_EMAILS === "true" ? "true" : "false"

  const iframeRef = useRef(null)
  const resolvedRef = useRef(false)
  const [showStatus, setShowStatus] = useState(false)
  const statusTimerRef = useRef(null)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // image slideshow removed for registration page

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
      if (resolvedRef.current) return
      resolvedRef.current = true
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

        if (iframeDoc && !resolvedRef.current) {
          const bodyText = iframeDoc.body?.innerText || ""

          if (bodyText.includes("duplicate")) {
            resolvedRef.current = true
            setSending(false)
            setStatus("duplicate")
          } else if (bodyText.includes("ok") || bodyText.includes("success")) {
            resolvedRef.current = true
            setSending(false)
            setStatus("ok")
          } else if (bodyText.includes("error")) {
            resolvedRef.current = true
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
      // poll the iframe for content
      pollInterval = setInterval(checkIframeContent, 500)

      // final timeout: if nothing arrived, mark as ok only if not already resolved
      setTimeout(() => {
        if (sending && !resolvedRef.current) {
          resolvedRef.current = true
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

  // Animate status block: delay a short moment then reveal the message
  useEffect(() => {
    if (!status) {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
      setShowStatus(false)
      return
    }

    // hide first, then show after a short delay for a smooth reveal
    setShowStatus(false)
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => {
      setShowStatus(true)
      statusTimerRef.current = null
    }, 150)

    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
    }
  }, [status])

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

    // start a new submission; clear resolved flag so the first response wins
    resolvedRef.current = false
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

              if (resolvedRef.current) return

              if (bodyText.includes("duplicate")) {
                resolvedRef.current = true
                setSending(false)
                setStatus("duplicate")
              } else if (
                bodyText.includes("ok") ||
                bodyText.includes("success")
              ) {
                resolvedRef.current = true
                setSending(false)
                setStatus("ok")
              } else if (bodyText.includes("error")) {
                resolvedRef.current = true
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
    <div className="register-page-new">
      <div className="wrap register-wrap">
        <Link to="/" className="stores-back-link">
          ← Tilbake til forsiden
        </Link>

        <section className="register-hero">
          <p className="eyebrow">Loddtrekning</p>
          <h1>✒️ Send inn</h1>
          <p className="stores-lead">
            Registrer innsatsen din mot Europris denne uka og få lodd i
            trekningen.
          </p>
        </section>

        <section className="register-form-section">
          {status === "duplicate" && (
            <div
              className={`stores-state ${showStatus ? "visible" : "hidden"}`}
            >
              <h3>⚠️ Innsatsen din er alt registrert!</h3>
              <p>
                Vi ser at denne e-posten allerede er registrert for valgt uke.
                Takk for innsatsen!
              </p>
            </div>
          )}

          {status === "ok" && (
            <div
              className={`stores-state ${showStatus ? "visible" : "hidden"}`}
            >
              <h3>🎉 Takk – innsatsen din er registrert!</h3>
              <p>Du får en bekreftelse på e-post med antall lodd du har.</p>
            </div>
          )}

          {status === "error" && (
            <div
              className={`stores-state error ${
                showStatus ? "visible" : "hidden"
              }`}
            >
              <h3>⚠️ Noe gikk galt</h3>
              <p>Prøv igjen senere eller kontakt oss.</p>
            </div>
          )}

          <iframe
            name="hidden_iframe"
            title="hidden_iframe"
            ref={iframeRef}
            className="hidden-iframe"
          />

          {GAS_URL ? (
            <form
              action={GAS_URL}
              method="POST"
              target="hidden_iframe"
              onSubmit={handleFormSubmit}
              className={status ? "form-hidden" : ""}
            >
              {/* send runtime flag to Apps Script only when explicitly enabled in the build env */}
              {SEND_EMAILS === "true" && (
                <input type="hidden" name="SEND_EMAILS" value={SEND_EMAILS} />
              )}
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
                  Hva har du gjort? <br />
                  <small>(kryss av alt som gjelder)</small>
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
                <button
                  type="submit"
                  className="button btn-accent"
                  disabled={sending}
                >
                  {sending ? "Sender…" : "Registrer lodd"}
                </button>
              </div>
            </form>
          ) : (
            <div className="stores-state error">
              <h3>⚠️ Skjema ikke konfigurert</h3>
              <p>Google Apps Script URL (GAS_URL) mangler i koden.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
