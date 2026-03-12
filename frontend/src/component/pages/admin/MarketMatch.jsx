import { useState } from "react";

const mockMatches = [
  {
    id: 1, status: "pending",
    buyer: "Kigali Fresh Market", location: "Kigali City",
    description: "Premium quality preferred. Weekly delivery.",
    crop: "Tomatoes", quantity: "500 kg", pricePerKg: 1.20, total: 600,
  },
  {
    id: 2, status: "pending",
    buyer: "Kigali Fresh Market", location: "Kigali City",
    description: "Premium quality preferred. Weekly delivery.",
    crop: "Tomatoes", quantity: "500 kg", pricePerKg: 1.20, total: 600,
  },
  {
    id: 3, status: "approved",
    buyer: "Rwanda Export Hub", location: "Nyarugenge",
    description: "Certified organic only. Bi-weekly schedule.",
    crop: "Maize", quantity: "1200 kg", pricePerKg: 0.45, total: 540,
  },
  {
    id: 4, status: "pending",
    buyer: "AgroConnect Ltd", location: "Gasabo",
    description: "Fresh produce, same-day delivery preferred.",
    crop: "Beans", quantity: "300 kg", pricePerKg: 2.10, total: 630,
  },
  {
    id: 5, status: "pending",
    buyer: "Musanze Agro Co.", location: "Musanze",
    description: "Highland quality. Monthly bulk orders.",
    crop: "Irish Potatoes", quantity: "2000 kg", pricePerKg: 0.35, total: 700,
  },
];

const summaryCards = [
  {
    label: "Total Matches", value: 4,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a3a1a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>,
    iconBg: "#f0f0f0",
  },
  {
    label: "Pending Matches", value: 3,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e6a817" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    iconBg: "#fff8e6",
  },
  {
    label: "Approved Matches", value: 1,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>,
    iconBg: "#edf7ee",
  },
  {
    label: "Total Matches Value", value: "$2800",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    iconBg: "#edf7ee",
  },
];

const statusStyle = {
  pending:  { bg: "#fff8e1", color: "#d4920a" },
  approved: { bg: "#e8f5e9", color: "#2e7d32" },
  declined: { bg: "#fce4ec", color: "#c62828" },
};

