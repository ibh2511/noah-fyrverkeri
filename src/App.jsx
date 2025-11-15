import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import AdminPage from "./pages/AdminPage"
import RegisterPage from "./pages/RegisterPage"
import StoresPage from "./pages/StoresPage"
import SiteFooter from "./components/SiteFooter"

function App() {
  return (
    <BrowserRouter basename="/noah-fyrverkeri">
      <div className="app-shell">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/registrer" element={<RegisterPage />} />
            <Route path="/butikker" element={<StoresPage />} />
          </Routes>
        </div>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}

export default App
