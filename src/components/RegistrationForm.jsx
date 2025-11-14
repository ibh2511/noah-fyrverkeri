import { useEffect, useRef, useState } from "react"
// Tilpass denne til der du har lagt CSS-en fra juletreff:
// import "../App.css"

// Lokale utility funksjoner
function setupFloatingLabels() {
  const FIELDS = ".form-group input, .form-group textarea"

  function toggleHasContent(field) {
    if (field.value.trim()) field.classList.add("has-content")
    else field.classList.remove("has-content")
  }

  const fields = Array.from(document.querySelectorAll(FIELDS))
  const cleanups = fields.map((field) => {
    const handler = () => toggleHasContent(field)
    handler() // initial sync
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
  // Simplified version - no backend tracking for now
  console.log("📊 Visitor tracking setup (simplified)")
  return { isFirstVisit: false, visitCount: 1, visitorId: "local-visitor" }
}

//const GAS_URL =
const IMAGES = ["images/kumi.jpeg", "images/munch.jpg"]

export default function RegistrationForm() {
  const [status, setStatus] = useState(null) // null | "ok" | "waitlist" | "duplicate" | "error"
  const [sending, setSending] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [visitorInfo, setVisitorInfo] = useState(null)
  const iframeRef = useRef(null)

  // Bilde-slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Floating labels, FAQ-accordion, visitor tracking
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

  // Lytte på Apps Script-respons (postMessage + iframe fallback)
  useEffect(() => {
    function onMessage(evt) {
      if (!/script\.google\.com|googleusercontent\.com/.test(evt.origin)) return

      const data = evt.data || {}
      setSending(false)

      if (data.duplicate) setStatus("duplicate")
      else if (data.ok && data.waitlist) setStatus("waitlist")
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

          if (
            bodyText.includes('"duplicate"') ||
            bodyText.includes("duplicate")
          ) {
            setSending(false)
            setStatus("duplicate")
          } else if (
            bodyText.includes('"waitlist"') &&
            bodyText.includes('"ok"')
          ) {
            setSending(false)
            setStatus("waitlist")
          } else if (
            bodyText.includes('"ok"') ||
            bodyText.includes("success")
          ) {
            setSending(false)
            setStatus("ok")
          } else if (
            bodyText.includes('"error"') ||
            bodyText.includes("error")
          ) {
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

  const handleFormSubmit = () => {
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
                bodyText.includes("waitlist") &&
                bodyText.includes("ok")
              ) {
                setSending(false)
                setStatus("waitlist")
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

  return (
    <>
      <div className="page">
        <div className="container">
          {/* Bilde med fade */}
          <div className="booking-image">
            {IMAGES.map((src, index) => (
              <img
                key={src}
                className={`booking-img ${
                  index === currentImageIndex ? "active" : ""
                }`}
                src={src}
                alt="Juletreff 2025"
                loading="lazy"
              />
            ))}
          </div>

          {/* Skjema */}
          <div className="booking-form">
            <h2>✨Juletreff på KUMI🥂</h2>
            <div className="subheader">19. desember kl 19.00</div>

            {status === "duplicate" && (
              <div className="msg error">
                <h3>⚠️ E-post allerede påmeldt!</h3>
                <p>Det ser ut til at denne e-posten er registrert.</p>
                <p>
                  Har du trykket{" "}
                  <a
                    href="https://www.facebook.com/events/664624256515915"
                    target="_blank"
                    rel="noreferrer"
                  >
                    «Skal»
                  </a>{" "}
                  på Facebook-eventet? 📅
                </p>
              </div>
            )}

            {status === "waitlist" && (
              <div className="msg wait">
                <h3>⚠️ Juletreffet er fullt</h3>
                <p>Du kan sette deg på venteliste ved å sende oss en e-post.</p>
                <p>
                  <a
                    href={`mailto:isabelle.haugan@gmail.com?subject=Venteliste%20juletreff%20KUMI%20🥂`}
                  >
                    Sett meg på venteliste 🥳
                  </a>
                </p>
              </div>
            )}

            {status === "ok" && (
              <div className="msg thanks">
                <h3>🎉 Takk for påmeldingen! 🎉</h3>
                <p>Bekreftelse sendt på e-post 📬</p>
                <p>
                  <small>Sjekk søppelpost/spam</small>
                </p>
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

            {/* Selve skjemaet */}
            <form
              action={GAS_URL}
              method="POST"
              target="hidden_iframe"
              onSubmit={handleFormSubmit}
              style={{ display: status ? "none" : "block" }}
            >
              <div className="form-group-row">
                <div className="form-group">
                  <input type="text" name="Fornavn" id="firstName" required />
                  <label htmlFor="firstName" className="form-label">
                    Navn
                  </label>
                </div>
                <div className="form-group">
                  <input type="text" name="Etternavn" id="lastName" required />
                  <label htmlFor="lastName" className="form-label">
                    Etternavn
                  </label>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <input type="tel" name="Telefon" id="phone" required />
                  <label htmlFor="phone" className="form-label">
                    Telefon
                  </label>
                </div>
                <div className="form-group">
                  <input type="email" name="Email" id="email" required />
                  <label htmlFor="email" className="form-label">
                    E-post
                  </label>
                </div>
              </div>

              <div className="form-group">
                <textarea name="Message" id="comment" rows="4"></textarea>
                <label htmlFor="comment" className="form-label">
                  Kommentar
                </label>
              </div>

              <div className="form-submit">
                <button type="submit" disabled={sending}>
                  {sending ? "Sender …" : "Send"}
                </button>
              </div>
            </form>
          </div>

          {/* Kart */}
          <div className="map-container">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7990.0!2d10.689846816215897!3d59.90700408187198!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x46416e62c48b6a31%3A0xdbadeeb694f9f437!2sOperagata%2071B%2C%200194%20Oslo!5e0!3m2!1sen!2sno!4v1600000000000!5m2!1sen!2sno"
              allowFullScreen=""
              loading="lazy"
              title="KUMI kart"
            />
          </div>

          {/* FAQ (du kan beholde resten her som i originalen) */}
          <div className="faq-section">
            <h3 style={{ textAlign: "center" }}>❓ FAQ</h3>

            {/* ... alle <details>-blokkene dine her ... */}
          </div>
        </div>
      </div>

      <div className="robot-footer" aria-hidden="true">
        🦾
      </div>
    </>
  )
}