export default function AdminMarketMatches() {
  const [matches, setMatches] = useState(mockMatches);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All");

  const handleAccept  = (id) => setMatches(p => p.map(m => m.id === id ? { ...m, status: "approved" } : m));
  const handleDecline = (id) => setMatches(p => p.map(m => m.id === id ? { ...m, status: "declined" } : m));

  const filtered = matches.filter(m => {
    const matchesSearch = m.buyer.toLowerCase().includes(search.toLowerCase()) || m.crop.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || m.status === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mm-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .mm-root { font-family: 'DM Sans', sans-serif; color: #1a1a1a; }

        /* HEADER */
        .mm-header { margin-bottom: 22px; }
        .mm-header h1 { font-size: 21px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; }
        .mm-header p  { font-size: 13px; color: #999; margin-top: 3px; }

        /* SUMMARY */
        .summary-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 14px; margin-bottom: 22px;
        }
        .summary-card {
          background: #fff; border-radius: 16px; padding: 18px 20px 20px;
          border: 1px solid #ececec; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .summary-card-top {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        }
        .summary-label { font-size: 12px; color: #888; font-weight: 500; }
        .summary-icon-wrap {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .summary-value { font-size: 30px; font-weight: 700; color: #1a1a1a; letter-spacing: -1px; }

        /* OUTER WRAPPER */
        .market-list-card {
          background: #fff; border-radius: 16px;
          border: 1px solid #ececec; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .market-list-header {
          padding: 18px 22px 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; border-bottom: 1px solid #f5f5f5;
        }
        .market-list-title h3 { font-size: 14.5px; font-weight: 700; color: #1a1a1a; }
        .market-list-title p  { font-size: 12px; color: #bbb; margin-top: 2px; }
        .market-list-controls { display: flex; align-items: center; gap: 10px; }

        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-wrap svg { position: absolute; left: 10px; color: #bbb; pointer-events: none; }
        .search-input {
          padding: 8px 12px 8px 32px; border-radius: 8px;
          border: 1.5px solid #e8e8e8; font-size: 12.5px; color: #333;
          outline: none; width: 190px; font-family: 'DM Sans', sans-serif;
          background: #fafafa; transition: border-color 0.2s;
        }
        .search-input:focus { border-color: #2e7d32; background: #fff; }
        .search-input::placeholder { color: #bbb; }

        .year-select {
          padding: 8px 32px 8px 12px; border-radius: 8px;
          border: 1.5px solid #e8e8e8; font-size: 12.5px; color: #555;
          outline: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
          background: #fafafa; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
        }
        .view-all-btn {
          padding: 8px 20px; border-radius: 8px;
          border: 1.5px solid #1a3a1a; background: transparent;
          color: #1a3a1a; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .view-all-btn:hover { background: #1a3a1a; color: #fff; }

        /* ── CARDS WRAPPER ── */
        .match-cards-wrapper {
          padding: 16px 18px;
          display: flex; flex-direction: column; gap: 14px;
        }

        /* Each match = its own card */
        .match-card {
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 1px 5px rgba(0,0,0,0.05);
          display: flex; align-items: flex-start; gap: 14px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .match-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.09);
          transform: translateY(-1px);
        }

        /* Logo box */
        .match-logo {
          width: 44px; height: 44px; border-radius: 10px;
          background: #e8f5e9;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
        }

        .match-info { flex: 1; min-width: 0; }

        .match-name-row {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 3px; flex-wrap: wrap;
        }
        .match-name { font-size: 14px; font-weight: 700; color: #1a1a1a; }
        .status-badge {
          padding: 2px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
        }
        .match-location {
          font-size: 11.5px; color: #aaa;
          display: flex; align-items: center; gap: 3px; margin-bottom: 4px;
        }
        .match-description { font-size: 12px; color: #bbb; margin-bottom: 12px; }

        .match-crop-row { display: flex; gap: 28px; flex-wrap: wrap; }
        .crop-field label {
          display: block; font-size: 11px; color: #aaa; font-weight: 500;
          margin-bottom: 2px; letter-spacing: 0.2px;
        }
        .crop-field span { font-size: 13px; font-weight: 700; color: #2e7d32; }

        /* ACTIONS */
        .match-actions {
          display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
        }
        .btn-accept {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 9px 22px; border-radius: 8px; border: none;
          background: #1a3a1a; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif;
          white-space: nowrap; min-width: 108px;
        }
        .btn-accept:hover:not(:disabled) { background: #2e7d32; }
        .btn-accept:disabled { background: #a5d6a7; cursor: default; }

        .btn-decline {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 9px 22px; border-radius: 8px;
          border: 1.5px solid #e0e0e0; background: #fff;
          color: #666; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif;
          white-space: nowrap; min-width: 108px;
        }
        .btn-decline:hover:not(:disabled) { border-color: #ef5350; color: #ef5350; }
        .btn-decline:disabled { opacity: 0.4; cursor: default; }

        .empty-state { text-align: center; padding: 48px; color: #bbb; font-size: 14px; }

        @media (max-width: 900px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) {
          .summary-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .match-card { flex-wrap: wrap; }
          .match-actions { flex-direction: row; width: 100%; }
          .btn-accept, .btn-decline { flex: 1; }
          .match-crop-row { gap: 14px; }
        }
      `}</style>

      <div className="mm-header">
        <h1>Market Matches</h1>
        <p>AI-powered buyer recommendations for your produce</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-grid">
        {summaryCards.map((card) => (
          <div className="summary-card" key={card.label}>
            <div className="summary-card-top">
              <span className="summary-label">{card.label}</span>
              <div className="summary-icon-wrap" style={{ background: card.iconBg }}>{card.icon}</div>
            </div>
            <div className="summary-value">{card.value}</div>
          </div>
        ))}
      </div>

      {/* MARKET LIST */}
      <div className="market-list-card">
        <div className="market-list-header">
          <div className="market-list-title">
            <h3>Market List</h3>
            <p>All market list</p>
          </div>
          <div className="market-list-controls">
            <div className="search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="search-input" placeholder="Search anything..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="year-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="All">This Year</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
            <button className="view-all-btn">View all</button>
          </div>
        </div>

        <div className="match-cards-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">No matches found.</div>
          ) : filtered.map((match) => {
            const st = statusStyle[match.status] || statusStyle.pending;
            const isPending = match.status === "pending";
            return (
              <div className="match-card" key={match.id}>
                {/* Logo */}
                <div className="match-logo">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.8">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>

                {/* Info */}
                <div className="match-info">
                  <div className="match-name-row">
                    <span className="match-name">{match.buyer}</span>
                    <span className="status-badge" style={{ background: st.bg, color: st.color }}>{match.status}</span>
                  </div>
                  <div className="match-location">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {match.location}
                  </div>
                  <div className="match-description">{match.description}</div>
                  <div className="match-crop-row">
                    {[
                      { label: "Crop",     val: match.crop },
                      { label: "Quantity", val: match.quantity },
                      { label: "Price/kg", val: `$${match.pricePerKg.toFixed(2)}` },
                      { label: "Total",    val: `$${match.total}` },
                    ].map(f => (
                      <div className="crop-field" key={f.label}>
                        <label>{f.label}</label>
                        <span>{f.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="match-actions">
                  <button className="btn-accept" onClick={() => handleAccept(match.id)} disabled={!isPending}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {match.status === "approved" ? "Accepted" : "Accept"}
                  </button>
                  <button className="btn-decline" onClick={() => handleDecline(match.id)} disabled={!isPending}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    {match.status === "declined" ? "Declined" : "Decline"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}