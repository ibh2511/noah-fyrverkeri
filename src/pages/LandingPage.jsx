import { Link } from "react-router-dom"

export default function LandingPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>NOAH – fyrverkerikampanje</h1>
      <p>Her kommer kampanjesiden (klikksporing med Supabase).</p>

      <nav
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h3>Navigasjon:</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "0.5rem" }}>
            <Link to="/" style={{ color: "#007bff", textDecoration: "none" }}>
              🏠 Hjem (LandingPage)
            </Link>
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <Link
              to="/admin"
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              👥 Admin
            </Link>
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <Link
              to="/registrer"
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              📝 Registrer
            </Link>
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <Link
              to="/butikker"
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              🏪 Butikker
            </Link>
          </li>
        </ul>

        <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
          <p>
            <strong>URL-formater med HashRouter:</strong>
          </p>
          <ul>
            <li>
              Hjem: <code>https://ibh2511.github.io/noah-fyrverkeri/#/</code>
            </li>
            <li>
              Admin:{" "}
              <code>https://ibh2511.github.io/noah-fyrverkeri/#/admin</code>
            </li>
            <li>
              Registrer:{" "}
              <code>https://ibh2511.github.io/noah-fyrverkeri/#/registrer</code>
            </li>
            <li>
              Butikker:{" "}
              <code>https://ibh2511.github.io/noah-fyrverkeri/#/butikker</code>
            </li>
          </ul>
        </div>
      </nav>
    </main>
  )
}
