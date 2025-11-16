import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function SupabaseProbe() {
  const [status, setStatus] = useState("checking")
  const [detail, setDetail] = useState("")

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !anon) {
      setStatus("error")
      setDetail("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY")
      return
    }

    const testTable = import.meta.env.VITE_SUPABASE_TEST_TABLE || "campaigns"

    ;(async () => {
      try {
        const { error } = await supabase
          .from(testTable)
          .select("*", { count: "exact", head: true })

        if (error) {
          // Connectivity is fine if we reached Supabase; surface table error
          setStatus("warn")
          setDetail(
            `Connected, but query failed on table "${testTable}": ${error.message}`
          )
        } else {
          setStatus("ok")
          setDetail("Connected to Supabase and query succeeded")
        }
      } catch (e) {
        setStatus("error")
        setDetail(
          `Connection failed: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    })()
  }, [])

  const color =
    status === "ok" ? "#19d27e" : status === "warn" ? "#f0c04a" : "#ff6b6b"

  return (
    <p
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        margin: 0,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.25)",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 12,
        color: "#fff",
        zIndex: 100000,
      }}
    >
      <strong style={{ color }}>Supabase: {status}</strong>
      {detail ? <span> — {detail}</span> : null}
    </p>
  )
}
