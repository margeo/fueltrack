import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/.netlify/functions/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "list-users" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleFlag(userId, flag, currentValue) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/.netlify/functions/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "update-user",
          userId,
          updates: { [flag]: !currentValue },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [flag]: !currentValue } : u));
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const filtered = users.filter(u =>
    !search || (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 20, width: "100%", maxWidth: 500,
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-soft)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>🛡️ Admin Panel</div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, cursor: "pointer",
            color: "var(--text-muted)", padding: 4
          }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 20px 0" }}>
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: "1px solid var(--border-soft)", background: "var(--bg-soft)",
              color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box"
            }}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>
          {loading && <div style={{ textAlign: "center", padding: 20 }} className="muted">Loading...</div>}
          {error && <div style={{ color: "#ef4444", padding: 12, textAlign: "center" }}>{error}</div>}

          {!loading && !error && filtered.map(user => (
            <div key={user.id} style={{
              background: "var(--bg-soft)", borderRadius: 14, padding: "12px 14px",
              marginBottom: 8, border: "1px solid var(--border-soft)"
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, wordBreak: "break-all" }}>
                {user.email || <span className="muted">No email</span>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: user.is_paid ? "#4ade80" : "var(--bg-btn-light)",
                    color: user.is_paid ? "#052e16" : "var(--text-muted)"
                  }}
                >
                  {user.is_paid ? "✓ Paid" : "Free"}
                </span>
                <button
                  onClick={() => toggleFlag(user.id, "is_demo", user.is_demo)}
                  style={{
                    padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: "none", cursor: "pointer",
                    background: user.is_demo ? "#60a5fa" : "var(--bg-btn-light)",
                    color: user.is_demo ? "#1e3a5f" : "var(--text-muted)"
                  }}
                >
                  {user.is_demo ? "✓ Demo" : "Demo"}
                </button>
                <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
