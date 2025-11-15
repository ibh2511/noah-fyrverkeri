import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import AdminPage from "./pages/AdminPage"
import RegisterPage from "./pages/RegisterPage"
import StoresPage from "./pages/StoresPage"

function App() {
  return (
    <BrowserRouter basename="/noah-fyrverkeri">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/registrer" element={<RegisterPage />} />
        <Route path="/butikker" element={<StoresPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
