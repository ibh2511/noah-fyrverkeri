import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import AdminPage from "./pages/AdminPage"
import RegisterPage from "./pages/RegisterPage"
import StoresPage from "./pages/StoresPage"
import SiteFooter from "./components/SiteFooter"
import CampaignBanner from "./components/CampaignBanner"
import SupabaseProbe from "./components/SupabaseProbe"
import { useMemo } from "react"

function App() {
  return (
    <BrowserRouter basename="/noah-fyrverkeri">
      <div className="app-shell">
        <CampaignBanner />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/registrer" element={<RegisterPage />} />
            <Route path="/butikker" element={<StoresPage />} />
          </Routes>
        </div>
        <SiteFooter />
        {(() => {
          const showProbe = (() => {
            if (import.meta.env.DEV) return true
            try {
              const sp = new URLSearchParams(window.location.search)
              if (sp.get("debug") === "sb") return true
              // Also support hash query e.g. #/?debug=sb
              const hash = window.location.hash || ""
              if (hash.includes("debug=sb")) return true
            } catch {}
            return false
          })()
          return showProbe ? <SupabaseProbe /> : null
        })()}
      </div>
    </BrowserRouter>
  )
}

export default App
